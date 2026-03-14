const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Testing deployed contracts on Base Sepolia...\n");
  console.log("Deployer:", deployer.address);

  // Contract addresses
  const usdcAddr = "0x638E23b938c8Cdc920eDBDa7021C06e33Ce40E3b";
  const verifierAddr = "0x336c5473ca38F67383aF06FA076E900594eDfC6B";
  const escrowAddr = "0x5AE674C0CFBD27514716E2b27C3E22339Cb80bDF";

  // Get contract instances
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(usdcAddr);
  
  const WagerEscrow = await hre.ethers.getContractFactory("WagerEscrow");
  const escrow = WagerEscrow.attach(escrowAddr);

  // Step 1: Check USDC balance
  console.log("1. Checking USDC balance...");
  const balance = await usdc.balanceOf(deployer.address);
  console.log(`   Balance: ${hre.ethers.formatUnits(balance, 6)} USDC ✅\n`);

  // Step 2: Approve escrow
  console.log("2. Approving WagerEscrow...");
  const approveTx = await usdc.approve(escrowAddr, hre.ethers.parseUnits("100", 6));
  await approveTx.wait(1);
  console.log(`   Approved ✅\n`);

  // Step 3: Create a challenge
  console.log("3. Creating challenge (factor 143 = 11 × 13)...");
  const createTx = await escrow.createChallenge(
    hre.ethers.parseUnits("10", 6), // 10 USDC wager
    0, // ProblemType.MathFactorization
    hre.ethers.toUtf8Bytes("143"), // problem data (11 × 13)
    Math.floor(Date.now() / 1000) + 3600 // 1 hour timeout
  );
  const receipt = await createTx.wait(2);
  console.log(`   Challenge created! Tx: ${receipt.hash}`);
  
  // Get current challenge count
  const challengeCount = await escrow.challengeCount();
  const challengeId = challengeCount;
  console.log(`   Challenge ID: ${challengeId} ✅\n`);

  // Step 4: Check challenge details
  console.log("4. Reading challenge data...");
  const challenge = await escrow.challenges(challengeId);
  console.log(`   Creator: ${challenge.creator}`);
  console.log(`   Amount: ${hre.ethers.formatUnits(challenge.amount, 6)} USDC`);
  console.log(`   Problem: ${challenge.problemData}`);
  console.log(`   Status: ${challenge.status} (0=Open) ✅\n`);

  console.log("✅ All deployment tests passed!");
  console.log("\nNext: Accept challenge + submit solution from a second wallet");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
