require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");

let accounts = [];
try {
  const wallet = JSON.parse(fs.readFileSync("./wallet/agent.json", "utf8"));
  if (wallet.privateKey) accounts = [wallet.privateKey];
} catch {}

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: {},
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts,
    },
  },
};
