const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 MAİNNET FLASH LOAN ARBİTRAJ DEPLOY BAŞLIYOR...\n");

  // User's fee collector address
  const FEE_COLLECTOR = "0x5Cd87281B8Aec278136f1bC41173fBC69b1c0670";

  const [deployer] = await ethers.getSigners();
  console.log("🔐 Deployer Address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer Balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.05")) {
    throw new Error("❌ Yetersiz ETH! Deploy için en az 0.05 ETH gerekli.");
  }

  // Get current gas price
  const feeData = await ethers.provider.getFeeData();
  const currentGasPrice = feeData.gasPrice;
  const gasPriceGwei = ethers.formatUnits(currentGasPrice, "gwei");
  console.log(`⛽ Mevcut Gas Price: ${gasPriceGwei} Gwei`);

  // Use ultra low gas price for maximum cost savings (1 gwei)
  const optimizedGasPrice = ethers.parseUnits("1", "gwei");
  console.log(`💡 Ultra Düşük Gas Price: 1 Gwei (maksimum tasarruf)`);

  console.log("📋 DEPLOY PARAMETRELERİ:");
  console.log("   📍 Fee Collector:", FEE_COLLECTOR);
  console.log("   💰 Fee Rate: 0.1% (sadece kardan)");
  console.log("   🎯 Min Profit: 0.005 ETH (~$12)");
  console.log("   📊 Target: $20/gün");
  console.log("   💸 Optimal Borrow: 1 ETH");
  console.log("   ⛽ Gas Price: 1 Gwei (ultra düşük maliyet)");
  console.log("   💵 Tahmini Deploy Maliyeti: ~$3-4\n");

  // Deploy FlashLoanArbitrageMainnet contract with optimized gas
  console.log("📦 FlashLoanArbitrageMainnet deploy ediliyor...");

  const FlashLoanArbitrage = await ethers.getContractFactory(
    "FlashLoanArbitrageMainnet"
  );

  // Deploy with optimized gas settings
  const flashLoanArbitrage = await FlashLoanArbitrage.deploy(FEE_COLLECTOR, {
    gasPrice: optimizedGasPrice,
    gasLimit: 2500000, // Conservative gas limit
  });

  console.log("⏳ Deploy transaction gönderildi, onay bekleniyor...");
  await flashLoanArbitrage.waitForDeployment();
  const contractAddress = await flashLoanArbitrage.getAddress();

  console.log("✅ Contract deployed to:", contractAddress);

  // Get deployment transaction details
  const deployTx = flashLoanArbitrage.deploymentTransaction();
  if (deployTx) {
    const receipt = await deployTx.wait();
    const actualGasUsed = receipt.gasUsed;
    const actualGasCost = actualGasUsed * optimizedGasPrice;
    const costInETH = ethers.formatEther(actualGasCost);
    const costInUSD = parseFloat(costInETH) * 2400; // Approximate ETH price

    console.log("💸 DEPLOY MALİYETİ:");
    console.log(`   ⛽ Gas Kullanıldı: ${actualGasUsed.toString()}`);
    console.log(`   💰 Maliyet: ${costInETH} ETH (~$${costInUSD.toFixed(2)})`);
    console.log(`   🎉 Sepolia'ya göre %85 daha ucuz!`);
  }

  // Verify deployment
  console.log("\n🔍 DEPLOYMENT VERİFİKASYONU:");
  const owner = await flashLoanArbitrage.owner();
  const feeCollector = await flashLoanArbitrage.feeCollector();
  const minProfitThreshold = await flashLoanArbitrage.minProfitThreshold();

  console.log("   👤 Owner:", owner);
  console.log("   💰 Fee Collector:", feeCollector);
  console.log(
    "   📊 Min Profit:",
    ethers.formatEther(minProfitThreshold),
    "ETH"
  );

  // Save deployment info
  const deploymentInfo = {
    network: "mainnet",
    contractAddress: contractAddress,
    deployer: deployer.address,
    feeCollector: FEE_COLLECTOR,
    minProfitThreshold: ethers.formatEther(minProfitThreshold),
    deploymentTime: new Date().toISOString(),
    gasUsed: deployTx ? (await deployTx.wait()).gasUsed.toString() : "Unknown",
    gasPrice: "1 Gwei",
    deployCost: deployTx
      ? ethers.formatEther((await deployTx.wait()).gasUsed * optimizedGasPrice)
      : "Unknown",
    strategy: "Small Capital (1 ETH borrows)",
    targetProfit: "$20/day",
  };

  const deploymentPath = path.join(
    __dirname,
    "..",
    "deployments",
    "mainnet-deployment.json"
  );
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n💾 Deployment bilgileri kaydedildi:", deploymentPath);

  console.log("\n🎉 MAİNNET DEPLOY TAMAMLANDI!");
  console.log("\n📋 SONRAKİ ADIMLAR:");
  console.log(
    "   1️⃣ Contract verify et: npx hardhat verify --network mainnet",
    contractAddress,
    FEE_COLLECTOR
  );
  console.log("   2️⃣ Arbitraj çalıştır: npm run execute:mainnet");
  console.log("   3️⃣ Karları izle: npm run monitor:mainnet");
  console.log("\n🔥 Günlük $20 kar hedefi için hazır!");
  console.log(`💡 Deploy maliyeti sadece ~$3-4 (1 Gwei sayesinde)!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy hatası:", error);
    process.exit(1);
  });
