const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Contract Deploy Ediliyor...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploy eden hesap:", deployer.address);

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Hesap bakiyesi:", ethers.formatEther(balance), "ETH");

  // Fee collector address from .env
  const feeCollectorAddress =
    process.env.FEE_COLLECTOR_ADDRESS || deployer.address;
  console.log("🏦 Fee collector adresi:", feeCollectorAddress);

  // Get contract factory
  console.log("📦 Contract factory alınıyor...");
  const FlashLoanArbitrage = await ethers.getContractFactory(
    "FlashLoanArbitrageMainnet"
  );

  // Deploy contract
  console.log("🚀 Contract deploy ediliyor...");
  const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
    feeCollectorAddress
  );

  console.log("⏳ Deploy transaction bekleniyor...");
  await flashLoanArbitrage.waitForDeployment();

  const contractAddress = await flashLoanArbitrage.getAddress();

  console.log("\n" + "=".repeat(50));
  console.log("🎉 CONTRACT BAŞARIYLA DEPLOY EDİLDİ!");
  console.log("=".repeat(50));
  console.log("📍 Contract Adresi:", contractAddress);
  console.log("👤 Owner:", deployer.address);
  console.log("🏦 Fee Collector:", feeCollectorAddress);

  console.log("\n📋 Contract başarıyla deploy edildi!");
  console.log("🔗 Contract Address:", contractAddress);

  return {
    contract: flashLoanArbitrage,
    address: contractAddress,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy başarısız:");
    console.error(error);
    process.exit(1);
  });
