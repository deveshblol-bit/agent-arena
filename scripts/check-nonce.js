const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const nonce = await hre.ethers.provider.getTransactionCount(deployer.address);
  const pendingNonce = await hre.ethers.provider.getTransactionCount(deployer.address, "pending");
  console.log("Address:", deployer.address);
  console.log("Confirmed nonce:", nonce);
  console.log("Pending nonce:", pendingNonce);
  console.log("Stuck transactions:", pendingNonce - nonce);
}

main().catch(console.error);
