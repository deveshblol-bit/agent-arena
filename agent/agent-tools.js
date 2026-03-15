/**
 * Agent Tools SDK for Agent Arena
 * 
 * Provides high-level tool functions that AI agents can call:
 *   - wager_create(problemType, difficulty, amount, timeLimit)
 *   - wager_browse(filters)
 *   - wager_accept(challengeId)
 *   - wager_solve(challengeId, solution)
 *   - wager_status(challengeId)
 *   - agent_balance()
 */

const ethers = require("ethers");
const WalletManager = require("./wallet-manager");
const ChallengeSigner = require("./challenge-signer");
const ProblemGenerator = require("./problem-generator");

const CONTRACTS = {
  escrow: "0x5AE674C0CFBD27514716E2b27C3E22339Cb80bDF",
  usdc: "0x638E23b938c8Cdc920eDBDa7021C06e33Ce40E3b",
  verifiers: {
    MathFactorization: "0x336c5473ca38F67383aF06FA076E900594eDfC6B",
    MathEquation: "0x57436d7C195b7a1aF2eaC0D7A0DF288B96D7aC26",
    CryptoPuzzle: "0x08F17313bD4Ef79648153e24e15BE37C46082C23",
  },
};

const PROBLEM_TYPE_MAP = {
  MathFactorization: 0,
  MathEquation: 1,
  CryptoPuzzle: 2,
};

const STATUS_NAMES = ["Open", "Active", "Resolved", "Expired", "Cancelled"];
const PROBLEM_TYPE_NAMES = ["MathFactorization", "MathEquation", "CryptoPuzzle"];

class AgentTools {
  constructor(walletPath, rpcUrl = "https://sepolia.base.org") {
    this.rpcUrl = rpcUrl;
    this.walletPath = walletPath;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    const provider = new ethers.JsonRpcProvider(this.rpcUrl);
    const fs = require("fs");
    const path = require("path");
    const walletData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", this.walletPath), "utf8"));
    this.wallet = new ethers.Wallet(walletData.privateKey, provider);
    this.signer = new ChallengeSigner(this.wallet, CONTRACTS.escrow, CONTRACTS.usdc);
    this.address = this.wallet.address;
    this.initialized = true;
  }

  /**
   * wager_create — Create a new challenge with auto-generated problem
   * @param {string} problemType - "MathFactorization" | "MathEquation" | "CryptoPuzzle"
   * @param {string} difficulty - "easy" | "medium" | "hard"
   * @param {number} amount - USDC amount to wager
   * @param {number} timeLimit - Time limit in seconds (default 3600)
   * @returns {object} Challenge details including ID, problem, and secret solution
   */
  async wager_create(problemType, difficulty, amount, timeLimit = 3600) {
    await this.init();

    // Generate problem
    let problem;
    switch (problemType) {
      case "MathFactorization":
        problem = ProblemGenerator.generateFactorization(difficulty);
        break;
      case "MathEquation":
        problem = ProblemGenerator.generateEquation(difficulty);
        break;
      case "CryptoPuzzle":
        problem = ProblemGenerator.generateCryptoPuzzle(difficulty);
        break;
      default:
        throw new Error(`Unknown problem type: ${problemType}. Use: MathFactorization, MathEquation, CryptoPuzzle`);
    }

    // Encode problem data for on-chain
    const problemData = this._encodeProblemData(problemType, problem);
    const typeEnum = PROBLEM_TYPE_MAP[problemType];

    // Create on-chain
    const result = await this.signer.createChallenge(amount, typeEnum, problemData, timeLimit);

    return {
      success: true,
      challengeId: result.challengeId.toString(),
      txHash: result.txHash,
      problemType,
      difficulty,
      description: problem.description,
      wagerAmount: `${amount} USDC`,
      timeLimit: `${timeLimit}s`,
      // Secret — only the creator knows this
      _secret_solution: problem.solution,
    };
  }

  /**
   * wager_browse — Browse open challenges with optional filters
   * @param {object} filters - { status, problemType, minAmount, maxAmount }
   * @returns {object[]} Array of challenge summaries
   */
  async wager_browse(filters = {}) {
    await this.init();

    const challenges = await this.signer.listChallenges();
    
    return challenges
      .filter(c => {
        if (filters.status !== undefined) {
          const statusName = STATUS_NAMES[c.status] || `Unknown(${c.status})`;
          if (statusName !== filters.status) return false;
        }
        if (filters.problemType !== undefined && c.problemType !== filters.problemType) return false;
        if (filters.minAmount !== undefined && parseFloat(c.wagerAmount) < filters.minAmount) return false;
        if (filters.maxAmount !== undefined && parseFloat(c.wagerAmount) > filters.maxAmount) return false;
        return true;
      })
      .map(c => ({
        id: c.id,
        creator: c.creator,
        challenger: c.challenger,
        wagerAmount: `${c.wagerAmount} USDC`,
        problemType: PROBLEM_TYPE_NAMES[c.problemType] || `Unknown(${c.problemType})`,
        status: STATUS_NAMES[c.status] || `Unknown(${c.status})`,
        timeLimit: `${c.timeLimit}s`,
        problemData: c.problemData,
      }));
  }

  /**
   * wager_accept — Accept an open challenge (deposits matching USDC)
   * @param {number} challengeId
   * @returns {object} Acceptance result
   */
  async wager_accept(challengeId) {
    await this.init();

    const challenge = await this.signer.getChallenge(challengeId);
    if (Number(challenge.status) !== 0) {
      throw new Error(`Challenge #${challengeId} is not open (status: ${STATUS_NAMES[challenge.status]})`);
    }
    if (challenge.creator.toLowerCase() === this.address.toLowerCase()) {
      throw new Error("Cannot accept your own challenge");
    }

    const result = await this.signer.acceptChallenge(challengeId);

    return {
      success: true,
      challengeId: challengeId.toString(),
      txHash: result.txHash,
      wagerAmount: `${challenge.wagerAmount} USDC`,
      totalPot: `${parseFloat(challenge.wagerAmount) * 2} USDC`,
      message: `Accepted challenge #${challengeId}. Race is on! Solve it first to win.`,
    };
  }

  /**
   * wager_solve — Submit a solution to an active challenge
   * @param {number} challengeId
   * @param {*} solution - The solution (type depends on problem)
   * @returns {object} Solution result
   */
  async wager_solve(challengeId, solution) {
    await this.init();

    const challenge = await this.signer.getChallenge(challengeId);
    if (Number(challenge.status) !== 1) {
      throw new Error(`Challenge #${challengeId} is not active (status: ${STATUS_NAMES[challenge.status]})`);
    }

    // Encode solution based on problem type
    const encodedSolution = this._encodeSolution(Number(challenge.problemType), solution);

    const result = await this.signer.submitSolution(challengeId, encodedSolution);

    return {
      success: true,
      challengeId: challengeId.toString(),
      txHash: result.txHash,
      message: `Solution submitted for challenge #${challengeId}. If correct, winnings will be paid automatically!`,
    };
  }

  /**
   * wager_status — Check the status of a challenge
   * @param {number} challengeId
   * @returns {object} Challenge details
   */
  async wager_status(challengeId) {
    await this.init();

    const c = await this.signer.getChallenge(challengeId);
    return {
      id: c.id,
      creator: c.creator,
      challenger: c.challenger,
      wagerAmount: `${c.wagerAmount} USDC`,
      problemType: PROBLEM_TYPE_NAMES[c.problemType] || `Unknown(${c.problemType})`,
      status: STATUS_NAMES[c.status] || `Unknown(${c.status})`,
      winner: c.winner,
      timeLimit: `${c.timeLimit}s`,
      acceptedAt: c.acceptedAt === "0" ? "Not accepted" : new Date(Number(c.acceptedAt) * 1000).toISOString(),
    };
  }

  /**
   * agent_balance — Check wallet balances
   * @returns {object} ETH and USDC balances
   */
  async agent_balance() {
    await this.init();

    const ethBalance = await this.wallet.provider.getBalance(this.address);
    const usdcAbi = ["function balanceOf(address) view returns (uint256)"];
    const usdc = new ethers.Contract(CONTRACTS.usdc, usdcAbi, this.wallet.provider);
    const usdcBalance = await usdc.balanceOf(this.address);

    return {
      address: this.address,
      eth: ethers.formatEther(ethBalance),
      usdc: ethers.formatUnits(usdcBalance, 6),
      network: "Base Sepolia",
    };
  }

  // ── Encoding Helpers ──────────────────────────────────────────────

  _encodeProblemData(problemType, problem) {
    const coder = ethers.AbiCoder.defaultAbiCoder();
    
    switch (problemType) {
      case "MathFactorization":
        return coder.encode(["uint256"], [problem.problem]);
      case "MathEquation":
        return coder.encode(["int256", "int256", "int256"], [problem.problem.a, problem.problem.b, problem.problem.c]);
      case "CryptoPuzzle":
        return coder.encode(["bytes32"], [problem.problem]);
      default:
        throw new Error(`Cannot encode problem type: ${problemType}`);
    }
  }

  _encodeSolution(problemType, solution) {
    const coder = ethers.AbiCoder.defaultAbiCoder();
    
    switch (problemType) {
      case 0: // MathFactorization
        if (Array.isArray(solution)) {
          return coder.encode(["uint256", "uint256"], solution);
        }
        // If comma-separated string
        const [a, b] = solution.toString().split(",").map(Number);
        return coder.encode(["uint256", "uint256"], [a, b]);
      
      case 1: // MathEquation
        return coder.encode(["int256"], [parseInt(solution)]);
      
      case 2: // CryptoPuzzle
        return coder.encode(["string"], [solution]);
      
      default:
        throw new Error(`Cannot encode solution for type: ${problemType}`);
    }
  }
}

module.exports = AgentTools;
