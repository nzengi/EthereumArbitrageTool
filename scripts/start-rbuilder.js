#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config(); // Load .env file

console.log("🔥 RBUILDER STARTUP SCRIPT");
console.log("=========================");

// Check if rbuilder binary exists
const rbuilderPath = path.join(__dirname, "../rbuilder");
const configPath = path.join(rbuilderPath, "config-mainnet.toml");
const binaryPath = path.join(rbuilderPath, "target/release/rbuilder");

if (!fs.existsSync(configPath)) {
  console.error("❌ config-mainnet.toml not found!");
  console.log("📍 Expected location:", configPath);
  process.exit(1);
}

console.log("✅ Configuration file found:", configPath);

// Environment variables check
const requiredEnvVars = [
  "COINBASE_SECRET_KEY",
  "RELAY_SECRET_KEY",
  "OPTIMISTIC_RELAY_SECRET_KEY",
  "CL_NODE_URL",
];

console.log("\n🔍 ENVIRONMENT VARIABLES CHECK:");
let allEnvVarsSet = true;
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(
      `✅ ${envVar}: SET (${process.env[envVar].substring(0, 10)}...)`
    );
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
    allEnvVarsSet = false;
  }
}

if (!allEnvVarsSet) {
  console.log("\n⚠️  Some environment variables are missing.");
  console.log("💡 Make sure your .env file contains all required variables.");
}

console.log("\n🚀 STARTING RBUILDER...");
console.log("📋 Config file:", configPath);
console.log(`🌐 RPC URL: ${process.env.CL_NODE_URL}`);

console.log("\n💡 RBUILDER FEATURES ENABLED:");
console.log("🔄 Parallel Block Building");
console.log("⚡ MEV-Gas-Price Sorting");
console.log("🎯 Max-Profit Ordering");
console.log("🔗 Flashbots Relay Integration");
console.log("📊 Telemetry Server (Port 6060/6061)");
console.log("🌱 Sparse Trie Implementation");

console.log("\n🔥 Ready for maximum MEV extraction!");

// Check if binary exists
if (!fs.existsSync(binaryPath)) {
  console.error("\n⚠️ rbuilder binary not found. Building first...");
  console.log("💡 Run this command manually:");
  console.log(`cd ${rbuilderPath} && cargo build --release`);
  process.exit(1);
}

// Execute rbuilder
const rbuilder = spawn(binaryPath, ["run", configPath], {
  cwd: rbuilderPath,
  stdio: "inherit",
  env: {
    ...process.env,
    RUST_LOG: "info,rbuilder=debug",
  },
});

rbuilder.on("error", (error) => {
  console.error("❌ Failed to start rbuilder:", error);
});

rbuilder.on("exit", (code) => {
  console.log(`\n🔚 rbuilder exited with code: ${code}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down rbuilder...");
  rbuilder.kill("SIGINT");
});
