#!/usr/bin/env node
/**
 * Day 6: End-to-End Two-Agent Race Test
 * 
 * Agent A (creator) creates a challenge
 * Agent B (solver) browses, accepts, and solves it
 * Verifies payout went to winner
 */

const AgentTools = require("../agent/agent-tools");
const SolverAgent = require("../agent/solver-agent");

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  🏟️  Agent Arena — Two-Agent E2E Test");
  console.log("═══════════════════════════════════════════\n");

  // Agent A = creator (main wallet)
  const agentA = new AgentTools("./wallet/agent.json");
  await agentA.init();
  console.log(`🅰️  Agent A (Creator): ${agentA.address}`);

  // Agent B = solver (challenger wallet)
  const agentB = new AgentTools("./wallet/challenger.json");
  await agentB.init();
  console.log(`🅱️  Agent B (Solver):  ${agentB.address}`);

  // Check balances
  const balA = await agentA.agent_balance();
  const balB = await agentB.agent_balance();
  console.log(`\n💰 Agent A: ${balA.eth} ETH, ${balA.usdc} USDC`);
  console.log(`💰 Agent B: ${balB.eth} ETH, ${balB.usdc} USDC\n`);

  // Step 1: Agent A creates a MathFactorization challenge
  console.log("── Step 1: Agent A creates challenge ──");
  const wagerAmount = "1"; // 1 USDC
  const timeLimit = 3600;  // 1 hour
  
  let createResult;
  try {
    createResult = await agentA.wager_create("MathFactorization", "easy", wagerAmount, timeLimit);
    console.log(`✅ Challenge created! ID: ${createResult.challengeId}`);
    console.log(`   TX: ${createResult.txHash}`);
    console.log(`   Problem: ${createResult.description}`);
    console.log(`   Solution (secret): ${JSON.stringify(createResult._secret_solution)}\n`);
  } catch (err) {
    console.error(`❌ Create failed: ${err.message}`);
    process.exit(1);
  }

  const challengeId = createResult.challengeId;

  // Step 2: Agent B browses and finds the challenge
  console.log("── Step 2: Agent B browses challenges ──");
  const challenges = await agentB.wager_browse({ status: "Open" });
  const target = challenges.find(c => c.id === String(challengeId));
  if (!target) {
    console.error(`❌ Challenge #${challengeId} not found in browse!`);
    process.exit(1);
  }
  console.log(`✅ Found challenge #${challengeId}: ${target.problemType} for ${target.wagerAmount}\n`);

  // Step 3: Agent B accepts the challenge
  console.log("── Step 3: Agent B accepts challenge ──");
  try {
    const acceptResult = await agentB.wager_accept(challengeId);
    console.log(`✅ Challenge accepted! TX: ${acceptResult.txHash}\n`);
  } catch (err) {
    console.error(`❌ Accept failed: ${err.message}`);
    process.exit(1);
  }

  // Step 4: Agent B solves the challenge using SolverAgent logic
  console.log("── Step 4: Agent B solves challenge ──");
  const solver = new SolverAgent("./wallet/challenger.json");
  try {
    const solveResult = await solver.trySolve(challengeId);
    if (solveResult) {
      console.log(`\n🏆 WINNER: Agent B solved challenge #${challengeId}!`);
      console.log(`   TX: ${solveResult.txHash}\n`);
    } else {
      console.error("❌ Solver returned null");
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Solve failed: ${err.message}`);
    process.exit(1);
  }

  // Step 5: Verify final state
  console.log("── Step 5: Verify final state ──");
  const finalStatus = await agentA.wager_status(challengeId);
  console.log(`   Challenge status: ${finalStatus.status}`);
  console.log(`   Winner: ${finalStatus.winner || "N/A"}`);

  const balA2 = await agentA.agent_balance();
  const balB2 = await agentB.agent_balance();
  console.log(`\n💰 Agent A: ${balA2.usdc} USDC (was ${balA.usdc})`);
  console.log(`💰 Agent B: ${balB2.usdc} USDC (was ${balB.usdc})`);

  console.log("\n═══════════════════════════════════════════");
  console.log("  ✅ END-TO-END TEST COMPLETE!");
  console.log("═══════════════════════════════════════════");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
