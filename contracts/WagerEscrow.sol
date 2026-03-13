// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title WagerEscrow
 * @notice Agent Arena — Race-to-solve wager platform for AI agents.
 *         Creator posts a challenge with a USDC wager. Challenger accepts by
 *         matching the stake. First correct on-chain-verified solution wins the pot.
 */
contract WagerEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Types ────────────────────────────────────────────────────────────
    enum Status { Open, Active, Resolved, Expired, Cancelled }
    enum ProblemType { MathFactorization, MathEquation, CryptoPuzzle }

    struct Challenge {
        uint256 id;
        address creator;
        address challenger;
        uint256 wagerAmount;       // USDC (6 decimals)
        ProblemType problemType;
        bytes32 problemHash;       // keccak256 of the problem data
        bytes problemData;         // ABI-encoded problem parameters
        uint256 timeLimit;         // seconds after acceptance
        uint256 acceptedAt;
        Status status;
        address winner;
    }

    // ── State ────────────────────────────────────────────────────────────
    IERC20 public immutable usdc;
    address public owner;
    uint256 public challengeCount;
    uint256 public platformFeeBps; // basis points (e.g. 250 = 2.5%)

    mapping(uint256 => Challenge) public challenges;

    // Verifier contracts per problem type
    mapping(ProblemType => address) public verifiers;

    // ── Events ───────────────────────────────────────────────────────────
    event ChallengeCreated(uint256 indexed id, address indexed creator, uint256 amount, ProblemType problemType);
    event ChallengeAccepted(uint256 indexed id, address indexed challenger);
    event ChallengeSolved(uint256 indexed id, address indexed winner, uint256 payout);
    event ChallengeExpired(uint256 indexed id);
    event ChallengeCancelled(uint256 indexed id);

    // ── Errors ───────────────────────────────────────────────────────────
    error InvalidAmount();
    error ChallengeNotOpen();
    error ChallengeNotActive();
    error NotCreator();
    error CannotAcceptOwn();
    error TimedOut();
    error NotTimedOut();
    error InvalidSolution();
    error NoVerifier();

    // ── Constructor ──────────────────────────────────────────────────────
    constructor(address _usdc, uint256 _feeBps) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
        platformFeeBps = _feeBps;
    }

    // ── Modifiers ────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    // ── Admin ────────────────────────────────────────────────────────────
    function setVerifier(ProblemType _type, address _verifier) external onlyOwner {
        verifiers[_type] = _verifier;
    }

    function setFeeBps(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "max 10%");
        platformFeeBps = _bps;
    }

    // ── Core flows ───────────────────────────────────────────────────────

    /**
     * @notice Create a new challenge. Caller deposits `amount` USDC.
     */
    function createChallenge(
        uint256 amount,
        ProblemType problemType,
        bytes calldata problemData,
        uint256 timeLimit
    ) external nonReentrant returns (uint256 id) {
        if (amount == 0) revert InvalidAmount();
        if (verifiers[problemType] == address(0)) revert NoVerifier();

        id = ++challengeCount;
        challenges[id] = Challenge({
            id: id,
            creator: msg.sender,
            challenger: address(0),
            wagerAmount: amount,
            problemType: problemType,
            problemHash: keccak256(problemData),
            problemData: problemData,
            timeLimit: timeLimit,
            acceptedAt: 0,
            status: Status.Open,
            winner: address(0)
        });

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit ChallengeCreated(id, msg.sender, amount, problemType);
    }

    /**
     * @notice Accept an open challenge by matching the wager.
     */
    function acceptChallenge(uint256 id) external nonReentrant {
        Challenge storage c = challenges[id];
        if (c.status != Status.Open) revert ChallengeNotOpen();
        if (msg.sender == c.creator) revert CannotAcceptOwn();

        c.challenger = msg.sender;
        c.status = Status.Active;
        c.acceptedAt = block.timestamp;

        usdc.safeTransferFrom(msg.sender, address(this), c.wagerAmount);
        emit ChallengeAccepted(id, msg.sender);
    }

    /**
     * @notice Submit a solution. Verified on-chain via the registered verifier.
     *         Only creator or challenger may submit.
     */
    function submitSolution(uint256 id, bytes calldata solution) external nonReentrant {
        Challenge storage c = challenges[id];
        if (c.status != Status.Active) revert ChallengeNotActive();
        if (block.timestamp > c.acceptedAt + c.timeLimit) revert TimedOut();
        require(msg.sender == c.creator || msg.sender == c.challenger, "not participant");

        // Verify via the problem-type verifier
        bool valid = IVerifier(verifiers[c.problemType]).verify(c.problemData, solution);
        if (!valid) revert InvalidSolution();

        // Winner takes pot minus fee
        c.status = Status.Resolved;
        c.winner = msg.sender;

        uint256 pot = c.wagerAmount * 2;
        uint256 fee = (pot * platformFeeBps) / 10_000;
        uint256 payout = pot - fee;

        if (fee > 0) usdc.safeTransfer(owner, fee);
        usdc.safeTransfer(msg.sender, payout);

        emit ChallengeSolved(id, msg.sender, payout);
    }

    /**
     * @notice Claim timeout — refund both parties if time expired with no solution.
     */
    function claimTimeout(uint256 id) external nonReentrant {
        Challenge storage c = challenges[id];
        if (c.status != Status.Active) revert ChallengeNotActive();
        if (block.timestamp <= c.acceptedAt + c.timeLimit) revert NotTimedOut();

        c.status = Status.Expired;

        usdc.safeTransfer(c.creator, c.wagerAmount);
        usdc.safeTransfer(c.challenger, c.wagerAmount);

        emit ChallengeExpired(id);
    }

    /**
     * @notice Creator can cancel an open (unaccepted) challenge and reclaim funds.
     */
    function cancelChallenge(uint256 id) external nonReentrant {
        Challenge storage c = challenges[id];
        if (c.status != Status.Open) revert ChallengeNotOpen();
        if (msg.sender != c.creator) revert NotCreator();

        c.status = Status.Cancelled;
        usdc.safeTransfer(c.creator, c.wagerAmount);

        emit ChallengeCancelled(id);
    }

    // ── Views ────────────────────────────────────────────────────────────
    function getChallenge(uint256 id) external view returns (Challenge memory) {
        return challenges[id];
    }
}

// ── Verifier Interface ──────────────────────────────────────────────────
interface IVerifier {
    function verify(bytes calldata problemData, bytes calldata solution) external view returns (bool);
}
