const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Mainnet addresses
const MAINNET_ADDRESSES = {
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  UNISWAP_ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  SUSHISWAP_ROUTER: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
};

// Strategy configuration
const STRATEGY_CONFIG = {
  borrowAmounts: {
    WETH: ethers.parseEther("1.0"), // 1 ETH
  },
  minProfitThresholds: {
    WETH: ethers.parseEther("0.005"), // 0.005 ETH ≈ $12
  },
  feeCalculations: {
    aaveFlashLoanFee: 0.0009, // 0.09%
    ourFeeRate: 0.001, // 0.1% of profit
    gasEstimate: ethers.parseEther("0.001"), // ~$2.4 gas (ultra düşük)
  },
  dailyTargets: {
    targetDailyProfit: 20, // $20 per day
    maxTradesPerDay: 5, // Maximum 5 trades per day
  },
  timing: {
    checkInterval: 300000, // 5 minutes = 300,000ms
    maxRunTime: 24 * 60 * 60 * 1000, // 24 hours
  },
};

let isRunning = false;
let totalChecks = 0;
let successfulTrades = 0;
let totalProfit = 0;

async function fetchCurrentPrices() {
  try {
    const response = await axios.get(
      "https://api.binance.com/api/v3/ticker/price",
      {
        params: { symbols: '["ETHUSDT"]' },
        timeout: 5000,
      }
    );

    const ethPrice = parseFloat(response.data[0].price);
    return { ETH: ethPrice };
  } catch (error) {
    console.log("⚠️ Fiyat API'si başarısız, varsayılan fiyat kullanılıyor");
    return { ETH: 2400 };
  }
}

async function checkDailyLimits() {
  const logPath = path.join(__dirname, "..", "logs", "successful-trades.json");
  if (!fs.existsSync(logPath)) return { trades: 0, profit: 0, canTrade: true };

  const logs = JSON.parse(fs.readFileSync(logPath, "utf8"));
  const today = new Date().toDateString();
  const todayTrades = logs.filter(
    (log) => new Date(log.timestamp).toDateString() === today
  );

  const todayProfit = todayTrades.reduce(
    (sum, trade) => sum + trade.netProfit,
    0
  );
  const canTrade =
    todayTrades.length < STRATEGY_CONFIG.dailyTargets.maxTradesPerDay &&
    todayProfit < STRATEGY_CONFIG.dailyTargets.targetDailyProfit;

  return {
    trades: todayTrades.length,
    profit: todayProfit,
    canTrade: canTrade,
  };
}

async function calculateArbitrageOpportunity(contract, prices) {
  try {
    const [profit, profitable] = await contract.calculateArbitrageProfit(
      MAINNET_ADDRESSES.WETH,
      MAINNET_ADDRESSES.USDC,
      STRATEGY_CONFIG.borrowAmounts.WETH,
      MAINNET_ADDRESSES.UNISWAP_ROUTER,
      MAINNET_ADDRESSES.SUSHISWAP_ROUTER
    );

    const profitInETH = parseFloat(ethers.formatEther(profit));
    const profitInUSD = profitInETH * prices.ETH;

    // Calculate all fees
    const borrowAmountInETH = 1.0; // 1 ETH
    const aaveFee =
      borrowAmountInETH * STRATEGY_CONFIG.feeCalculations.aaveFlashLoanFee;
    const ourFee = profitInUSD * STRATEGY_CONFIG.feeCalculations.ourFeeRate;
    const gasCostUSD =
      parseFloat(
        ethers.formatEther(STRATEGY_CONFIG.feeCalculations.gasEstimate)
      ) * prices.ETH;

    const netProfitUSD =
      profitInUSD - aaveFee * prices.ETH - ourFee - gasCostUSD;

    return {
      profitable: profitable && netProfitUSD >= 5, // Minimum $5 net profit
      grossProfitUSD: profitInUSD,
      netProfitUSD: netProfitUSD,
      profitInETH: profitInETH,
      fees: {
        aave: aaveFee * prices.ETH,
        our: ourFee,
        gas: gasCostUSD,
      },
    };
  } catch (error) {
    console.log(`❌ Arbitraj hesaplama hatası: ${error.message}`);
    return { profitable: false, netProfitUSD: 0 };
  }
}

async function executeArbitrage(contract, opportunity, prices) {
  try {
    console.log("\n🚀 ARBITRAJ İŞLEMİ BAŞLATILIYOR...");
    console.log(`💰 Beklenen Net Kar: $${opportunity.netProfitUSD.toFixed(2)}`);

    const arbitrageParams = {
      tokenA: MAINNET_ADDRESSES.WETH,
      tokenB: MAINNET_ADDRESSES.USDC,
      amountIn: STRATEGY_CONFIG.borrowAmounts.WETH,
      router1: MAINNET_ADDRESSES.UNISWAP_ROUTER,
      router2: MAINNET_ADDRESSES.SUSHISWAP_ROUTER,
      minProfitWei: STRATEGY_CONFIG.minProfitThresholds.WETH,
    };

    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,address,uint256,address,address,uint256)"],
      [
        [
          arbitrageParams.tokenA,
          arbitrageParams.tokenB,
          arbitrageParams.amountIn,
          arbitrageParams.router1,
          arbitrageParams.router2,
          arbitrageParams.minProfitWei,
        ],
      ]
    );

    // Get current gas price and optimize for ultra-low cost
    const feeData = await ethers.provider.getFeeData();
    const currentGasPrice = feeData.gasPrice;
    const gasPriceGwei = parseFloat(
      ethers.formatUnits(currentGasPrice, "gwei")
    );

    // Use ultra-low gas price but cap at 2 gwei for cost control
    const optimizedGasPrice =
      gasPriceGwei > 2 ? ethers.parseUnits("2", "gwei") : currentGasPrice;

    console.log(
      `⛽ Gas Price: ${ethers.formatUnits(
        optimizedGasPrice,
        "gwei"
      )} Gwei (ultra düşük)`
    );

    const tx = await contract.startArbitrage(
      MAINNET_ADDRESSES.WETH,
      STRATEGY_CONFIG.borrowAmounts.WETH,
      encodedParams,
      {
        gasLimit: 500000,
        gasPrice: optimizedGasPrice,
      }
    );

    console.log(`📝 İşlem Hash: ${tx.hash}`);
    console.log("⏳ İşlem onayı bekleniyor...");

    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log("✅ ARBİTRAJ İŞLEMİ BAŞARILI!");

      // Log successful trade
      const tradeLog = {
        timestamp: new Date().toISOString(),
        txHash: tx.hash,
        borrowAmount: "1.0",
        expectedProfit: opportunity.grossProfitUSD,
        netProfit: opportunity.netProfitUSD,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: ethers.formatUnits(optimizedGasPrice, "gwei"),
        strategy: "continuous-small-capital",
        ethPrice: prices.ETH,
      };

      const logPath = path.join(
        __dirname,
        "..",
        "logs",
        "successful-trades.json"
      );
      const logs = fs.existsSync(logPath)
        ? JSON.parse(fs.readFileSync(logPath, "utf8"))
        : [];
      logs.push(tradeLog);

      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));

      successfulTrades++;
      totalProfit += opportunity.netProfitUSD;

      return true;
    } else {
      console.log("❌ İşlem başarısız oldu!");
      return false;
    }
  } catch (error) {
    console.error(`❌ Arbitraj execution hatası: ${error.message}`);
    return false;
  }
}

async function monitoringCycle() {
  try {
    totalChecks++;
    const timestamp = new Date().toLocaleString("tr-TR");
    console.log(
      `\n🔍 [${timestamp}] Arbitraj fırsatı kontrol ediliyor... (${totalChecks}. kontrol)`
    );

    // Check daily limits
    const dailyStats = await checkDailyLimits();
    console.log(
      `📊 Bugün: ${dailyStats.trades} işlem, $${dailyStats.profit.toFixed(
        2
      )} kar`
    );

    if (!dailyStats.canTrade) {
      console.log(
        "🎯 Günlük limit doldu veya hedef tamamlandı. Yarın için bekleniyor..."
      );
      return;
    }

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
    const contractAddress = deploymentInfo.contractAddress;

    // Connect to contract
    const [signer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(signer.address);

    if (balance < ethers.parseEther("0.01")) {
      console.log("❌ Yetersiz ETH bakiye! En az 0.01 ETH gerekli.");
      return;
    }

    const FlashLoanArbitrage = await ethers.getContractFactory(
      "FlashLoanArbitrageMainnet"
    );
    const contract = FlashLoanArbitrage.attach(contractAddress);

    // Fetch current prices
    const prices = await fetchCurrentPrices();
    console.log(`💰 ETH Fiyatı: $${prices.ETH}`);

    // Check arbitrage opportunity
    const opportunity = await calculateArbitrageOpportunity(contract, prices);

    if (opportunity.profitable) {
      console.log("🎉 KARLI ARBITRAJ FIRSATI BULUNDU!");
      console.log(`💹 Brüt Kar: $${opportunity.grossProfitUSD.toFixed(2)}`);
      console.log(`💎 Net Kar: $${opportunity.netProfitUSD.toFixed(2)}`);
      console.log(
        `💸 Fees: Aave $${opportunity.fees.aave.toFixed(
          2
        )}, Our $${opportunity.fees.our.toFixed(
          2
        )}, Gas $${opportunity.fees.gas.toFixed(2)}`
      );

      // Execute arbitrage
      const success = await executeArbitrage(contract, opportunity, prices);

      if (success) {
        console.log(`🎯 Toplam başarılı işlem: ${successfulTrades}`);
        console.log(`💰 Toplam kar: $${totalProfit.toFixed(2)}`);
      }
    } else {
      console.log("😴 Karlı arbitraj fırsatı yok. Beklemeye devam...");
      if (opportunity.netProfitUSD > 0) {
        console.log(
          `💡 Net kar çok düşük: $${opportunity.netProfitUSD.toFixed(
            2
          )} (min $5 gerekli)`
        );
      }
    }
  } catch (error) {
    console.error(`❌ Monitoring cycle hatası: ${error.message}`);
  }
}

async function startContinuousMonitoring() {
  console.log("🤖 SÜREKLİ ARBİTRAJ MONİTÖRİNG BAŞLATILIYOR...");
  console.log(
    `⏰ Kontrol Aralığı: ${STRATEGY_CONFIG.timing.checkInterval / 1000} saniye`
  );
  console.log(
    `🎯 Günlük Hedef: $${STRATEGY_CONFIG.dailyTargets.targetDailyProfit}`
  );
  console.log(
    `🔄 Max Günlük İşlem: ${STRATEGY_CONFIG.dailyTargets.maxTradesPerDay}`
  );
  console.log(`💸 Min Net Kar: $5`);
  console.log(
    "📊 Bot otomatik olarak karlı fırsatları tespit edip işlem yapacak...\n"
  );

  isRunning = true;
  const startTime = Date.now();

  // Initial check
  await monitoringCycle();

  // Set up interval for continuous monitoring
  const interval = setInterval(async () => {
    if (!isRunning) {
      clearInterval(interval);
      return;
    }

    // Check if max run time reached
    if (Date.now() - startTime > STRATEGY_CONFIG.timing.maxRunTime) {
      console.log("⏰ 24 saatlik çalışma süresi doldu. Bot durduruluyor...");
      stopMonitoring();
      return;
    }

    await monitoringCycle();
  }, STRATEGY_CONFIG.timing.checkInterval);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Bot durduruluyor...");
    stopMonitoring();
  });

  process.on("SIGTERM", () => {
    console.log("\n🛑 Bot sonlandırılıyor...");
    stopMonitoring();
  });

  console.log(
    "✅ Sürekli monitoring başlatıldı. Durdurmak için Ctrl+C kullanın.\n"
  );
}

function stopMonitoring() {
  isRunning = false;
  console.log("\n📊 MONITORING İSTATİSTİKLERİ:");
  console.log(`🔍 Toplam Kontrol: ${totalChecks}`);
  console.log(`✅ Başarılı İşlem: ${successfulTrades}`);
  console.log(`💰 Toplam Kar: $${totalProfit.toFixed(2)}`);
  console.log(
    `📈 Başarı Oranı: ${
      totalChecks > 0 ? ((successfulTrades / totalChecks) * 100).toFixed(1) : 0
    }%`
  );
  console.log("\n🛑 Bot durduruldu.");
  process.exit(0);
}

// Main function
async function main() {
  await startContinuousMonitoring();
}

main().catch((error) => {
  console.error("❌ Kritik hata:", error);
  process.exit(1);
});
