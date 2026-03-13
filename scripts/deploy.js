const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  console.log(`Deploying to ${network}...`);

  // Deploy MockUSDC (testnet only)
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log(`MockUSDC deployed: ${usdcAddr}`);

  // Deploy MathVerifier
  const MathVerifier = await hre.ethers.getContractFactory("MathVerifier");
  const verifier = await MathVerifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log(`MathVerifier deployed: ${verifierAddr}`);

  // Deploy WagerEscrow (2.5% fee)
  const WagerEscrow = await hre.ethers.getContractFactory("WagerEscrow");
  const escrow = await WagerEscrow.deploy(usdcAddr, 250);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log(`WagerEscrow deployed: ${escrowAddr}`);

  // Register MathVerifier for ProblemType.MathFactorization (0)
  await escrow.setVerifier(0, verifierAddr);
  console.log("MathVerifier registered as verifier for MathFactorization");

  console.log("\n--- Deployment Summary ---");
  console.log(`MockUSDC:     ${usdcAddr}`);
  console.log(`MathVerifier: ${verifierAddr}`);
  console.log(`WagerEscrow:  ${escrowAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
