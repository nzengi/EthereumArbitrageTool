#!/usr/bin/env node

const { spawn } = require("child_process");
const { ethers } = require("ethers");
require("dotenv").config();

console.log("🚀 INSTANT PRODUCTION ARBITRAGE SYSTEM");
console.log("======================================");
console.log("💰 Contract: 0x2Ec4D7102ab6863aEef44d140Af01CB667eD5DAa");
console.log("🌐 Network: Ethereum Mainnet via Infura");
console.log("💎 Wallet: 0x5Cd87281B8Aec278136f1bC41173fBC69b1c0670");
console.log("🔥 ANINDA PARİ BAŞLASIN!");

async function startInstantProduction() {
  try {
    // Use Infura for instant connection
    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);

    console.log("\n🔍 TESTING MAINNET CONNECTION:");
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected to Mainnet! Latest block: ${blockNumber}`);

    const network = await provider.getNetwork();
    console.log(`✅ Network: ${network.name} (Chain ID: ${network.chainId})`);

    // Check wallet balance
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);

    console.log(`💰 Wallet Address: ${wallet.address}`);
    console.log(`💰 Wallet Balance: ${balanceEth} ETH`);

    if (parseFloat(balanceEth) >= 0.1) {
      console.log("✅ Sufficient balance for arbitrage!");
    } else {
      console.log("⚠️  Balance might be low for optimal arbitrage.");
    }

    // Check gas price
    const feeData = await provider.getFeeData();
    console.log(
      `⛽ Current Gas Price: ${ethers.formatUnits(
        feeData.gasPrice,
        "gwei"
      )} Gwei`
    );

    console.log("\n🎯 INSTANT PRODUCTION FEATURES:");
    console.log("🔄 Real-time mempool monitoring");
    console.log("⚡ Dynamic gas optimization");
    console.log("🎯 MEV opportunity detection");
    console.log("🔗 Multi-DEX arbitrage (Uniswap, SushiSwap, 1inch)");
    console.log("📊 Real-time profit calculation");
    console.log("🌱 Auto-compound earnings");
    console.log("💎 0.11 ETH capital ready!");

    console.log("\n🔥 STARTING INSTANT ARBITRAGE...");

    // Start the arbitrage with Infura
    const arbitrage = spawn("node", ["scripts/continuous-arbitrage.js"], {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "production",
        RPC_URL: process.env.ETHEREUM_RPC_URL,
        USE_INFURA: "true",
        INSTANT_MODE: "true",
      },
    });

    arbitrage.on("error", (error) => {
      console.error("❌ Arbitrage error:", error);
    });

    arbitrage.on("exit", (code) => {
      console.log(`\n🔚 Arbitrage exited with code: ${code}`);
      if (code !== 0) {
        console.log("🔄 Auto-restarting in 3 seconds...");
        setTimeout(() => startInstantProduction(), 3000);
      }
    });

    // Profit monitoring with higher frequency
    setTimeout(() => {
      console.log("📊 Starting profit monitor...");
      const monitor = spawn("node", ["scripts/monitor-profits.js"], {
        stdio: "inherit",
        env: {
          ...process.env,
          RPC_URL: process.env.ETHEREUM_RPC_URL,
          MONITOR_FREQUENCY: "10000", // 10 seconds
        },
      });
    }, 5000);

    console.log("\n🎯 INSTANT PRODUCTION LIVE!");
    console.log(
      "📈 Track profits: https://etherscan.io/address/0x5Cd87281B8Aec278136f1bC41173fBC69b1c0670"
    );
    console.log(
      "💰 Contract: https://etherscan.io/address/0x2Ec4D7102ab6863aEef44d140Af01CB667eD5DAa"
    );
    console.log("💎 MAXIMUM PROFIT EXTRACTION MODE ACTIVATED!");
  } catch (error) {
    console.error("❌ Failed to start instant production:", error.message);

    if (error.code === "NETWORK_ERROR") {
      console.log("\n🔄 Network issue, retrying in 10 seconds...");
      setTimeout(() => startInstantProduction(), 10000);
    }
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down instant production...");
  console.log("💰 Check your profits at Etherscan!");
  process.exit(0);
});

console.log("🔍 Initializing instant production...");
startInstantProduction();
