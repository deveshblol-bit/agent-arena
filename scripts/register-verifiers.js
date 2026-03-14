const hre = require("hardhat");

async function main() {
  const ESCROW = "0x5AE674C0CFBD27514716E2b27C3E22339Cb80bDF";
  const HASH_VERIFIER = "0x08F17313bD4Ef79648153e24e15BE37C46082C23";
  const EQ_VERIFIER = "0x57436d7C195b7a1aF2eaC0D7A0DF288B96D7aC26";

  const escrow = await hre.ethers.getContractAt("WagerEscrow", ESCROW);

  console.log("Registering EquationVerifier for MathEquation (enum 1)...");
  let tx = await escrow.setVerifier(1, EQ_VERIFIER);
  await tx.wait();
  console.log("✅ Done");

  console.log("Registering HashVerifier for CryptoPuzzle (enum 2)...");
  tx = await escrow.setVerifier(2, HASH_VERIFIER);
  await tx.wait();
  console.log("✅ Done");

  console.log("\nAll verifiers registered!");
}

main().catch(console.error);
