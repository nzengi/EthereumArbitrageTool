const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying FlashLoanArbitrage contract...");

  // Get the contract factory
  const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");

  // Aave V3 Pool address on Sepolia testnet
  const AAVE_POOL_ADDRESS = "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A";
  const FEE_COLLECTOR_ADDRESS = "0x5Cd87281B8Aec278136f1bC41173fBC69b1c0670";

  // Deploy the contract with fee collector
  const flashLoanArbitrage = await FlashLoanArbitrage.deploy(AAVE_POOL_ADDRESS, FEE_COLLECTOR_ADDRESS);

  await flashLoanArbitrage.waitForDeployment();

  const contractAddress = await flashLoanArbitrage.getAddress();

  console.log("✅ FlashLoanArbitrage deployed to:", contractAddress);
  console.log("📋 Aave Pool Address:", AAVE_POOL_ADDRESS);
  console.log("💰 Fee Collector Address:", FEE_COLLECTOR_ADDRESS);

  // Verify contract on Etherscan (if API key is provided)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("🔍 Waiting for block confirmations...");
    await flashLoanArbitrage.deploymentTransaction().wait(5);

    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [AAVE_POOL_ADDRESS, FEE_COLLECTOR_ADDRESS],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("❌ Error verifying contract:", error.message);
    }
  }

  // Display important information
  console.log("\n📝 Contract Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Aave Pool: ${AAVE_POOL_ADDRESS}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${(await ethers.getSigners())[0].address}`);
  
  console.log("\n🔧 Next Steps:");
  console.log("1. Update your .env file with the contract address:");
  console.log(`   FLASHLOAN_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("2. Fund the contract with ETH for gas fees");
  console.log("3. Approve tokens for trading if needed");
  console.log("4. Start the Rust bot with the updated configuration");

  return contractAddress;
}

main()
  .then((contractAddress) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
