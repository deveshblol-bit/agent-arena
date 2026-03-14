const hre = require("hardhat");

async function main() {
  const ESCROW = "0x5AE674C0CFBD27514716E2b27C3E22339Cb80bDF";

  console.log("Deploying new verifiers to Base Sepolia...\n");

  // Deploy HashVerifier
  const HashVerifier = await hre.ethers.getContractFactory("HashVerifier");
  const hashVerifier = await HashVerifier.deploy();
  await hashVerifier.waitForDeployment();
  const hashAddr = await hashVerifier.getAddress();
  console.log("HashVerifier deployed:", hashAddr);

  // Deploy EquationVerifier
  const EquationVerifier = await hre.ethers.getContractFactory("EquationVerifier");
  const eqVerifier = await EquationVerifier.deploy();
  await eqVerifier.waitForDeployment();
  const eqAddr = await eqVerifier.getAddress();
  console.log("EquationVerifier deployed:", eqAddr);

  // Register verifiers on WagerEscrow
  const escrow = await hre.ethers.getContractAt("WagerEscrow", ESCROW);

  // ProblemType enum: 0=MathFactorization, 1=MathEquation, 2=CryptoPuzzle
  console.log("\nRegistering EquationVerifier for MathEquation (enum 1)...");
  let tx = await escrow.setVerifier(1, eqAddr);
  await tx.wait();
  console.log("✅ MathEquation verifier registered");

  console.log("Registering HashVerifier for CryptoPuzzle (enum 2)...");
  tx = await escrow.setVerifier(2, hashAddr);
  await tx.wait();
  console.log("✅ CryptoPuzzle verifier registered");

  console.log("\n=== Deployment Summary ===");
  console.log("HashVerifier:", hashAddr);
  console.log("EquationVerifier:", eqAddr);
  console.log("All verifiers registered on WagerEscrow:", ESCROW);
}

main().catch(console.error);
