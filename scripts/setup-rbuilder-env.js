#!/usr/bin/env node

const { ethers } = require("ethers");
const crypto = require("crypto");

console.log("🔧 RBUILDER ENVIRONMENT SETUP HELPER");
console.log("=====================================\n");

// Generate builder wallet
console.log("1. 🏦 BUILDER WALLET GENERATION:");
const wallet = ethers.Wallet.createRandom();
console.log(`Private Key: ${wallet.privateKey}`);
console.log(`Address: ${wallet.address}`);
console.log(`⚠️  Save these credentials securely!\n`);

// BLS Key simulation (for educational purposes)
console.log("2. 🔗 RELAY KEYS (BLS Keys):");
const relayKey = crypto.randomBytes(32).toString("hex");
const optimisticKey = crypto.randomBytes(32).toString("hex");
console.log(`RELAY_SECRET_KEY: 0x${relayKey}`);
console.log(`OPTIMISTIC_RELAY_SECRET_KEY: 0x${optimisticKey}`);
console.log(`⚠️  These are mock keys for testing only!\n`);

// Consensus Layer Options
console.log("3. 🌐 CONSENSUS LAYER OPTIONS:");
console.log("Choose one of these CL_NODE_URL options:");
console.log("   • Local Lighthouse: http://localhost:3500");
console.log("   • Local Prysm: http://localhost:3500");
console.log("   • Infura Beacon: https://mainnet.infura.io/v3/YOUR_PROJECT_ID");
console.log(
  "   • Alchemy Consensus: https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
);
console.log(
  "   • QuickNode: wss://YOUR_ENDPOINT.discover.quiknode.io/YOUR_KEY\n"
);

// Create .env template
console.log("4. 📄 ENVIRONMENT FILE TEMPLATE:");
console.log("Add these to your .env file:");
console.log("=".repeat(50));
console.log(
  `# rbuilder Configuration (Generated: ${new Date().toISOString()})`
);
console.log(`COINBASE_SECRET_KEY=${wallet.privateKey}`);
console.log(`RELAY_SECRET_KEY=0x${relayKey}`);
console.log(`OPTIMISTIC_RELAY_SECRET_KEY=0x${optimisticKey}`);
console.log(`CL_NODE_URL=http://localhost:3500`);
console.log("=".repeat(50));

// Instructions
console.log("\n5. 📋 NEXT STEPS:");
console.log("   1. Copy the environment variables to your .env file");
console.log("   2. Choose appropriate CL_NODE_URL for your setup");
console.log("   3. For production: Generate real BLS keys");
console.log("   4. For production: Set up local consensus node");
console.log("   5. Build rbuilder: cd rbuilder && make build");
console.log("   6. Start rbuilder: npm run rbuilder:start");

console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
console.log("   • These are test keys for development only");
console.log("   • Never share private keys publicly");
console.log("   • Use real BLS keys for mainnet");
console.log("   • Set up proper consensus layer infrastructure");

console.log("\n🔥 Ready to start building with rbuilder!");
