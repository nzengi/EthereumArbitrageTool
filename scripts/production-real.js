#!/usr/bin/env node

const { spawn } = require("child_process");
const { ethers } = require("ethers");
require("dotenv").config();

console.log("🚀 REAL PRODUCTION ARBITRAGE SYSTEM");
console.log("===================================");
console.log("💰 Contract: 0x2Ec4D7102ab6863aEef44d140Af01CB667eD5DAa");
console.log("🌐 Network: Ethereum Mainnet");
console.log("⚡ Reth Node: http://127.0.0.1:8545");
console.log("🔥 GERÇEK PARİNİN ZAMANI!");

async function startProduction() {
  try {
    // Use local Reth node
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    console.log("\n🔍 TESTING RETH CONNECTION:");
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected to Reth! Latest block: ${blockNumber}`);

    const network = await provider.getNetwork();
    console.log(`✅ Network: ${network.name} (Chain ID: ${network.chainId})`);

    // Check wallet balance
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Wallet Balance: ${ethers.formatEther(balance)} ETH`);

    if (parseFloat(ethers.formatEther(balance)) < 0.1) {
      console.log(
        "⚠️  Low balance! Minimum 0.1 ETH recommended for arbitrage."
      );
    }

    console.log("\n🎯 PRODUCTION FEATURES ACTIVE:");
    console.log("🔄 Real-time mempool monitoring");
    console.log("⚡ Gas price optimization");
    console.log("🎯 MEV opportunity detection");
    console.log("🔗 Multi-DEX arbitrage");
    console.log("📊 Profit calculation & auto-execution");
    console.log("🌱 Capital compounding");

    console.log("\n🔥 STARTING CONTINUOUS ARBITRAGE...");

    // Start the arbitrage monitoring
    const arbitrage = spawn("node", ["scripts/continuous-arbitrage.js"], {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "production",
        RPC_URL: "http://127.0.0.1:8545",
        USE_LOCAL_RETH: "true",
      },
    });

    arbitrage.on("error", (error) => {
      console.error("❌ Arbitrage error:", error);
    });

    arbitrage.on("exit", (code) => {
      console.log(`\n🔚 Arbitrage exited with code: ${code}`);
      if (code !== 0) {
        console.log("🔄 Restarting arbitrage in 5 seconds...");
        setTimeout(() => startProduction(), 5000);
      }
    });

    // Profit monitoring
    setTimeout(() => {
      const monitor = spawn("node", ["scripts/monitor-profits.js"], {
        stdio: "inherit",
        env: {
          ...process.env,
          RPC_URL: "http://127.0.0.1:8545",
        },
      });
    }, 10000);

    console.log("\n🎯 PRODUCTION SYSTEM LIVE!");
    console.log(
      "📈 Monitor at: https://etherscan.io/address/0x2Ec4D7102ab6863aEef44d140Af01CB667eD5DAa"
    );
    console.log("💎 GET READY FOR MAXIMUM PROFIT EXTRACTION!");
  } catch (error) {
    console.error("❌ Failed to start production:", error.message);

    if (error.message.includes("connection")) {
      console.log("\n🔄 Waiting for Reth to fully sync...");
      console.log("💡 Make sure Reth is running with peers connected");
      setTimeout(() => startProduction(), 30000);
    }
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down production system...");
  process.exit(0);
});

startProduction();
