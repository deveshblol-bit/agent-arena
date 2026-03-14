/**
 * Challenge Transaction Signer
 * Auto-signs challenge creation, acceptance, and solution submission
 */

const ethers = require("ethers");

class ChallengeSigner {
  constructor(wallet, escrowAddress, usdcAddress) {
    this.wallet = wallet;
    this.escrowAddress = escrowAddress;
    this.usdcAddress = usdcAddress;

    // Contract ABIs (minimal) - Status enum: Open=0, Active=1, Resolved=2, Expired=3, Cancelled=4
    this.escrowAbi = [
      "function createChallenge(uint256 amount, uint8 problemType, bytes calldata problemData, uint256 timeLimit) external returns (uint256)",
      "function acceptChallenge(uint256 challengeId) external",
      "function submitSolution(uint256 challengeId, bytes calldata solution) external",
      "function cancelChallenge(uint256 challengeId) external",
      "function challengeCount() view returns (uint256)",
    ];
    
    // Minimal interface for reading challenges
    this.challengeInterface = new ethers.Interface([
      "function challenges(uint256) view returns (uint256 id, address creator, address challenger, uint256 wagerAmount, uint8 problemType, bytes32 problemHash, bytes problemData, uint256 timeLimit, uint256 acceptedAt, uint8 status, address winner)",
    ]);

    this.usdcAbi = [
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function balanceOf(address account) view returns (uint256)",
      "function allowance(address owner, address spender) view returns (uint256)",
    ];

    this.escrow = new ethers.Contract(escrowAddress, this.escrowAbi, wallet);
    this.usdc = new ethers.Contract(usdcAddress, this.usdcAbi, wallet);
  }

  /**
   * Create a challenge (auto-approve USDC if needed)
   */
  async createChallenge(amountUsdc, problemType, problemData, timeLimitSeconds = 3600) {
    const amount = ethers.parseUnits(amountUsdc.toString(), 6);

    // Check if approval needed
    const allowance = await this.usdc.allowance(this.wallet.address, this.escrowAddress);
    if (allowance < amount) {
      console.log(`Approving ${amountUsdc} USDC...`);
      const approveTx = await this.usdc.approve(this.escrowAddress, ethers.parseUnits("1000000", 6)); // Approve large amount
      await approveTx.wait(2);
      console.log(`✅ Approved`);
    }

    console.log(`Creating challenge: ${amountUsdc} USDC, type ${problemType}...`);
    const tx = await this.escrow.createChallenge(
      amount,
      problemType,
      problemData,
      timeLimitSeconds
    );
    const receipt = await tx.wait(2);
    
    const challengeCount = await this.escrow.challengeCount();
    console.log(`✅ Challenge #${challengeCount} created`);

    return {
      challengeId: challengeCount,
      txHash: receipt.hash,
    };
  }

  /**
   * Accept a challenge (auto-approve USDC if needed)
   */
  async acceptChallenge(challengeId) {
    const challenge = await this.escrow.challenges(challengeId);
    
    if (challenge.status !== 0) {
      throw new Error(`Challenge #${challengeId} is not open (status: ${challenge.status})`);
    }

    const amount = challenge.wagerAmount;

    // Check if approval needed
    const allowance = await this.usdc.allowance(this.wallet.address, this.escrowAddress);
    if (allowance < amount) {
      console.log(`Approving ${ethers.formatUnits(amount, 6)} USDC...`);
      const approveTx = await this.usdc.approve(this.escrowAddress, ethers.parseUnits("1000000", 6));
      await approveTx.wait(2);
      console.log(`✅ Approved`);
    }

    console.log(`Accepting challenge #${challengeId}...`);
    const tx = await this.escrow.acceptChallenge(challengeId);
    const receipt = await tx.wait(2);
    console.log(`✅ Challenge accepted`);

    return {
      txHash: receipt.hash,
    };
  }

  /**
   * Submit solution to a challenge
   */
  async submitSolution(challengeId, solution) {
    console.log(`Submitting solution to challenge #${challengeId}...`);
    const tx = await this.escrow.submitSolution(challengeId, solution);
    const receipt = await tx.wait(2);
    console.log(`✅ Solution submitted`);

    return {
      txHash: receipt.hash,
    };
  }

  /**
   * Cancel a challenge (before acceptance)
   */
  async cancelChallenge(challengeId) {
    console.log(`Cancelling challenge #${challengeId}...`);
    const tx = await this.escrow.cancelChallenge(challengeId);
    const receipt = await tx.wait(2);
    console.log(`✅ Challenge cancelled`);

    return {
      txHash: receipt.hash,
    };
  }

  /**
   * Get challenge details
   */
  async getChallenge(challengeId) {
    // Call directly via provider to avoid ABI parsing issues
    const data = this.challengeInterface.encodeFunctionData("challenges", [challengeId]);
    const result = await this.wallet.provider.call({
      to: this.escrowAddress,
      data,
    });
    
    const decoded = this.challengeInterface.decodeFunctionResult("challenges", result);
    
    return {
      id: decoded[0].toString(),
      creator: decoded[1],
      challenger: decoded[2],
      wagerAmount: ethers.formatUnits(decoded[3], 6),
      problemType: decoded[4],
      problemData: decoded[6],
      timeLimit: decoded[7].toString(),
      acceptedAt: decoded[8].toString(),
      status: decoded[9], // 0=Open, 1=Active, 2=Resolved, 3=Expired, 4=Cancelled
      winner: decoded[10],
    };
  }

  /**
   * List all challenges
   */
  async listChallenges() {
    const count = await this.escrow.challengeCount();
    const challenges = [];

    for (let i = 1; i <= count; i++) {
      const challenge = await this.getChallenge(i);
      challenges.push(challenge);
    }

    return challenges;
  }
}

module.exports = ChallengeSigner;
