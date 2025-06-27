const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function monitorProfits() {
  try {
    console.log("📊 GÜNLÜK KAR TAKİP SİSTEMİ\n");

    // Load deployment info
    const deploymentPath = path.join(
      __dirname,
      "..",
      "deployments",
      "mainnet-deployment.json"
    );
    if (!fs.existsSync(deploymentPath)) {
      throw new Error("❌ Deployment dosyası bulunamadı!");
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("📍 Contract:", deploymentInfo.contractAddress);
    console.log("💰 Fee Collector:", deploymentInfo.feeCollector);
    console.log("🎯 Hedef:", deploymentInfo.targetProfit, "\n");

    // Load trade logs
    const logPath = path.join(
      __dirname,
      "..",
      "logs",
      "successful-trades.json"
    );
    const logs = fs.existsSync(logPath)
      ? JSON.parse(fs.readFileSync(logPath, "utf8"))
      : [];

    if (logs.length === 0) {
      console.log("📈 Henüz başarılı işlem yok.");
      console.log(
        "💡 İlk arbitraj işleminizi çalıştırın: npm run execute:mainnet"
      );
      return;
    }

    // Calculate daily statistics
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const todayTrades = logs.filter(
      (log) => new Date(log.timestamp).toDateString() === today
    );
    const yesterdayTrades = logs.filter(
      (log) => new Date(log.timestamp).toDateString() === yesterday
    );
    const weekTrades = logs.filter(
      (log) => new Date(log.timestamp) >= thisWeek
    );
    const monthTrades = logs.filter(
      (log) => new Date(log.timestamp) >= thisMonth
    );

    const todayProfit = todayTrades.reduce(
      (sum, trade) => sum + trade.netProfit,
      0
    );
    const yesterdayProfit = yesterdayTrades.reduce(
      (sum, trade) => sum + trade.netProfit,
      0
    );
    const weekProfit = weekTrades.reduce(
      (sum, trade) => sum + trade.netProfit,
      0
    );
    const monthProfit = monthTrades.reduce(
      (sum, trade) => sum + trade.netProfit,
      0
    );

    console.log("📊 GÜNLÜK İSTATİSTİKLER:");
    console.log(
      `   🔥 Bugün: ${todayTrades.length} işlem, $${todayProfit.toFixed(2)} kar`
    );
    console.log(
      `   📅 Dün: ${yesterdayTrades.length} işlem, $${yesterdayProfit.toFixed(
        2
      )} kar`
    );
    console.log(
      `   📈 Bu Hafta: ${weekTrades.length} işlem, $${weekProfit.toFixed(
        2
      )} kar`
    );
    console.log(
      `   📊 Bu Ay: ${monthTrades.length} işlem, $${monthProfit.toFixed(
        2
      )} kar\n`
    );

    // Daily target progress
    const dailyTarget = 20; // $20 target
    const dailyProgress = (todayProfit / dailyTarget) * 100;

    console.log("🎯 GÜNLÜK HEDEF İLERLEMESİ:");
    console.log(`   💰 Hedef: $${dailyTarget}`);
    console.log(`   📈 Mevcut: $${todayProfit.toFixed(2)}`);
    console.log(`   📊 İlerleme: ${dailyProgress.toFixed(1)}%`);

    if (dailyProgress >= 100) {
      console.log("   🎉 ✅ Günlük hedef tamamlandı!");
    } else {
      const remaining = dailyTarget - todayProfit;
      console.log(`   🎯 Kalan: $${remaining.toFixed(2)}`);
    }

    console.log();

    // Performance metrics
    if (logs.length > 0) {
      const avgProfitPerTrade =
        logs.reduce((sum, trade) => sum + trade.netProfit, 0) / logs.length;
      const avgBorrowAmount =
        logs.reduce((sum, trade) => sum + parseFloat(trade.borrowAmount), 0) /
        logs.length;
      const successRate = 100; // All logged trades are successful

      console.log("📈 PERFORMANS METRİKLERİ:");
      console.log(
        `   💎 Ortalama İşlem Karı: $${avgProfitPerTrade.toFixed(2)}`
      );
      console.log(`   💸 Ortalama Borç: ${avgBorrowAmount.toFixed(2)} ETH`);
      console.log(`   ✅ Başarı Oranı: ${successRate}%`);
      console.log(`   📊 Toplam İşlem: ${logs.length}`);
      console.log();
    }

    // Recent trades
    console.log("🕐 SON İŞLEMLER:");
    const recentTrades = logs.slice(-5).reverse();

    recentTrades.forEach((trade, index) => {
      const date = new Date(trade.timestamp);
      const timeAgo = getTimeAgo(date);

      console.log(`   ${index + 1}. ${timeAgo}`);
      console.log(`      💰 Kar: $${trade.netProfit.toFixed(2)}`);
      console.log(`      💸 Borç: ${trade.borrowAmount} ETH`);
      console.log(`      📝 Hash: ${trade.txHash.substring(0, 10)}...`);
      console.log();
    });

    // Contract balance check
    const [signer] = await ethers.getSigners();
    const FlashLoanArbitrage = await ethers.getContractFactory(
      "FlashLoanArbitrageMainnet"
    );
    const contract = FlashLoanArbitrage.attach(deploymentInfo.contractAddress);

    try {
      const contractBalance = await ethers.provider.getBalance(
        deploymentInfo.contractAddress
      );
      console.log("💰 CONTRACT DURUMU:");
      console.log(`   📍 Adres: ${deploymentInfo.contractAddress}`);
      console.log(`   💎 Bakiye: ${ethers.formatEther(contractBalance)} ETH`);

      // Check fee collector balance
      const feeCollectorBalance = await ethers.provider.getBalance(
        deploymentInfo.feeCollector
      );
      console.log(
        `   🏦 Fee Collector: ${ethers.formatEther(feeCollectorBalance)} ETH`
      );
    } catch (error) {
      console.log("⚠️ Contract durumu kontrol edilemedi:", error.message);
    }

    // Recommendations
    console.log("\n💡 ÖNERİLER:");

    if (todayTrades.length === 0) {
      console.log(
        "   🔄 Bugün henüz işlem yok. Arbitraj fırsatlarını kontrol edin."
      );
    } else if (dailyProgress < 50) {
      console.log("   📈 Günlük hedefe ulaşmak için daha fazla işlem gerekli.");
    } else if (dailyProgress >= 100) {
      console.log(
        "   🎉 Harika! Günlük hedef tamamlandı. Yarın için hazırlanın."
      );
    }

    if (logs.length >= 7) {
      const weeklyAvg = weekProfit / 7;
      if (weeklyAvg < 15) {
        console.log("   ⚠️ Haftalık ortalama düşük. Strateji gözden geçirin.");
      } else {
        console.log("   ✅ Haftalık performans iyi görünüyor.");
      }
    }

    console.log("\n🔄 Otomatik güncelleme için: npm run monitor:mainnet");
  } catch (error) {
    console.error("❌ Monitoring hatası:", error.message);
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} dakika önce`;
  } else if (diffHours < 24) {
    return `${diffHours} saat önce`;
  } else {
    return `${diffDays} gün önce`;
  }
}

// Main function
async function main() {
  await monitorProfits();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Kritik hata:", error);
    process.exit(1);
  });
