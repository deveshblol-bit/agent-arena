const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  console.log(`Deploying remaining contracts to ${network}...`);

  // Use the latest MockUSDC deployment
  const usdcAddr = "0x638E23b938c8Cdc920eDBDa7021C06e33Ce40E3b";
  console.log(`Using MockUSDC at: ${usdcAddr}`);

  // Deploy MathVerifier
  const MathVerifier = await hre.ethers.getContractFactory("MathVerifier");
  const verifier = await MathVerifier.deploy();
  console.log(`Deploying MathVerifier...`);
  await verifier.waitForDeployment();
  const verifierDeployTx = verifier.deploymentTransaction();
  if (verifierDeployTx) await verifierDeployTx.wait(2);
  const verifierAddr = await verifier.getAddress();
  console.log(`MathVerifier deployed: ${verifierAddr}`);

  // Deploy WagerEscrow (2.5% fee)
  const WagerEscrow = await hre.ethers.getContractFactory("WagerEscrow");
  const escrow = await WagerEscrow.deploy(usdcAddr, 250);
  console.log(`Deploying WagerEscrow...`);
  await escrow.waitForDeployment();
  const escrowDeployTx = escrow.deploymentTransaction();
  if (escrowDeployTx) await escrowDeployTx.wait(2);
  const escrowAddr = await escrow.getAddress();
  console.log(`WagerEscrow deployed: ${escrowAddr}`);

  // Register MathVerifier for ProblemType.MathFactorization (0)
  console.log(`Registering MathVerifier...`);
  const registerTx = await escrow.setVerifier(0, verifierAddr);
  await registerTx.wait(2);
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
