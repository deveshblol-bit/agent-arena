const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WagerEscrow", function () {
  let usdc, escrow, mathVerifier;
  let owner, creator, challenger;
  const WAGER = 100n * 10n ** 6n; // 100 USDC
  const FEE_BPS = 250n; // 2.5%

  beforeEach(async function () {
    [owner, creator, challenger] = await ethers.getSigners();

    // Deploy MockUSDC
    const USDC = await ethers.getContractFactory("MockUSDC");
    usdc = await USDC.deploy();

    // Deploy MathVerifier
    const MV = await ethers.getContractFactory("MathVerifier");
    mathVerifier = await MV.deploy();

    // Deploy WagerEscrow
    const WE = await ethers.getContractFactory("WagerEscrow");
    escrow = await WE.deploy(await usdc.getAddress(), FEE_BPS);

    // Register verifier (ProblemType.MathFactorization = 0)
    await escrow.setVerifier(0, await mathVerifier.getAddress());

    // Fund creator and challenger
    await usdc.mint(creator.address, WAGER * 10n);
    await usdc.mint(challenger.address, WAGER * 10n);

    // Approve escrow
    await usdc.connect(creator).approve(await escrow.getAddress(), WAGER * 10n);
    await usdc.connect(challenger).approve(await escrow.getAddress(), WAGER * 10n);
  });

  describe("createChallenge", function () {
    it("should create a challenge and escrow funds", async function () {
      // Problem: factor N = 15 (answer: 3 * 5)
      const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [15]);
      const tx = await escrow.connect(creator).createChallenge(WAGER, 0, problemData, 3600);
      await expect(tx).to.emit(escrow, "ChallengeCreated").withArgs(1, creator.address, WAGER, 0);

      const c = await escrow.getChallenge(1);
      expect(c.creator).to.equal(creator.address);
      expect(c.status).to.equal(0); // Open
      expect(c.wagerAmount).to.equal(WAGER);
    });

    it("should revert with zero amount", async function () {
      const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [15]);
      await expect(escrow.connect(creator).createChallenge(0, 0, problemData, 3600))
        .to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });
  });

  describe("acceptChallenge", function () {
    beforeEach(async function () {
      const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [15]);
      await escrow.connect(creator).createChallenge(WAGER, 0, problemData, 3600);
    });

    it("should accept and escrow challenger funds", async function () {
      const tx = await escrow.connect(challenger).acceptChallenge(1);
      await expect(tx).to.emit(escrow, "ChallengeAccepted").withArgs(1, challenger.address);

      const c = await escrow.getChallenge(1);
      expect(c.status).to.equal(1); // Active
      expect(c.challenger).to.equal(challenger.address);
    });

    it("should revert if creator tries to accept own", async function () {
      await expect(escrow.connect(creator).acceptChallenge(1))
        .to.be.revertedWithCustomError(escrow, "CannotAcceptOwn");
    });
  });

  describe("submitSolution", function () {
    beforeEach(async function () {
      const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [15]);
      await escrow.connect(creator).createChallenge(WAGER, 0, problemData, 3600);
      await escrow.connect(challenger).acceptChallenge(1);
    });

    it("should pay winner on correct solution", async function () {
      const solution = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [3, 5]);
      const balBefore = await usdc.balanceOf(challenger.address);

      const tx = await escrow.connect(challenger).submitSolution(1, solution);
      await expect(tx).to.emit(escrow, "ChallengeSolved");

      const c = await escrow.getChallenge(1);
      expect(c.status).to.equal(2); // Resolved
      expect(c.winner).to.equal(challenger.address);

      // Payout = 200 USDC - 2.5% fee = 195 USDC
      const pot = WAGER * 2n;
      const fee = (pot * FEE_BPS) / 10000n;
      const expectedPayout = pot - fee;

      const balAfter = await usdc.balanceOf(challenger.address);
      expect(balAfter - balBefore).to.equal(expectedPayout);
    });

    it("should revert on wrong solution", async function () {
      const solution = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [2, 5]);
      await expect(escrow.connect(challenger).submitSolution(1, solution))
        .to.be.revertedWithCustomError(escrow, "InvalidSolution");
    });

    it("should revert trivial factorization (1 * N)", async function () {
      const solution = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [1, 15]);
      await expect(escrow.connect(challenger).submitSolution(1, solution))
        .to.be.revertedWithCustomError(escrow, "InvalidSolution");
    });
  });

  describe("claimTimeout", function () {
    beforeEach(async function () {
      const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [15]);
      await escrow.connect(creator).createChallenge(WAGER, 0, problemData, 60); // 60s limit
      await escrow.connect(challenger).acceptChallenge(1);
    });

    it("should refund both after timeout", async function () {
      // Advance time past limit
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");

      const creatorBal = await usdc.balanceOf(creator.address);
      const challBal = await usdc.balanceOf(challenger.address);

      await escrow.claimTimeout(1);

      expect(await usdc.balanceOf(creator.address)).to.equal(creatorBal + WAGER);
      expect(await usdc.balanceOf(challenger.address)).to.equal(challBal + WAGER);
    });
  });

  describe("cancelChallenge", function () {
    it("should refund creator on cancel", async function () {
      const problemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [15]);
      await escrow.connect(creator).createChallenge(WAGER, 0, problemData, 3600);

      const balBefore = await usdc.balanceOf(creator.address);
      await escrow.connect(creator).cancelChallenge(1);
      expect(await usdc.balanceOf(creator.address)).to.equal(balBefore + WAGER);
    });
  });
});
