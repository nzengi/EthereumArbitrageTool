const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// 🚀 ULTRA-OPTIMIZED ARBITRAGE BOT v2.0
// Built for speed, precision, and maximum profitability

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                🚀 ULTRA ARBITRAGE BOT v2.0 🚀                ║
║              Engineered for Maximum Profit                   ║
╚══════════════════════════════════════════════════════════════╝
`);

// ═══════════════════════════════════════════════════════════════
// 📊 OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  // 🎯 Mainnet Addresses
  ADDRESSES: {
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    UNISWAP_ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    SUSHISWAP_ROUTER: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  },

  // 💰 Trading Strategy - Aggressive but Safe
  STRATEGY: {
    baseBorrowETH: 0.5, // Start with 0.5 ETH
    maxBorrowETH: 2.0, // Max 2 ETH
    scaleFactor: 1.3, // Scale up 30% after success
    minProfitPercent: 0.05, // 0.05% minimum (gas çok düşük!)
    targetProfitPercent: 0.2, // 0.20% target
    minNetProfitUSD: 1.0, // Min $1 net profit (gas düşük!)
    maxGasPriceGwei: 5, // Max 5 gwei (gas çok düşük!)
    maxSlippagePercent: 1.5, // 1.5% max slippage
  },

  // ⚡ Timing - ULTRA FAST
  TIMING: {
    scanInterval: 10000, // 10 seconds (super fast!)
    priceUpdate: 8000, // 8 seconds price updates
    executionTimeout: 25000, // 25 seconds max execution
    maxRuntime: 24 * 3600 * 1000, // 24 hours
  },

  // 🎯 Daily Targets
  TARGETS: {
    dailyProfitUSD: 40, // $40 daily target
    maxDailyTrades: 20, // Max 20 trades
    maxFailures: 3, // Stop after 3 consecutive failures
    emergencyStopLoss: 15, // Emergency stop at $15 loss
  },

  // 🔄 Token Pairs - Both directions
  PAIRS: [
    { base: "WETH", quote: "USDC", name: "WETH/USDC" },
    { base: "WETH", quote: "USDT", name: "WETH/USDT" },
    { base: "WETH", quote: "DAI", name: "WETH/DAI" },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🌐 BOT STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const BotState = {
  running: false,
  totalScans: 0,
  successTrades: 0,
  failedTrades: 0,
  totalProfit: 0,
  totalLoss: 0,
  currentBorrow: ethers.parseEther(CONFIG.STRATEGY.baseBorrowETH.toString()),
  consecutiveFailures: 0,
  ethPrice: 2400,
  contract: null,
  signer: null,
  startTime: null,
  lastPriceData: null, // Cache for price display
};

// ═══════════════════════════════════════════════════════════════
// 💰 MULTI-SOURCE PRICE FETCHING
// ═══════════════════════════════════════════════════════════════

async function getETHPrice() {
  const sources = [
    {
      name: "Binance",
      fetch: async () => {
        const res = await axios.get(
          "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
          { timeout: 3000 }
        );
        return parseFloat(res.data.price);
      },
    },
    {
      name: "CoinGecko",
      fetch: async () => {
        const res = await axios.get(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
          { timeout: 3000 }
        );
        return res.data.ethereum.usd;
      },
    },
  ];

  for (const source of sources) {
    try {
      const price = await source.fetch();
      if (price > 1000 && price < 8000) {
        // Sanity check
        return { price, source: source.name };
      }
    } catch (e) {
      console.log(`⚠️ ${source.name} failed`);
    }
  }

  return { price: BotState.ethPrice, source: "cached" }; // Fallback
}

// ═══════════════════════════════════════════════════════════════
// ⚡ SMART GAS PRICE OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

async function getOptimalGasPrice() {
  try {
    // Try Alchemy Gas API first (more accurate)
    try {
      const alchemyResponse = await axios.get(
        `https://eth-mainnet.g.alchemy.com/v2/${
          process.env.ALCHEMY_API_KEY || "demo"
        }/gasPrices`,
        { timeout: 2000 }
      );

      if (alchemyResponse.data && alchemyResponse.data.standard) {
        const standardGwei = parseFloat(alchemyResponse.data.standard);
        console.log(`⛽ Alchemy Gas: ${standardGwei} gwei`);
        return Math.min(standardGwei, CONFIG.STRATEGY.maxGasPriceGwei);
      }
    } catch (alchemyError) {
      // Fallback to ethers if Alchemy fails
    }

    // Fallback: Use ethers provider
    const feeData = await ethers.provider.getFeeData();
    const currentGwei = parseFloat(
      ethers.formatUnits(feeData.gasPrice, "gwei")
    );

    console.log(`⛽ Network Gas: ${currentGwei} gwei`);

    // Use current gas but cap at maximum
    const optimalGwei = Math.min(currentGwei, CONFIG.STRATEGY.maxGasPriceGwei);

    // Skip if gas is extremely high (but unlikely with current low prices)
    if (currentGwei > CONFIG.STRATEGY.maxGasPriceGwei * 2) {
      return null; // Skip this cycle
    }

    return optimalGwei;
  } catch (e) {
    console.log(
      `⚠️ Gas fetch failed, using fallback: ${CONFIG.STRATEGY.maxGasPriceGwei} gwei`
    );
    return CONFIG.STRATEGY.maxGasPriceGwei; // Fallback
  }
}

// ═══════════════════════════════════════════════════════════════
// 💱 PRICE COMPARISON SYSTEM
// ═══════════════════════════════════════════════════════════════

async function getRouterPrices(
  baseAddr,
  quoteAddr,
  router1,
  router2,
  direction
) {
  try {
    // Router names for display
    const routerNames = {
      [CONFIG.ADDRESSES.UNISWAP_ROUTER]: "Uniswap",
      [CONFIG.ADDRESSES.SUSHISWAP_ROUTER]: "SushiSwap",
    };

    // Dynamic WETH/USDC price check - vary input to avoid cache
    const path = [baseAddr, quoteAddr]; // WETH -> USDC
    const randomOffset = Math.floor(Math.random() * 1000) + 1; // 1-1000 wei offset
    const inputAmount = ethers.parseEther("1") + BigInt(randomOffset); // Slightly different each time

    // Get quotes from both routers
    const router1Contract = new ethers.Contract(
      router1,
      [
        "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
      ],
      BotState.signer
    );

    const router2Contract = new ethers.Contract(
      router2,
      [
        "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
      ],
      BotState.signer
    );

    // Get amounts from both routers with fresh calls
    const [amounts1, amounts2] = await Promise.all([
      router1Contract.getAmountsOut(inputAmount, path, { blockTag: "latest" }),
      router2Contract.getAmountsOut(inputAmount, path, { blockTag: "latest" }),
    ]);

    // Calculate ETH prices in USD (detect decimals automatically)
    const decimals = quoteAddr === CONFIG.ADDRESSES.DAI ? 18 : 6; // DAI=18, USDC/USDT=6
    const price1 = parseFloat(ethers.formatUnits(amounts1[1], decimals)); // Token per ETH
    const price2 = parseFloat(ethers.formatUnits(amounts2[1], decimals)); // Token per ETH

    // Add timestamp to detect if prices are updating
    const timestamp = Date.now();
    const spreadPercent =
      Math.abs((price1 - price2) / Math.min(price1, price2)) * 100;

    return {
      router1Name: routerNames[router1] || "Router1",
      router2Name: routerNames[router2] || "Router2",
      price1,
      price2,
      spreadPercent,
      amounts1: amounts1[1],
      amounts2: amounts2[1],
      timestamp,
      // blockNumber: await BotState.signer.provider.getBlockNumber(), // Removed - unnecessary API call
    };
  } catch (error) {
    console.log(`⚠️ Price fetch error: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔍 ADVANCED OPPORTUNITY SCANNER
// ═══════════════════════════════════════════════════════════════

async function scanAllOpportunities() {
  const opportunities = [];

  // Get gas price ONCE for all pairs
  const gasPrice = await getOptimalGasPrice();
  if (!gasPrice) return []; // Skip all if gas too high

  // Batch all router price calls to reduce API requests
  const pricePromises = [];
  const pairInfo = [];

  for (const pair of CONFIG.PAIRS) {
    const baseAddr = CONFIG.ADDRESSES[pair.base];
    const quoteAddr = CONFIG.ADDRESSES[pair.quote];

    // Collect price data for both directions
    pricePromises.push(
      getRouterPrices(
        baseAddr,
        quoteAddr,
        CONFIG.ADDRESSES.UNISWAP_ROUTER,
        CONFIG.ADDRESSES.SUSHISWAP_ROUTER,
        `${pair.name} (Uni→Sushi)`
      )
    );
    pairInfo.push({
      pair,
      direction: "Uni→Sushi",
      router1: CONFIG.ADDRESSES.UNISWAP_ROUTER,
      router2: CONFIG.ADDRESSES.SUSHISWAP_ROUTER,
    });
  }

  // Execute all price calls in parallel
  const priceResults = await Promise.all(pricePromises);

  // Cache price data for display
  BotState.lastPriceData = priceResults;

  // Now analyze opportunities with pre-fetched price data
  for (let i = 0; i < pairInfo.length; i++) {
    const { pair, direction, router1, router2 } = pairInfo[i];
    const priceDetails = priceResults[i];

    // Direction 1: Uniswap → SushiSwap
    const opp1 = await analyzeOpportunity(
      pair.base,
      pair.quote,
      router1,
      router2,
      `${pair.name} (Uni→Sushi)`,
      gasPrice,
      priceDetails // Pass pre-fetched price data
    );

    // Direction 2: SushiSwap → Uniswap (reuse same price data, just swap)
    const opp2 = await analyzeOpportunity(
      pair.base,
      pair.quote,
      router2,
      router1,
      `${pair.name} (Sushi→Uni)`,
      gasPrice,
      priceDetails // Same price data, different direction
    );

    if (opp1.profitable) opportunities.push(opp1);
    if (opp2.profitable) opportunities.push(opp2);
  }

  // Sort by profit percentage (best first)
  return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
}

async function analyzeOpportunity(
  baseToken,
  quoteToken,
  router1,
  router2,
  direction,
  gasPrice, // Add gas price parameter
  priceDetails = null // Add optional pre-fetched price data
) {
  try {
    const baseAddr = CONFIG.ADDRESSES[baseToken];
    const quoteAddr = CONFIG.ADDRESSES[quoteToken];

    // Use pre-fetched price data if available, otherwise fetch
    if (!priceDetails) {
      priceDetails = await getRouterPrices(
        baseAddr,
        quoteAddr,
        router1,
        router2,
        direction
      );
    }

    // Get profit calculation from contract
    const [grossProfit, profitable] =
      await BotState.contract.calculateArbitrageProfit(
        baseAddr,
        quoteAddr,
        BotState.currentBorrow,
        router1,
        router2
      );

    const grossProfitETH = parseFloat(ethers.formatEther(grossProfit));
    const grossProfitUSD = grossProfitETH * BotState.ethPrice;

    // Calculate fees
    const borrowETH = parseFloat(ethers.formatEther(BotState.currentBorrow));
    // Gas price already passed as parameter - no need to fetch again!

    const fees = {
      aave: borrowETH * 0.0009 * BotState.ethPrice, // 0.09% Aave fee
      our: grossProfitUSD * 0.001, // 0.1% our fee (sadece profit'ten!)
      gas: ((450000 * gasPrice) / 1e9) * BotState.ethPrice, // Gas cost (çok düşük!)
    };

    const totalFees = fees.aave + fees.our + fees.gas;
    const netProfitUSD = grossProfitUSD - totalFees;
    const investmentUSD = borrowETH * BotState.ethPrice;
    const profitPercent = (netProfitUSD / investmentUSD) * 100;

    // Enhanced profitability check
    const isProfitable =
      profitable &&
      profitPercent >= CONFIG.STRATEGY.minProfitPercent &&
      netProfitUSD >= CONFIG.STRATEGY.minNetProfitUSD;

    return {
      profitable: isProfitable,
      direction,
      baseToken: baseAddr,
      quoteToken: quoteAddr,
      baseSymbol: baseToken,
      quoteSymbol: quoteToken,
      router1,
      router2,
      borrowAmount: BotState.currentBorrow,
      grossProfitUSD,
      netProfitUSD,
      profitPercent,
      investmentUSD,
      fees,
      gasPrice,
      priceDetails, // Add price comparison details
      timestamp: Date.now(),
    };
  } catch (error) {
    return { profitable: false, direction, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 LIGHTNING EXECUTION ENGINE
// ═══════════════════════════════════════════════════════════════

async function executeArbitrage(opp) {
  const startTime = Date.now();

  try {
    console.log(`\n⚡ EXECUTING: ${opp.direction}`);
    console.log(
      `💎 Expected: $${opp.netProfitUSD.toFixed(
        2
      )} (${opp.profitPercent.toFixed(3)}%)`
    );

    // Encode parameters
    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,address,uint256,address,address,uint256)"],
      [
        [
          opp.baseToken,
          opp.quoteToken,
          opp.borrowAmount,
          opp.router1,
          opp.router2,
          ethers.parseEther("0.001"),
        ],
      ]
    );

    // Execute transaction
    const gasPrice = ethers.parseUnits(opp.gasPrice.toString(), "gwei");
    const tx = await BotState.contract.startArbitrage(
      opp.baseToken,
      opp.borrowAmount,
      params,
      { gasLimit: 450000, gasPrice }
    );

    console.log(`📝 TX: ${tx.hash}`);

    // Wait for confirmation with timeout
    const receipt = await Promise.race([
      tx.wait(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout")),
          CONFIG.TIMING.executionTimeout
        )
      ),
    ]);

    if (receipt.status === 1) {
      const execTime = Date.now() - startTime;
      const gasUsed = receipt.gasUsed;
      const gasCost = ((gasUsed * gasPrice) / 1e18) * BotState.ethPrice;

      console.log(
        `✅ SUCCESS! Time: ${execTime}ms, Gas: $${gasCost.toFixed(2)}`
      );

      // Update state
      BotState.successTrades++;
      BotState.totalProfit += opp.netProfitUSD;
      BotState.consecutiveFailures = 0;

      // Scale up borrow amount
      scaleBorrowAmount(true);

      // Log trade
      await logTrade(opp, receipt, true);

      return { success: true, profit: opp.netProfitUSD };
    } else {
      throw new Error("Transaction failed");
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);

    BotState.failedTrades++;
    BotState.consecutiveFailures++;

    scaleBorrowAmount(false);
    await logTrade(opp, null, false, error.message);

    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🧠 ADAPTIVE CAPITAL MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function scaleBorrowAmount(success) {
  const current = parseFloat(ethers.formatEther(BotState.currentBorrow));
  const base = CONFIG.STRATEGY.baseBorrowETH;
  const max = CONFIG.STRATEGY.maxBorrowETH;

  if (success && current < max) {
    // Scale up after success
    const newAmount = Math.min(current * CONFIG.STRATEGY.scaleFactor, max);
    BotState.currentBorrow = ethers.parseEther(newAmount.toString());
    console.log(`📈 Scaled up: ${newAmount.toFixed(2)} ETH`);
  } else if (!success && current > base) {
    // Scale down after failure
    const newAmount = Math.max(current / CONFIG.STRATEGY.scaleFactor, base);
    BotState.currentBorrow = ethers.parseEther(newAmount.toString());
    console.log(`📉 Scaled down: ${newAmount.toFixed(2)} ETH`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 TRADE LOGGING SYSTEM
// ═══════════════════════════════════════════════════════════════

async function logTrade(opp, receipt, success, error = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    success,
    direction: opp.direction,
    pair: `${opp.baseSymbol}/${opp.quoteSymbol}`,
    borrowETH: ethers.formatEther(opp.borrowAmount),
    expectedProfit: opp.netProfitUSD,
    profitPercent: opp.profitPercent,
    gasPrice: opp.gasPrice,
    txHash: receipt?.hash,
    gasUsed: receipt?.gasUsed?.toString(),
    error,
    ethPrice: BotState.ethPrice,
  };

  const logPath = path.join(__dirname, "..", "logs", "ultra-bot-trades.json");
  const logs = fs.existsSync(logPath)
    ? JSON.parse(fs.readFileSync(logPath, "utf8"))
    : [];
  logs.push(logEntry);

  // Keep last 500 entries
  if (logs.length > 500) logs.splice(0, logs.length - 500);

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// 🛡️ SAFETY & RISK MANAGEMENT
// ═══════════════════════════════════════════════════════════════

async function shouldStopTrading() {
  // Check daily limits
  const todayStats = await getTodayStats();

  if (todayStats.trades >= CONFIG.TARGETS.maxDailyTrades) {
    console.log("🎯 Daily trade limit reached");
    return true;
  }

  if (todayStats.profit >= CONFIG.TARGETS.dailyProfitUSD) {
    console.log("🎯 Daily profit target achieved!");
    return true;
  }

  // Check consecutive failures
  if (BotState.consecutiveFailures >= CONFIG.TARGETS.maxFailures) {
    console.log("🛑 Too many failures, stopping");
    return true;
  }

  // Check emergency stop
  if (BotState.totalLoss >= CONFIG.TARGETS.emergencyStopLoss) {
    console.log("🚨 Emergency stop loss triggered!");
    return true;
  }

  // Check wallet balance - minimum for gas fees only
  const balance = await ethers.provider.getBalance(BotState.signer.address);
  const minBalanceETH = 0.005; // 0.005 ETH ≈ $12 minimum for gas
  if (balance < ethers.parseEther(minBalanceETH.toString())) {
    console.log(
      `💸 Insufficient gas balance: ${ethers.formatEther(
        balance
      )} ETH (need min ${minBalanceETH} ETH)`
    );
    return true;
  }

  return false;
}

async function getTodayStats() {
  try {
    const logPath = path.join(__dirname, "..", "logs", "ultra-bot-trades.json");
    if (!fs.existsSync(logPath)) return { trades: 0, profit: 0 };

    const logs = JSON.parse(fs.readFileSync(logPath, "utf8"));
    const today = new Date().toDateString();

    const todayTrades = logs.filter(
      (log) => new Date(log.timestamp).toDateString() === today && log.success
    );

    const profit = todayTrades.reduce(
      (sum, trade) => sum + (trade.expectedProfit || 0),
      0
    );

    return { trades: todayTrades.length, profit };
  } catch {
    return { trades: 0, profit: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔄 MAIN MONITORING LOOP
// ═══════════════════════════════════════════════════════════════

async function runScanCycle() {
  try {
    BotState.totalScans++;
    const cycleStart = Date.now();

    console.log(
      `\n🔍 [${new Date().toLocaleTimeString()}] Scan #${BotState.totalScans}`
    );

    // Safety checks
    if (await shouldStopTrading()) return;

    // Update ETH price
    const priceData = await getETHPrice();
    BotState.ethPrice = priceData.price;
    console.log(`💰 ETH: $${BotState.ethPrice} (${priceData.source})`);

    // Scan opportunities
    const opportunities = await scanAllOpportunities();

    if (opportunities.length > 0) {
      const best = opportunities[0];
      console.log(`🎉 BEST: ${best.direction}`);
      console.log(
        `📊 Profit: $${best.netProfitUSD.toFixed(
          2
        )} (${best.profitPercent.toFixed(3)}%)`
      );

      // Show price details if available
      if (best.priceDetails) {
        console.log(
          `💱 ${
            best.priceDetails.router1Name
          }: $${best.priceDetails.price1.toFixed(2)}`
        );
        console.log(
          `💱 ${
            best.priceDetails.router2Name
          }: $${best.priceDetails.price2.toFixed(2)}`
        );
        console.log(
          `📈 Spread: ${best.priceDetails.spreadPercent.toFixed(3)}%`
        );
      }

      // Execute best opportunity
      const result = await executeArbitrage(best);

      if (result.success) {
        const successRate = (
          (BotState.successTrades /
            (BotState.successTrades + BotState.failedTrades)) *
          100
        ).toFixed(1);
        console.log(
          `🎯 Total: $${BotState.totalProfit.toFixed(
            2
          )} | Success: ${successRate}%`
        );
      }
    } else {
      console.log("😴 No opportunities found");

      // Show current market prices for all pairs
      try {
        const pairs = [
          { name: "WETH/USDC", quote: CONFIG.ADDRESSES.USDC, decimals: 6 },
          { name: "WETH/USDT", quote: CONFIG.ADDRESSES.USDT, decimals: 6 },
          { name: "WETH/DAI", quote: CONFIG.ADDRESSES.DAI, decimals: 18 },
        ];

        // Use cached price data instead of making new API calls
        if (BotState.lastPriceData && BotState.lastPriceData.length > 0) {
          for (
            let i = 0;
            i < Math.min(pairs.length, BotState.lastPriceData.length);
            i++
          ) {
            const priceInfo = BotState.lastPriceData[i];
            if (priceInfo) {
              console.log(
                `📊 ${pairs[i].name} - Uni: $${priceInfo.price1.toFixed(
                  2
                )} | Sushi: $${priceInfo.price2.toFixed(
                  2
                )} | Spread: ${priceInfo.spreadPercent.toFixed(3)}%`
              );
            }
          }
        } else {
          console.log("📊 No cached price data available");
        }
      } catch (error) {
        console.log("📊 Price check failed");
      }
    }

    console.log(`⏱️ Cycle: ${Date.now() - cycleStart}ms`);
  } catch (error) {
    console.error(`❌ Scan error: ${error.message}`);
    BotState.consecutiveFailures++;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 BOT INITIALIZATION
// ═══════════════════════════════════════════════════════════════

async function initBot() {
  try {
    console.log("🔧 Initializing Ultra Bot...");

    // Load deployment
    const deploymentPath = path.join(
      __dirname,
      "..",
      "deployments",
      "mainnet-deployment.json"
    );
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    // Setup contract
    const [signer] = await ethers.getSigners();
    BotState.signer = signer;

    const FlashLoanArbitrage = await ethers.getContractFactory(
      "FlashLoanArbitrageMainnet"
    );
    BotState.contract = FlashLoanArbitrage.attach(deployment.contractAddress);

    // Get initial price
    const priceData = await getETHPrice();
    BotState.ethPrice = priceData.price;

    console.log("✅ Bot Ready!");
    console.log(`📍 Contract: ${deployment.contractAddress}`);
    console.log(`👤 Trader: ${signer.address}`);
    console.log(`💰 ETH: $${BotState.ethPrice}`);
    console.log(`⚡ Interval: ${CONFIG.TIMING.scanInterval / 1000}s`);
    console.log(`📊 Min Profit: ${CONFIG.STRATEGY.minProfitPercent}%`);
    console.log(`🎯 Target: $${CONFIG.TARGETS.dailyProfitUSD}/day`);

    return true;
  } catch (error) {
    console.error(`❌ Init failed: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎮 MAIN BOT CONTROL
// ═══════════════════════════════════════════════════════════════

async function startBot() {
  if (!(await initBot())) process.exit(1);

  BotState.running = true;
  BotState.startTime = Date.now();

  console.log("\n🚀 ULTRA ARBITRAGE BOT STARTED!");
  console.log("Press Ctrl+C to stop\n");

  // Initial scan
  await runScanCycle();

  // Main loop
  const interval = setInterval(async () => {
    if (!BotState.running) {
      clearInterval(interval);
      return;
    }

    // Check runtime limit
    if (Date.now() - BotState.startTime > CONFIG.TIMING.maxRuntime) {
      console.log("⏰ 24h limit reached");
      stopBot();
      return;
    }

    await runScanCycle();
  }, CONFIG.TIMING.scanInterval);

  // Shutdown handlers
  process.on("SIGINT", () => {
    console.log("\n🛑 Stopping bot...");
    stopBot();
  });
}

function stopBot() {
  BotState.running = false;

  const runtime = ((Date.now() - BotState.startTime) / 3600000).toFixed(1);

  console.log("\n" + "═".repeat(50));
  console.log("📊 ULTRA BOT FINAL STATS");
  console.log("═".repeat(50));
  console.log(`⏱️ Runtime: ${runtime} hours`);
  console.log(`🔍 Total Scans: ${BotState.totalScans}`);
  console.log(`✅ Success: ${BotState.successTrades}`);
  console.log(`❌ Failed: ${BotState.failedTrades}`);
  console.log(`💰 Profit: $${BotState.totalProfit.toFixed(2)}`);
  console.log(`💸 Loss: $${BotState.totalLoss.toFixed(2)}`);
  console.log(
    `📈 Net P&L: $${(BotState.totalProfit - BotState.totalLoss).toFixed(2)}`
  );

  if (BotState.successTrades + BotState.failedTrades > 0) {
    const rate = (
      (BotState.successTrades /
        (BotState.successTrades + BotState.failedTrades)) *
      100
    ).toFixed(1);
    console.log(`🎯 Success Rate: ${rate}%`);
  }

  if (BotState.successTrades > 0) {
    const avg = (BotState.totalProfit / BotState.successTrades).toFixed(2);
    console.log(`📊 Avg/Trade: $${avg}`);
  }

  console.log("═".repeat(50));
  console.log("🛑 Ultra Bot stopped!");

  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
// 🎯 LAUNCH!
// ═══════════════════════════════════════════════════════════════

async function main() {
  await startBot();
}

main().catch((error) => {
  console.error("💥 Critical:", error);
  process.exit(1);
});

module.exports = { startBot, stopBot, BotState, CONFIG };
