/**
 * Agent Arena API
 * Challenge board for browsing and creating wagers
 */

const express = require("express");
const cors = require("cors");
const ethers = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const CONFIG = {
  rpcUrl: process.env.RPC_URL || "https://sepolia.base.org",
  escrowAddress: process.env.ESCROW_ADDRESS || "0x5AE674C0CFBD27514716E2b27C3E22339Cb80bDF",
};

// Initialize provider
const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);

// Contract interface
const escrowInterface = new ethers.Interface([
  "function challenges(uint256) view returns (uint256 id, address creator, address challenger, uint256 wagerAmount, uint8 problemType, bytes32 problemHash, bytes problemData, uint256 timeLimit, uint256 acceptedAt, uint8 status, address winner)",
  "function challengeCount() view returns (uint256)",
]);

/**
 * GET / - API info
 */
app.get("/", (req, res) => {
  res.json({
    name: "Agent Arena API",
    version: "1.0.0",
    endpoints: {
      "GET /challenges": "List all challenges",
      "GET /challenges/:id": "Get challenge details",
      "GET /health": "Health check",
    },
  });
});

/**
 * GET /health - Health check
 */
app.get("/health", async (req, res) => {
  try {
    const blockNumber = await provider.getBlockNumber();
    res.json({
      status: "ok",
      blockNumber,
      network: "Base Sepolia",
      escrow: CONFIG.escrowAddress,
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

/**
 * GET /challenges - List all challenges
 * Query params:
 *   - status: filter by status (0=Open, 1=Active, 2=Resolved, 3=Expired, 4=Cancelled)
 *   - problemType: filter by problem type (0=MathFactorization, 1=MathEquation, 2=CryptoPuzzle)
 *   - minAmount: minimum wager amount (USDC)
 *   - maxAmount: maximum wager amount (USDC)
 */
app.get("/challenges", async (req, res) => {
  try {
    const { status, problemType, minAmount, maxAmount } = req.query;

    // Get total count
    const countData = escrowInterface.encodeFunctionData("challengeCount");
    const countResult = await provider.call({
      to: CONFIG.escrowAddress,
      data: countData,
    });
    const count = escrowInterface.decodeFunctionResult("challengeCount", countResult)[0];

    // Fetch all challenges
    const challenges = [];
    for (let i = 1; i <= count; i++) {
      const challenge = await getChallengeDetails(i);
      
      // Apply filters
      if (status !== undefined && challenge.status !== parseInt(status)) continue;
      if (problemType !== undefined && challenge.problemType !== parseInt(problemType)) continue;
      if (minAmount !== undefined && parseFloat(challenge.wagerAmount) < parseFloat(minAmount)) continue;
      if (maxAmount !== undefined && parseFloat(challenge.wagerAmount) > parseFloat(maxAmount)) continue;

      challenges.push(challenge);
    }

    res.json({
      total: challenges.length,
      challenges,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /challenges/:id - Get challenge details
 */
app.get("/challenges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: "Invalid challenge ID" });
    }

    const challenge = await getChallengeDetails(id);
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Helper: Get challenge details from contract
 */
async function getChallengeDetails(id) {
  const data = escrowInterface.encodeFunctionData("challenges", [id]);
  const result = await provider.call({
    to: CONFIG.escrowAddress,
    data,
  });
  
  const decoded = escrowInterface.decodeFunctionResult("challenges", result);
  
  // Convert all BigInts to strings/numbers
  const problemType = Number(decoded[4]);
  const status = Number(decoded[9]);
  
  return {
    id: decoded[0].toString(),
    creator: decoded[1],
    challenger: decoded[2],
    wagerAmount: ethers.formatUnits(decoded[3], 6),
    problemType,
    problemTypeName: ["MathFactorization", "MathEquation", "CryptoPuzzle"][problemType],
    problemHash: decoded[5],
    problemData: ethers.hexlify(decoded[6]),
    timeLimit: Number(decoded[7]),
    acceptedAt: Number(decoded[8]),
    status,
    statusName: ["Open", "Active", "Resolved", "Expired", "Cancelled"][status],
    winner: decoded[10],
  };
}

// Start server (for local dev) or export for Vercel
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Agent Arena API running on http://localhost:${PORT}`);
    console.log(`📍 Escrow: ${CONFIG.escrowAddress}`);
    console.log(`🔗 RPC: ${CONFIG.rpcUrl}`);
  });
}

module.exports = app;
