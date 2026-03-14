/**
 * Agent Wallet Manager
 * Handles wallet creation, key storage, and USDC balance checking
 */

const ethers = require("ethers");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const WALLETS_DIR = path.join(__dirname, "../wallet");
const AGENT_WALLET_FILE = path.join(WALLETS_DIR, "agent.json");

class WalletManager {
  constructor(rpcUrl, usdcAddress) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.usdcAddress = usdcAddress;
    this.wallets = new Map();
  }

  /**
   * Load existing agent wallet or create new one
   */
  async loadOrCreateWallet(name = "agent") {
    const walletPath = path.join(WALLETS_DIR, `${name}.json`);
    
    if (fs.existsSync(walletPath)) {
      console.log(`Loading existing wallet: ${name}`);
      const data = JSON.parse(fs.readFileSync(walletPath, "utf8"));
      const wallet = new ethers.Wallet(data.privateKey, this.provider);
      this.wallets.set(name, wallet);
      return wallet;
    }

    console.log(`Creating new wallet: ${name}`);
    const wallet = ethers.Wallet.createRandom().connect(this.provider);
    this.saveWallet(name, wallet);
    this.wallets.set(name, wallet);
    return wallet;
  }

  /**
   * Save wallet to encrypted JSON file
   */
  saveWallet(name, wallet) {
    if (!fs.existsSync(WALLETS_DIR)) {
      fs.mkdirSync(WALLETS_DIR, { recursive: true });
    }

    const walletPath = path.join(WALLETS_DIR, `${name}.json`);
    const data = {
      name,
      address: wallet.address,
      privateKey: wallet.privateKey,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(walletPath, JSON.stringify(data, null, 2));
    console.log(`Wallet saved: ${name} → ${wallet.address}`);
  }

  /**
   * Get wallet by name
   */
  getWallet(name = "agent") {
    if (this.wallets.has(name)) {
      return this.wallets.get(name);
    }
    throw new Error(`Wallet not loaded: ${name}`);
  }

  /**
   * Check ETH balance
   */
  async getEthBalance(walletName = "agent") {
    const wallet = this.getWallet(walletName);
    const balance = await this.provider.getBalance(wallet.address);
    return ethers.formatEther(balance);
  }

  /**
   * Check USDC balance
   */
  async getUsdcBalance(walletName = "agent") {
    const wallet = this.getWallet(walletName);
    const usdc = new ethers.Contract(
      this.usdcAddress,
      ["function balanceOf(address) view returns (uint256)"],
      this.provider
    );
    const balance = await usdc.balanceOf(wallet.address);
    return ethers.formatUnits(balance, 6);
  }

  /**
   * Get all balances for a wallet
   */
  async getBalances(walletName = "agent") {
    const wallet = this.getWallet(walletName);
    const eth = await this.getEthBalance(walletName);
    const usdc = await this.getUsdcBalance(walletName);
    
    return {
      address: wallet.address,
      eth,
      usdc,
    };
  }

  /**
   * List all wallets
   */
  listWallets() {
    return Array.from(this.wallets.keys());
  }

  /**
   * Fund wallet with ETH (from another wallet)
   */
  async fundWithEth(fromWallet, toAddress, amountEth) {
    const tx = await fromWallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amountEth.toString()),
    });
    await tx.wait();
    return tx.hash;
  }

  /**
   * Transfer USDC between wallets
   */
  async transferUsdc(fromWallet, toAddress, amountUsdc) {
    const usdc = new ethers.Contract(
      this.usdcAddress,
      [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address) view returns (uint256)",
      ],
      fromWallet
    );

    const amount = ethers.parseUnits(amountUsdc.toString(), 6);
    const tx = await usdc.transfer(toAddress, amount);
    await tx.wait();
    return tx.hash;
  }
}

module.exports = WalletManager;
