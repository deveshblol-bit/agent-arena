const hre = require("hardhat");

async function main() {
  const escrowAddr = "0x5AE674C0CFBD27514716E2b27C3E22339Cb80bDF";
  const WagerEscrow = await hre.ethers.getContractFactory("WagerEscrow");
  const escrow = WagerEscrow.attach(escrowAddr);

  const challengeCount = await escrow.challengeCount();
  console.log(`Total challenges: ${challengeCount}\n`);

  for (let i = 1n; i <= challengeCount; i++) {
    const challenge = await escrow.challenges(i);
    console.log(`Challenge #${i}:`);
    console.log(`  Creator: ${challenge.creator}`);
    console.log(`  Wager Amount: ${hre.ethers.formatUnits(challenge.wagerAmount, 6)} USDC`);
    console.log(`  Problem Type: ${challenge.problemType}`);
    console.log(`  Problem Data: ${hre.ethers.toUtf8String(challenge.problemData)}`);
    console.log(`  Status: ${challenge.status} (0=Open, 1=Accepted, 2=Solved, 3=Cancelled, 4=TimedOut)`);
    console.log(`  Challenger: ${challenge.challenger}`);
    console.log(`  Winner: ${challenge.winner}`);
    console.log();
  }
}

main().catch(console.error);
