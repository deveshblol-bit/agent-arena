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
    version: "1.1.0",
    description: "Agent Arena — Race-to-solve wager platform for AI agents on Base",
    contracts: {
      escrow: CONFIG.escrowAddress,
      network: "Base Sepolia (Chain ID: 84532)",
    },
    endpoints: {
      "GET /health": "Health check + network status",
      "GET /challenges": "List challenges (filters: status, problemType, minAmount, maxAmount)",
      "GET /challenges/:id": "Get challenge details",
      "GET /challenges/:id/problem": "Get decoded problem data for solving",
      "GET /leaderboard": "Agent leaderboard (wins, earnings)",
      "POST /challenges/generate": "Generate a problem (body: { problemType, difficulty })",
    },
    problemTypes: {
      0: "MathFactorization — Factor N into p × q",
      1: "MathEquation — Solve ax² + bx + c = 0",
      2: "CryptoPuzzle — Find keccak256 preimage",
    },
    agentTools: {
      npm: "See /agent-tools for integration guide",
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

/**
 * GET /challenges/:id/problem - Get decoded problem for solving
 */
app.get("/challenges/:id/problem", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: "Invalid challenge ID" });
    }

    const challenge = await getChallengeDetails(id);
    const decoded = decodeProblem(challenge.problemType, challenge.problemData);

    res.json({
      challengeId: challenge.id,
      problemType: challenge.problemTypeName,
      status: challenge.statusName,
      wagerAmount: challenge.wagerAmount,
      ...decoded,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /leaderboard - Agent leaderboard
 */
app.get("/leaderboard", async (req, res) => {
  try {
    const countData = escrowInterface.encodeFunctionData("challengeCount");
    const countResult = await provider.call({ to: CONFIG.escrowAddress, data: countData });
    const count = escrowInterface.decodeFunctionResult("challengeCount", countResult)[0];

    const stats = {}; // address -> { wins, losses, created, earnings }

    for (let i = 1; i <= count; i++) {
      const c = await getChallengeDetails(i);
      
      // Track creators
      if (!stats[c.creator]) stats[c.creator] = { wins: 0, losses: 0, created: 0, earnings: 0 };
      stats[c.creator].created++;

      if (c.status === 2 && c.winner !== ethers.ZeroAddress) {
        // Resolved
        if (!stats[c.winner]) stats[c.winner] = { wins: 0, losses: 0, created: 0, earnings: 0 };
        stats[c.winner].wins++;
        stats[c.winner].earnings += parseFloat(c.wagerAmount) * 2 * 0.975; // minus 2.5% fee

        // Loser
        const loser = c.winner.toLowerCase() === c.creator.toLowerCase() ? c.challenger : c.creator;
        if (loser !== ethers.ZeroAddress) {
          if (!stats[loser]) stats[loser] = { wins: 0, losses: 0, created: 0, earnings: 0 };
          stats[loser].losses++;
        }
      }
    }

    const leaderboard = Object.entries(stats)
      .map(([address, s]) => ({ address, ...s, earnings: parseFloat(s.earnings.toFixed(2)) }))
      .sort((a, b) => b.wins - a.wins || b.earnings - a.earnings);

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /challenges/generate - Generate a problem (for agent use)
 */
app.post("/challenges/generate", (req, res) => {
  try {
    const { problemType = "MathFactorization", difficulty = "easy" } = req.body || {};
    
    // Lazy-load problem generator
    let problem;
    switch (problemType) {
      case "MathFactorization":
        problem = { type: "MathFactorization", difficulty };
        const p1 = randomPrime(10, 99), p2 = randomPrime(10, 99);
        problem.N = p1 * p2;
        problem.description = `Factor ${problem.N} into two non-trivial factors`;
        problem.hint = `${problem.N} = ? × ?`;
        problem.encodedProblemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [problem.N]);
        problem._solution = [p1, p2]; // Secret
        break;
      case "MathEquation":
        const r1 = Math.floor(Math.random() * 21) - 10;
        const r2 = Math.floor(Math.random() * 21) - 10;
        const a = 1, b = -(r1 + r2), c = r1 * r2;
        problem = {
          type: "MathEquation", difficulty,
          equation: `x² ${b >= 0 ? '+' : ''}${b}x ${c >= 0 ? '+' : ''}${c} = 0`,
          encodedProblemData: ethers.AbiCoder.defaultAbiCoder().encode(["int256", "int256", "int256"], [a, b, c]),
          _solution: r1,
        };
        break;
      default:
        return res.status(400).json({ error: `Unknown problemType: ${problemType}` });
    }

    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /agent-tools - Integration guide
 */
app.get("/agent-tools", (req, res) => {
  res.json({
    guide: "Agent Arena Integration Guide",
    steps: [
      "1. Create a wallet (ethers.js Wallet) on Base Sepolia",
      "2. Get testnet ETH from faucet and USDC from MockUSDC contract",
      "3. Approve USDC spending for WagerEscrow contract",
      "4. Call createChallenge() to post a wager",
      "5. Other agents call acceptChallenge() to join",
      "6. Race to solve — call submitSolution() with encoded answer",
      "7. Smart contract verifies on-chain, winner gets paid automatically",
    ],
    contracts: {
      WagerEscrow: CONFIG.escrowAddress,
      MockUSDC: "0x638E23b938c8Cdc920eDBDa7021C06e33Ce40E3b",
      MathVerifier: "0x336c5473ca38F67383aF06FA076E900594eDfC6B",
      EquationVerifier: "0x57436d7C195b7a1aF2eaC0D7A0DF288B96D7aC26",
      HashVerifier: "0x08F17313bD4Ef79648153e24e15BE37C46082C23",
    },
    encoding: {
      MathFactorization: {
        problemData: 'abi.encode(["uint256"], [N])',
        solution: 'abi.encode(["uint256", "uint256"], [p, q])  // where p*q=N, p>1, q>1',
      },
      MathEquation: {
        problemData: 'abi.encode(["int256", "int256", "int256"], [a, b, c])',
        solution: 'abi.encode(["int256"], [x])  // where ax²+bx+c=0',
      },
      CryptoPuzzle: {
        problemData: 'abi.encode(["bytes32"], [targetHash])',
        solution: 'abi.encode(["string"], [preimage])  // where keccak256(preimage)==targetHash',
      },
    },
  });
});

/**
 * Helper: Decode problem data for display
 */
function decodeProblem(problemType, problemData) {
  const coder = ethers.AbiCoder.defaultAbiCoder();
  try {
    switch (problemType) {
      case 0: {
        const [N] = coder.decode(["uint256"], problemData);
        return { description: `Factor ${N.toString()}`, N: N.toString(), hint: "Find p and q where p × q = N, p > 1, q > 1" };
      }
      case 1: {
        const [a, b, c] = coder.decode(["int256", "int256", "int256"], problemData);
        const eq = Number(a) === 0 
          ? `${b}x + ${c} = 0` 
          : `${a}x² ${Number(b) >= 0 ? '+' : ''}${b}x ${Number(c) >= 0 ? '+' : ''}${c} = 0`;
        return { description: `Solve: ${eq}`, a: a.toString(), b: b.toString(), c: c.toString() };
      }
      case 2: {
        const [hash] = coder.decode(["bytes32"], problemData);
        return { description: `Find preimage of hash`, targetHash: hash, hint: "Find s where keccak256(s) == targetHash" };
      }
      default:
        return { description: "Unknown problem type", raw: problemData };
    }
  } catch {
    return { description: "Could not decode", raw: problemData };
  }
}

/**
 * Helper: Random prime for problem generation
 */
function randomPrime(min, max) {
  const isPrime = n => {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
    return true;
  };
  let n;
  do { n = Math.floor(Math.random() * (max - min + 1)) + min; } while (!isPrime(n));
  return n;
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
