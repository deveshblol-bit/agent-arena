const hre = require("hardhat");

async function main() {
  const escrow = await hre.ethers.getContractAt("WagerEscrow", "0x5AE674C0CFBD27514716E2b27C3E22339Cb80bDF");
  const challenge = await escrow.challenges(2);
  
  console.log("Problem data (hex):", hre.ethers.hexlify(challenge.problemData));
  console.log("Problem data (utf8):", hre.ethers.toUtf8String(challenge.problemData));
  
  // What it should be for verifier:
  const correctEncoding = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [143]);
  console.log("\nCorrect encoding:", correctEncoding);
  console.log("Match?", hre.ethers.hexlify(challenge.problemData) === correctEncoding);
}

main().catch(console.error);
