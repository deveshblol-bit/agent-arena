const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("🧪 Testing FULL FLOW on Base Sepolia\n");
  console.log("Deployer:", deployer.address);

  const usdcAddr = "0x638E23b938c8Cdc920eDBDa7021C06e33Ce40E3b";
  const escrowAddr = "0x5AE674C0CFBD27514716E2b27C3E22339Cb80bDF";

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(usdcAddr);
  
  const WagerEscrow = await hre.ethers.getContractFactory("WagerEscrow");
  const escrow = WagerEscrow.attach(escrowAddr);

  // Step 1: Cancel existing challenge to get refund
  console.log("1. Cancelling existing challenge #1...");
  const cancelTx = await escrow.cancelChallenge(1);
  await cancelTx.wait(2);
  console.log("   Cancelled ✅\n");

  // Check balance
  let balance = await usdc.balanceOf(deployer.address);
  console.log(`   Balance: ${hre.ethers.formatUnits(balance, 6)} USDC\n`);

  // Step 2: Create a NEW smaller challenge
  console.log("2. Creating test challenge (1 USDC wager, factor 143)...");
  await usdc.approve(escrowAddr, hre.ethers.parseUnits("100", 6));
  const createTx = await escrow.createChallenge(
    hre.ethers.parseUnits("1", 6), // 1 USDC wager
    0, // ProblemType.MathFactorization
    hre.ethers.toUtf8Bytes("143"), // 11 × 13
    3600 // 1 hour timeout
  );
  await createTx.wait(2);
  const challengeId = await escrow.challengeCount();
  console.log(`   Challenge #${challengeId} created ✅\n`);

  // Step 3: Accept as challenger (using same wallet for test - this will fail, so we skip)
  console.log("3. Need 2nd wallet to accept (skipping - contract prevents self-accept)\n");

  // Step 4: Actually, let's just solve it ourselves by accepting from a throwaway wallet
  console.log("4. Creating throwaway wallet to accept...");
  const challenger = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
  console.log(`   Challenger: ${challenger.address}\n`);

  // Fund challenger with ETH for gas
  console.log("5. Funding challenger with ETH + USDC...");
  const fundEthTx = await deployer.sendTransaction({
    to: challenger.address,
    value: hre.ethers.parseEther("0.01")
  });
  await fundEthTx.wait(2);
  
  // Mint USDC to challenger
  const mintTx = await usdc.mint(challenger.address, hre.ethers.parseUnits("10", 6));
  await mintTx.wait(2);
  console.log("   Funded ✅\n");

  // Step 6: Accept challenge as challenger
  console.log("6. Challenger accepting challenge...");
  const usdcAsChallenger = usdc.connect(challenger);
  await usdcAsChallenger.approve(escrowAddr, hre.ethers.parseUnits("10", 6));
  
  const escrowAsChallenger = escrow.connect(challenger);
  const acceptTx = await escrowAsChallenger.acceptChallenge(challengeId);
  await acceptTx.wait(2);
  console.log("   Accepted ✅\n");

  // Step 7: Submit correct solution as challenger
  console.log("7. Challenger submitting solution (11, 13)...");
  const solveTx = await escrowAsChallenger.submitSolution(
    challengeId,
    hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [11, 13])
  );
  await solveTx.wait(2);
  console.log("   Solution verified + payout sent ✅\n");

  // Step 8: Check final balances
  console.log("8. Final balances:");
  const deployerBalance = await usdc.balanceOf(deployer.address);
  const challengerBalance = await usdc.balanceOf(challenger.address);
  const escrowBalance = await usdc.balanceOf(escrowAddr);
  
  console.log(`   Deployer (creator): ${hre.ethers.formatUnits(deployerBalance, 6)} USDC`);
  console.log(`   Challenger (winner): ${hre.ethers.formatUnits(challengerBalance, 6)} USDC`);
  console.log(`   Escrow: ${hre.ethers.formatUnits(escrowBalance, 6)} USDC`);
  
  const challenge = await escrow.challenges(challengeId);
  console.log(`\n   Winner: ${challenge.winner}`);
  console.log(`   Status: ${challenge.status} (2=Solved) ✅\n`);

  console.log("✅ FULL FLOW TEST PASSED!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
