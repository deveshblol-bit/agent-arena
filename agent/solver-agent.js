#!/usr/bin/env node

/**
 * Solver Agent — Autonomous agent that browses challenges and solves them
 * 
 * Strategies:
 * - MathFactorization: Trial division
 * - MathEquation: Quadratic formula
 * - CryptoPuzzle: Skip (brute force too slow for medium/hard)
 */

const ethers = require("ethers");
const AgentTools = require("./agent-tools");

class SolverAgent {
  constructor(walletPath) {
    this.tools = new AgentTools(walletPath);
  }

  /**
   * Scan for open challenges and attempt to solve accepted ones
   */
  async scan() {
    await this.tools.init();
    console.log(`🤖 Solver Agent: ${this.tools.address}`);
    
    const balance = await this.tools.agent_balance();
    console.log(`💰 Balance: ${balance.eth} ETH, ${balance.usdc} USDC`);

    // Browse all challenges
    const challenges = await this.tools.wager_browse();
    console.log(`\n📋 Found ${challenges.length} challenges\n`);

    for (const c of challenges) {
      console.log(`  #${c.id} | ${c.status} | ${c.problemType} | ${c.wagerAmount}`);
    }

    return challenges;
  }

  /**
   * Try to solve a specific challenge
   * @param {number} challengeId
   * @returns {object|null} Solution result or null if unsolvable
   */
  async trySolve(challengeId) {
    await this.tools.init();
    
    const status = await this.tools.wager_status(challengeId);
    console.log(`\n🎯 Attempting challenge #${challengeId}: ${status.problemType}`);
    
    // Decode problem data
    const challenge = await this.tools.signer.getChallenge(challengeId);
    const problemType = Number(challenge.problemType);
    const coder = ethers.AbiCoder.defaultAbiCoder();
    
    let solution;

    switch (problemType) {
      case 0: // MathFactorization
        solution = this._solveFactorization(challenge.problemData, coder);
        break;
      case 1: // MathEquation
        solution = this._solveEquation(challenge.problemData, coder);
        break;
      case 2: // CryptoPuzzle
        console.log("⏭️ Skipping crypto puzzle (brute force not practical)");
        return null;
      default:
        console.log(`⏭️ Unknown problem type: ${problemType}`);
        return null;
    }

    if (solution === null) {
      console.log("❌ Could not find solution");
      return null;
    }

    console.log(`✅ Found solution: ${solution}`);

    // Submit solution
    try {
      const result = await this.tools.wager_solve(challengeId, solution);
      console.log(`🏆 Solution submitted! TX: ${result.txHash}`);
      return result;
    } catch (err) {
      console.error(`❌ Submission failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Full autonomous flow: browse, accept open challenges, solve them
   */
  async run() {
    await this.tools.init();
    console.log("🏁 Autonomous solver starting...\n");

    const challenges = await this.scan();
    
    // Look for open challenges to accept
    const open = challenges.filter(c => c.status === "Open");
    if (open.length > 0) {
      console.log(`\n📢 Found ${open.length} open challenges to potentially accept`);
      for (const c of open) {
        console.log(`  → #${c.id}: ${c.problemType} for ${c.wagerAmount}`);
      }
    }

    // Look for active challenges we're part of
    const active = challenges.filter(c => 
      c.status === "Active" && 
      c.challenger.toLowerCase() === this.tools.address.toLowerCase()
    );
    
    if (active.length > 0) {
      console.log(`\n⚡ Found ${active.length} active challenges to solve`);
      for (const c of active) {
        await this.trySolve(parseInt(c.id));
      }
    }

    console.log("\n✅ Solver run complete");
  }

  // ── Solvers ──────────────────────────────────────────────────────────

  _solveFactorization(problemData, coder) {
    try {
      const [N] = coder.decode(["uint256"], problemData);
      const n = Number(N);
      console.log(`  📐 Factoring ${n}...`);

      // Trial division
      for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) {
          const p = i;
          const q = n / i;
          console.log(`  📐 Found: ${p} × ${q} = ${n}`);
          return [p, q];
        }
      }
      return null;
    } catch (err) {
      console.error(`  Error decoding factorization: ${err.message}`);
      return null;
    }
  }

  _solveEquation(problemData, coder) {
    try {
      const [a, b, c] = coder.decode(["int256", "int256", "int256"], problemData);
      const aNum = Number(a);
      const bNum = Number(b);
      const cNum = Number(c);
      
      console.log(`  📐 Solving: ${aNum}x² + ${bNum}x + ${cNum} = 0`);

      if (aNum === 0) {
        // Linear: bx + c = 0 → x = -c/b
        if (bNum === 0) return null;
        const x = -cNum / bNum;
        if (Number.isInteger(x)) {
          console.log(`  📐 Solution: x = ${x}`);
          return x;
        }
        return null;
      }

      // Quadratic: (-b ± √(b²-4ac)) / 2a
      const discriminant = bNum * bNum - 4 * aNum * cNum;
      if (discriminant < 0) return null;

      const sqrtD = Math.sqrt(discriminant);
      const x1 = (-bNum + sqrtD) / (2 * aNum);
      const x2 = (-bNum - sqrtD) / (2 * aNum);

      // Return integer root
      if (Number.isInteger(x1)) {
        console.log(`  📐 Solution: x = ${x1}`);
        return x1;
      }
      if (Number.isInteger(x2)) {
        console.log(`  📐 Solution: x = ${x2}`);
        return x2;
      }

      // Try rounding (floating point issues)
      if (Math.abs(x1 - Math.round(x1)) < 0.001) return Math.round(x1);
      if (Math.abs(x2 - Math.round(x2)) < 0.001) return Math.round(x2);

      return null;
    } catch (err) {
      console.error(`  Error decoding equation: ${err.message}`);
      return null;
    }
  }
}

// CLI usage
if (require.main === module) {
  const walletPath = process.argv[2] || "./wallet/challenger.json";
  const action = process.argv[3] || "scan";
  const agent = new SolverAgent(walletPath);

  switch (action) {
    case "scan":
      agent.scan().catch(console.error);
      break;
    case "run":
      agent.run().catch(console.error);
      break;
    case "solve":
      const id = parseInt(process.argv[4]);
      if (!id) {
        console.error("Usage: solver-agent.js <wallet> solve <challengeId>");
        process.exit(1);
      }
      agent.trySolve(id).catch(console.error);
      break;
    default:
      console.log("Usage: solver-agent.js <wallet> [scan|run|solve <id>]");
  }
}

module.exports = SolverAgent;
