const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting direct deployment to Sepolia...");
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer address:", deployer.address);
    
    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH");
    
    // Contract deployment parameters
    const aavePoolAddress = "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A";
    const feeCollectorAddress = "0x5Cd87281B8Aec278136f1bC41173fBC69b1c0670";
    
    console.log("🏗️  Deploying FlashLoanArbitrage contract...");
    console.log("   Aave Pool:", aavePoolAddress);
    console.log("   Fee Collector:", feeCollectorAddress);
    
    // Get contract factory
    const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
    
    // Deploy with higher gas limit
    const contract = await FlashLoanArbitrage.deploy(
        aavePoolAddress,
        feeCollectorAddress,
        {
            gasLimit: 3000000,
            gasPrice: ethers.parseUnits("20", "gwei")
        }
    );
    
    console.log("⏳ Waiting for deployment confirmation...");
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    
    console.log("\n✅ Contract deployed successfully!");
    console.log("📍 Contract Address:", contractAddress);
    console.log("🌐 Network: Sepolia Testnet");
    console.log("🔍 Etherscan URL: https://sepolia.etherscan.io/address/" + contractAddress);
    
    // Update environment file
    console.log("\n📝 Updating .env file...");
    const fs = require('fs');
    const envPath = './.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update the contract address in .env
    if (envContent.includes('FLASH_LOAN_CONTRACT_ADDRESS=')) {
        envContent = envContent.replace(
            /FLASH_LOAN_CONTRACT_ADDRESS=.*/,
            `FLASH_LOAN_CONTRACT_ADDRESS=${contractAddress}`
        );
    } else {
        envContent += `\nFLASH_LOAN_CONTRACT_ADDRESS=${contractAddress}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Environment file updated");
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("💡 Next steps:");
    console.log("   1. Fund the contract with ETH for gas fees");
    console.log("   2. Start the Rust arbitrage bot");
    console.log("   3. Monitor for profitable opportunities");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });