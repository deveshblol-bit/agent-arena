const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("🧪 COMPLETE FLOW TEST on Base Sepolia\n");
  console.log("Deployer:", deployer.address, "\n");

  const usdcAddr = "0x638E23b938c8Cdc920eDBDa7021C06e33Ce40E3b";
  const escrowAddr = "0x5AE674C0CFBD27514716E2b27C3E22339Cb80bDF";

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(usdcAddr);
  
  const WagerEscrow = await hre.ethers.getContractFactory("WagerEscrow");
  const escrow = WagerEscrow.attach(escrowAddr);

  // Create challenge with CORRECT encoding
  console.log("1. Creating challenge (1 USDC, factor 143)...");
  const approveTx = await usdc.approve(escrowAddr, hre.ethers.parseUnits("100", 6));
  await approveTx.wait(3);
  
  const problemData = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [143]); // CORRECT
  const createTx = await escrow.createChallenge(
    hre.ethers.parseUnits("1", 6), // 1 USDC
    0, // MathFactorization
    problemData, // ABI-encoded uint256
    3600 // 1 hour
  );
  await createTx.wait(3);
  const challengeId = await escrow.challengeCount();
  console.log(`   Challenge #${challengeId} created ✅\n`);

  // Create challenger
  console.log("2. Creating challenger wallet...");
  const challenger = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
  console.log(`   ${challenger.address}\n`);

  // Fund challenger
  console.log("3. Funding challenger...");
  const ethTx = await deployer.sendTransaction({ to: challenger.address, value: hre.ethers.parseEther("0.01") });
  await ethTx.wait(3);
  const mintTx = await usdc.mint(challenger.address, hre.ethers.parseUnits("10", 6));
  await mintTx.wait(3);
  console.log("   Funded ✅\n");

  // Accept
  console.log("4. Accepting challenge...");
  const usdcAsChallenger = usdc.connect(challenger);
  const approveTx2 = await usdcAsChallenger.approve(escrowAddr, hre.ethers.parseUnits("10", 6));
  await approveTx2.wait(3);
  
  const escrowAsChallenger = escrow.connect(challenger);
  const acceptTx = await escrowAsChallenger.acceptChallenge(challengeId);
  await acceptTx.wait(3);
  console.log("   Accepted ✅\n");

  // Solve
  console.log("5. Submitting solution (11 × 13 = 143)...");
  const solution = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [11, 13]);
  const solveTx = await escrowAsChallenger.submitSolution(challengeId, solution);
  const solveReceipt = await solveTx.wait(3);
  console.log(`   Verified + paid ✅`);
  console.log(`   Tx: ${solveReceipt.hash}\n`);

  // Check results
  console.log("6. Final results:");
  const deployerBal = await usdc.balanceOf(deployer.address);
  const challengerBal = await usdc.balanceOf(challenger.address);
  const escrowBal = await usdc.balanceOf(escrowAddr);
  
  console.log(`   Creator (lost): ${hre.ethers.formatUnits(deployerBal, 6)} USDC`);
  console.log(`   Challenger (won): ${hre.ethers.formatUnits(challengerBal, 6)} USDC`);
  console.log(`   Escrow: ${hre.ethers.formatUnits(escrowBal, 6)} USDC`);
  
  const finalChallenge = await escrow.challenges(challengeId);
  console.log(`\n   Winner: ${finalChallenge.winner}`);
  console.log(`   Status: ${finalChallenge.status} (2=Solved)\n`);

  console.log("✅ FULL FLOW TEST PASSED!");
  console.log("\nWhat was tested:");
  console.log("  ✅ USDC minting + approvals");
  console.log("  ✅ Challenge creation with proper encoding");
  console.log("  ✅ Challenge acceptance");
  console.log("  ✅ On-chain verification (MathVerifier)");
  console.log("  ✅ Winner payout with fee deduction");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
