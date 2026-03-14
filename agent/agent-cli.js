#!/usr/bin/env node

/**
 * Agent CLI - Command-line interface for agent wallet operations
 * Usage:
 *   node agent-cli.js balance [walletName]
 *   node agent-cli.js create-challenge <amount> <problemType> <problemData> [timeLimit]
 *   node agent-cli.js accept <challengeId>
 *   node agent-cli.js solve <challengeId> <solution>
 *   node agent-cli.js list
 */

const WalletManager = require("./wallet-manager");
const ChallengeSigner = require("./challenge-signer");
const ethers = require("ethers");

// Configuration
const CONFIG = {
  baseSepolia: {
    rpcUrl: "https://sepolia.base.org",
    chainId: 84532,
    usdc: "0x638E23b938c8Cdc920eDBDa7021C06e33Ce40E3b",
    escrow: "0x5AE674C0CFBD27514716E2b27C3E22339Cb80bDF",
  },
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const config = CONFIG.baseSepolia;
  const walletManager = new WalletManager(config.rpcUrl, config.usdc);

  // Load agent wallet
  const wallet = await walletManager.loadOrCreateWallet("agent");
  const signer = new ChallengeSigner(wallet, config.escrow, config.usdc);

  switch (command) {
    case "balance": {
      const walletName = args[1] || "agent";
      const balances = await walletManager.getBalances(walletName);
      console.log("\n💰 Wallet Balances:");
      console.log(`   Address: ${balances.address}`);
      console.log(`   ETH:     ${balances.eth}`);
      console.log(`   USDC:    ${balances.usdc}\n`);
      break;
    }

    case "create-challenge": {
      const amount = parseFloat(args[1]);
      const problemType = parseInt(args[2]);
      const problemDataRaw = args[3];
      const timeLimit = args[4] ? parseInt(args[4]) : 3600;

      if (!amount || isNaN(problemType) || !problemDataRaw) {
        console.error("Usage: create-challenge <amount> <problemType> <problemData> [timeLimit]");
        console.error("Example: create-challenge 1 0 143");
        process.exit(1);
      }

      // Encode problem data based on type
      let problemData;
      if (problemType === 0) {
        // MathFactorization: uint256
        problemData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [BigInt(problemDataRaw)]);
      } else if (problemType === 1) {
        // MathEquation: (int256, int256, int256)
        const [a, b, c] = problemDataRaw.split(",").map(x => BigInt(x.trim()));
        problemData = ethers.AbiCoder.defaultAbiCoder().encode(["int256", "int256", "int256"], [a, b, c]);
      } else if (problemType === 2) {
        // CryptoPuzzle: bytes32
        problemData = ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [problemDataRaw]);
      } else {
        console.error("Unknown problem type:", problemType);
        process.exit(1);
      }

      const result = await signer.createChallenge(amount, problemType, problemData, timeLimit);
      console.log(`\n✅ Challenge created!`);
      console.log(`   ID:  ${result.challengeId}`);
      console.log(`   Tx:  ${result.txHash}\n`);
      break;
    }

    case "accept": {
      const challengeId = parseInt(args[1]);
      if (!challengeId) {
        console.error("Usage: accept <challengeId>");
        process.exit(1);
      }

      const result = await signer.acceptChallenge(challengeId);
      console.log(`\n✅ Challenge accepted!`);
      console.log(`   Tx: ${result.txHash}\n`);
      break;
    }

    case "solve": {
      const challengeId = parseInt(args[1]);
      const solutionRaw = args[2];

      if (!challengeId || !solutionRaw) {
        console.error("Usage: solve <challengeId> <solution>");
        console.error("Example: solve 3 11,13");
        process.exit(1);
      }

      // Get challenge to determine solution encoding
      const challenge = await signer.getChallenge(challengeId);
      let solution;

      if (challenge.problemType === 0) {
        // MathFactorization: (uint256, uint256)
        const [p, q] = solutionRaw.split(",").map(x => BigInt(x.trim()));
        solution = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [p, q]);
      } else if (challenge.problemType === 1) {
        // MathEquation: int256
        solution = ethers.AbiCoder.defaultAbiCoder().encode(["int256"], [BigInt(solutionRaw)]);
      } else if (challenge.problemType === 2) {
        // CryptoPuzzle: bytes
        solution = ethers.AbiCoder.defaultAbiCoder().encode(["bytes"], [ethers.toUtf8Bytes(solutionRaw)]);
      } else {
        console.error("Unknown problem type:", challenge.problemType);
        process.exit(1);
      }

      const result = await signer.submitSolution(challengeId, solution);
      console.log(`\n✅ Solution submitted!`);
      console.log(`   Tx: ${result.txHash}\n`);
      break;
    }

    case "list": {
      const challenges = await signer.listChallenges();
      console.log(`\n📋 Challenges (${challenges.length}):\n`);
      
      for (const ch of challenges) {
        const statusNames = ["Open", "Accepted", "Solved", "Cancelled", "TimedOut"];
        console.log(`Challenge #${ch.id}:`);
        console.log(`  Wager:   ${ch.wagerAmount} USDC`);
        console.log(`  Type:    ${ch.problemType}`);
        console.log(`  Creator: ${ch.creator}`);
        console.log(`  Status:  ${statusNames[ch.status]}`);
        if (ch.winner !== ethers.ZeroAddress) {
          console.log(`  Winner:  ${ch.winner}`);
        }
        console.log();
      }
      break;
    }

    case "cancel": {
      const challengeId = parseInt(args[1]);
      if (!challengeId) {
        console.error("Usage: cancel <challengeId>");
        process.exit(1);
      }

      const result = await signer.cancelChallenge(challengeId);
      console.log(`\n✅ Challenge cancelled!`);
      console.log(`   Tx: ${result.txHash}\n`);
      break;
    }

    default:
      console.log(`
Agent Arena CLI

Usage:
  node agent-cli.js <command> [args]

Commands:
  balance [walletName]                 Show wallet balances
  create-challenge <amt> <type> <data> Create a challenge
  accept <id>                          Accept a challenge
  solve <id> <solution>                Submit solution
  list                                 List all challenges
  cancel <id>                          Cancel a challenge

Examples:
  node agent-cli.js balance
  node agent-cli.js create-challenge 1 0 143
  node agent-cli.js accept 3
  node agent-cli.js solve 3 11,13
  node agent-cli.js list
      `);
      break;
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
