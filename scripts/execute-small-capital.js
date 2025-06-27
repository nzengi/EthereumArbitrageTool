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

// Small capital strategy parameters
const STRATEGY_CONFIG = {
  // Target 1 ETH borrows for low fees
  borrowAmounts: {
    WETH: ethers.parseEther("1.0"), // 1 ETH
    USDC: ethers.parseUnits("2400", 6), // $2400 (≈1 ETH)
    DAI: ethers.parseEther("2400"), // $2400 (≈1 ETH)
  },

  // Minimum profit thresholds (after fees)
  minProfitThresholds: {
    WETH: ethers.parseEther("0.005"), // 0.005 ETH ≈ $12
    USDC: ethers.parseUnits("12", 6), // $12
    DAI: ethers.parseEther("12"), // $12
  },

  // Fee calculations (Aave V3: 0.09%, Our fee: 0.1% of profit)
  feeCalculations: {
    aaveFlashLoanFee: 0.0009, // 0.09%
    ourFeeRate: 0.001, // 0.1% of profit
    gasEstimate: ethers.parseEther("0.003"), // ~$7 gas
  },

  // Daily profit targets
  dailyTargets: {
    targetDailyProfit: 20, // $20 per day
    tradesPerDay: 2, // 2-3 trades expected
    profitPerTrade: 10, // $10 average per trade
  },
};

async function fetchCurrentPrices() {
  try {
    console.log("📊 Güncel fiyatları alınıyor...");

    const response = await axios.get(
      "https://api.binance.com/api/v3/ticker/price",
      {
        params: { symbols: '["ETHUSDT","BTCUSDT"]' },
      }
    );

    const prices = {};
    response.data.forEach((ticker) => {
      if (ticker.symbol === "ETHUSDT") {
        prices.ETH = parseFloat(ticker.price);
      }
    });

    console.log(`💰 ETH Fiyatı: $${prices.ETH}`);
    return prices;
  } catch (error) {
    console.log("⚠️ Fiyat API'si başarısız, varsayılan fiyat kullanılıyor");
    return { ETH: 2400 }; // Fallback price
  }
}

async function calculateArbitrageOpportunity(contract, tokenA, tokenB, amount) {
  try {
    console.log(
      `🔍 ${ethers.formatEther(
        amount
      )} ETH için arbitraj fırsatı kontrol ediliyor...`
    );

    // Get quotes from both DEXes
    const [profit, profitable] = await contract.calculateArbitrageProfit(
      tokenA,
      tokenB,
      amount,
      MAINNET_ADDRESSES.UNISWAP_ROUTER,
      MAINNET_ADDRESSES.SUSHISWAP_ROUTER
    );

    const profitInETH = ethers.formatEther(profit);
    const profitInUSD = parseFloat(profitInETH) * 2400; // Approximate USD

    console.log(
      `💹 Potansiyel Kar: ${profitInETH} ETH (~$${profitInUSD.toFixed(2)})`
    );
    console.log(`✅ Karlı mı: ${profitable ? "EVET" : "HAYIR"}`);

    return {
      profit: profit,
      profitInETH: parseFloat(profitInETH),
      profitInUSD: profitInUSD,
      profitable: profitable,
      borrowAmount: amount,
    };
  } catch (error) {
    console.log("❌ Arbitraj hesaplama hatası:", error.message);
    return null;
  }
}

async function executeSmallCapitalArbitrage() {
  try {
    console.log("🚀 KÜÇÜK SERMAYELİ ARBİTRAJ BAŞLATILIYOR...\n");

    // Load deployment info
    const deploymentPath = path.join(
      __dirname,
      "..",
      "deployments",
      "mainnet-deployment.json"
    );
    if (!fs.existsSync(deploymentPath)) {
      throw new Error("❌ Deployment dosyası bulunamadı! Önce deploy yapın.");
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const contractAddress = deploymentInfo.contractAddress;

    console.log("📍 Contract Adresi:", contractAddress);
    console.log("💰 Fee Collector:", deploymentInfo.feeCollector);
    console.log("🎯 Strateji:", deploymentInfo.strategy, "\n");

    // Connect to contract
    const [signer] = await ethers.getSigners();
    console.log("👤 İşlem Hesabı:", signer.address);

    const balance = await ethers.provider.getBalance(signer.address);
    console.log("💰 ETH Bakiye:", ethers.formatEther(balance), "ETH\n");

    if (balance < ethers.parseEther("0.01")) {
      throw new Error("❌ Yetersiz ETH! En az 0.01 ETH gerekli.");
    }

    // Get contract instance
    const FlashLoanArbitrage = await ethers.getContractFactory(
      "FlashLoanArbitrageMainnet"
    );
    const contract = FlashLoanArbitrage.attach(contractAddress);

    // Fetch current prices
    const prices = await fetchCurrentPrices();

    console.log("📊 STRATEJİ PARAMETRELERİ:");
    console.log(
      `   💸 Hedef Borç: ${ethers.formatEther(
        STRATEGY_CONFIG.borrowAmounts.WETH
      )} ETH`
    );
    console.log(
      `   🎯 Min Kar: ${ethers.formatEther(
        STRATEGY_CONFIG.minProfitThresholds.WETH
      )} ETH (~$12)`
    );
    console.log(
      `   📈 Günlük Hedef: $${STRATEGY_CONFIG.dailyTargets.targetDailyProfit}`
    );
    console.log(
      `   🔄 Günlük İşlem: ${STRATEGY_CONFIG.dailyTargets.tradesPerDay} adet\n`
    );

    // Check arbitrage opportunity
    const opportunity = await calculateArbitrageOpportunity(
      contract,
      MAINNET_ADDRESSES.WETH,
      MAINNET_ADDRESSES.USDC,
      STRATEGY_CONFIG.borrowAmounts.WETH
    );

    if (!opportunity || !opportunity.profitable) {
      console.log("❌ Şu anda karlı arbitraj fırsatı yok.");
      console.log(
        "💡 Daha sonra tekrar deneyin veya farklı token çiftleri kontrol edin."
      );
      return;
    }

    console.log("\n🎉 KARLI ARBITRAJ FIRSATI BULUNDU!");
    console.log(
      `💰 Beklenen Kar: ${opportunity.profitInETH.toFixed(
        6
      )} ETH (~$${opportunity.profitInUSD.toFixed(2)})`
    );

    // Calculate fees
    const borrowAmountInETH = parseFloat(
      ethers.formatEther(opportunity.borrowAmount)
    );
    const aaveFee =
      borrowAmountInETH * STRATEGY_CONFIG.feeCalculations.aaveFlashLoanFee;
    const ourFee =
      opportunity.profitInUSD * STRATEGY_CONFIG.feeCalculations.ourFeeRate;
    const gasCostUSD =
      parseFloat(
        ethers.formatEther(STRATEGY_CONFIG.feeCalculations.gasEstimate)
      ) * prices.ETH;

    console.log("\n💸 FEE HESAPLAMALARI:");
    console.log(
      `   🏦 Aave Flash Loan Fee: ${aaveFee.toFixed(4)} ETH (~$${(
        aaveFee * prices.ETH
      ).toFixed(2)})`
    );
    console.log(`   🏠 Bizim Fee (0.1% kar): ~$${ourFee.toFixed(2)}`);
    console.log(`   ⛽ Gas Maliyeti: ~$${gasCostUSD.toFixed(2)}`);

    const netProfit =
      opportunity.profitInUSD - aaveFee * prices.ETH - ourFee - gasCostUSD;
    console.log(`   💎 Net Kar: ~$${netProfit.toFixed(2)}\n`);

    if (netProfit < 5) {
      console.log("⚠️ Net kar çok düşük (<$5). İşlem iptal edildi.");
      return;
    }

    // Prepare arbitrage parameters
    const arbitrageParams = {
      tokenA: MAINNET_ADDRESSES.WETH,
      tokenB: MAINNET_ADDRESSES.USDC,
      amountIn: opportunity.borrowAmount,
      router1: MAINNET_ADDRESSES.UNISWAP_ROUTER,
      router2: MAINNET_ADDRESSES.SUSHISWAP_ROUTER,
      minProfitWei: STRATEGY_CONFIG.minProfitThresholds.WETH,
    };

    // Encode parameters
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

    console.log("🚀 ARBITRAJ İŞLEMİ BAŞLATILIYOR...");
    console.log("⏳ İşlem onayını bekleyin...\n");

    // Execute arbitrage
    const tx = await contract.startArbitrage(
      MAINNET_ADDRESSES.WETH,
      opportunity.borrowAmount,
      encodedParams,
      {
        gasLimit: 500000,
        gasPrice: ethers.parseUnits("30", "gwei"),
      }
    );

    console.log("📝 İşlem Hash:", tx.hash);
    console.log("⏳ İşlem onayı bekleniyor...");

    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log("✅ ARBİTRAJ İŞLEMİ BAŞARILI!");
      console.log(`📊 Gas Kullanıldı: ${receipt.gasUsed.toString()}`);
      console.log(`💰 Beklenen Net Kar: ~$${netProfit.toFixed(2)}`);

      // Log successful trade
      const tradeLog = {
        timestamp: new Date().toISOString(),
        txHash: tx.hash,
        borrowAmount: ethers.formatEther(opportunity.borrowAmount),
        expectedProfit: opportunity.profitInUSD,
        netProfit: netProfit,
        gasUsed: receipt.gasUsed.toString(),
        strategy: "small-capital-1eth",
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

      console.log("\n🎯 GÜNLÜK HEDEF İLERLEMESİ:");
      const todayTrades = logs.filter(
        (log) =>
          new Date(log.timestamp).toDateString() === new Date().toDateString()
      );
      const todayProfit = todayTrades.reduce(
        (sum, trade) => sum + trade.netProfit,
        0
      );

      console.log(
        `   📈 Bugünkü Kar: $${todayProfit.toFixed(2)} / $${
          STRATEGY_CONFIG.dailyTargets.targetDailyProfit
        }`
      );
      console.log(
        `   🔄 Bugünkü İşlem: ${todayTrades.length} / ${STRATEGY_CONFIG.dailyTargets.tradesPerDay}`
      );

      if (todayProfit >= STRATEGY_CONFIG.dailyTargets.targetDailyProfit) {
        console.log("🎉 Günlük kar hedefine ulaşıldı!");
      }
    } else {
      console.log("❌ İşlem başarısız oldu!");
      console.log(
        "💡 Sebep: Muhtemelen karlı arbitraj fırsatı kalmadı veya slippage çok yüksek"
      );
    }
  } catch (error) {
    console.error("❌ Arbitraj hatası:", error.message);

    if (error.message.includes("Profit below minimum threshold")) {
      console.log("💡 Kar minimum eşiğin altında. Daha büyük fırsat bekleyin.");
    } else if (error.message.includes("Not enough balance")) {
      console.log("💡 Arbitraj karlı değil. Fiyat farkı yetersiz.");
    }
  }
}

// Ana fonksiyon
async function main() {
  await executeSmallCapitalArbitrage();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Kritik hata:", error);
    process.exit(1);
  });
