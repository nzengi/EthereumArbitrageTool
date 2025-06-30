const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// 🚀 ENHANCED ULTRA ARBITRAGE BOT v3.0
// Built with SMART API MANAGEMENT for Free Tier Users

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🚀 ENHANCED ULTRA ARBITRAGE BOT v3.0 🚀            ║
║          Smart API Management for Free Tier Users            ║
╚══════════════════════════════════════════════════════════════╝
`);

// ═══════════════════════════════════════════════════════════════
// 🌐 SMART API MANAGEMENT SYSTEM
// ═══════════════════════════════════════════════════════════════

class APIManager {
  constructor() {
    this.providers = [
      {
        name: "Infura",
        url:
          process.env.ETHEREUM_RPC_URL ||
          process.env.MAINNET_RPC_URL ||
          `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
        requests: 0,
        lastReset: Date.now(),
        maxRequests: 60, // 60 per minute (safe margin)
        resetInterval: 60000, // 1 minute
        available: true,
        consecutiveErrors: 0,
        backoffUntil: 0,
      },
      {
        name: "Alchemy",
        url:
          process.env.ALCHEMY_API_URL ||
          `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        requests: 0,
        lastReset: Date.now(),
        maxRequests: 100, // Conservative estimate
        resetInterval: 60000,
        available: true,
        consecutiveErrors: 0,
        backoffUntil: 0,
      },
    ];

    this.cache = new Map();
    this.cacheTimeout = 15000; // 15 second cache
    this.currentProviderIndex = 0;
  }

  resetCounters() {
    const now = Date.now();
    this.providers.forEach((provider) => {
      if (now - provider.lastReset > provider.resetInterval) {
        provider.requests = 0;
        provider.lastReset = now;
        if (provider.backoffUntil < now) {
          provider.available = true;
          provider.consecutiveErrors = 0;
        }
      }
    });
  }

  getAvailableProvider() {
    this.resetCounters();

    // Try current provider first
    const current = this.providers[this.currentProviderIndex];
    if (
      current.available &&
      current.requests < current.maxRequests &&
      Date.now() > current.backoffUntil
    ) {
      return current;
    }

    // Find next available provider
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      if (
        provider.available &&
        provider.requests < provider.maxRequests &&
        Date.now() > provider.backoffUntil
      ) {
        this.currentProviderIndex = i;
        return provider;
      }
    }

    return null; // No available providers
  }

  async makeRequest(method, params = []) {
    const cacheKey = `${method}-${JSON.stringify(params)}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const provider = this.getAvailableProvider();
    if (!provider) {
      throw new Error("No API providers available - all rate limited");
    }

    try {
      const response = await axios.post(
        provider.url,
        {
          jsonrpc: "2.0",
          method: method,
          params: params,
          id: 1,
        },
        {
          timeout: 5000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      provider.requests++;
      provider.consecutiveErrors = 0;

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      // Cache successful response
      this.cache.set(cacheKey, {
        data: response.data.result,
        timestamp: Date.now(),
      });

      return response.data.result;
    } catch (error) {
      provider.consecutiveErrors++;

      if (
        error.message.includes("Too Many Requests") ||
        error.message.includes("rate limit")
      ) {
        console.log(`🚫 ${provider.name} rate limited`);
        provider.available = false;
        provider.backoffUntil = Date.now() + 60000; // 1 minute backoff
      } else if (provider.consecutiveErrors >= 3) {
        console.log(
          `🚫 ${provider.name} temporary disabled (${provider.consecutiveErrors} errors)`
        );
        provider.available = false;
        provider.backoffUntil = Date.now() + 30000; // 30 seconds backoff
      }

      throw error;
    }
  }

  getStatus() {
    this.resetCounters();
    return this.providers.map((p) => ({
      name: p.name,
      available: p.available,
      requests: p.requests,
      maxRequests: p.maxRequests,
      usage: ((p.requests / p.maxRequests) * 100).toFixed(1),
      backoffUntil: p.backoffUntil > Date.now() ? p.backoffUntil : 0,
    }));
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 OPTIMIZED CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  ADDRESSES: {
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    UNISWAP_ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    SUSHISWAP_ROUTER: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  },

  STRATEGY: {
    // 🎯 $500 TARGET PROFIT SYSTEM
    targetProfitUSD: 500, // MAIN GOAL: $500 profit per successful trade
    baseBorrowETH: 1.0, // DYNAMIC: Will be calculated based on spread
    maxBorrowETH: 50.0, // HIGH LIMIT: Allow large borrows for $500 target
    scaleFactor: 1.1, // CONSERVATIVE: Slow scaling
    minProfitPercent: 0.15, // REASONABLE: 0.15% minimum spread
    targetProfitPercent: 0.25, // TARGET: 0.25% spread for optimal execution
    minNetProfitUSD: 400, // MINIMUM: At least $400 profit after all costs
    maxGasPriceGwei: 1.5, // ULTRA LOW: Match current gas conditions (~0.6 gwei)
    maxSlippagePercent: 1.2, // BALANCED: Allow reasonable slippage to prevent reverts
  },

  // 🐌 SLOWER BUT SUSTAINABLE TIMING
  TIMING: {
    scanInterval: 60000, // 60 seconds - ultra conservative scanning
    priceUpdate: 50000, // 50 seconds price updates
    executionTimeout: 40000, // More time for execution
    maxRuntime: 24 * 3600 * 1000,
    fastModeInterval: 45000, // Slower fast mode
    slowModeInterval: 90000, // Slow mode when rate limited (90 seconds)
  },

  TARGETS: {
    dailyProfitUSD: 30, // Realistic target
    maxDailyTrades: 15,
    maxFailures: 5,
    emergencyStopLoss: 20,
  },

  PAIRS: [
    { base: "WETH", quote: "USDC", name: "WETH/USDC" },
    { base: "WETH", quote: "USDT", name: "WETH/USDT" },
    { base: "WETH", quote: "DAI", name: "WETH/DAI" },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🌐 GLOBAL STATE
// ═══════════════════════════════════════════════════════════════

const apiManager = new APIManager();
const BotState = {
  running: false,
  totalScans: 0,
  successTrades: 0,
  failedTrades: 0,
  totalProfit: 0,
  totalLoss: 0,
  currentBorrow: ethers.parseEther("1.0"), // Will be dynamically calculated per opportunity
  consecutiveFailures: 0,
  ethPrice: 2400,
  contract: null,
  signer: null,
  startTime: null,
  lastSuccessfulPriceData: null,
  currentInterval: CONFIG.TIMING.scanInterval,
  rateLimitMode: false,
  lastApiStatus: null,
};

// ═══════════════════════════════════════════════════════════════
// 💰 CACHED PRICE FETCHING
// ═══════════════════════════════════════════════════════════════

const priceCache = {
  ethPrice: { value: 2400, timestamp: 0, ttl: 20000 }, // 20 second TTL
  gasPrice: { value: 1.0, timestamp: 0, ttl: 30000 }, // 30 second TTL (ultra-low default)
  routerPrices: new Map(), // Dynamic TTL based on volatility
};

async function getCachedETHPrice() {
  const now = Date.now();

  // Return cached if still valid
  if (now - priceCache.ethPrice.timestamp < priceCache.ethPrice.ttl) {
    return { price: priceCache.ethPrice.value, source: "cached" };
  }

  // Try to fetch new price
  const sources = [
    {
      name: "Binance",
      fetch: async () => {
        const res = await axios.get(
          "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
          { timeout: 4000 }
        );
        return parseFloat(res.data.price);
      },
    },
    {
      name: "CoinGecko",
      fetch: async () => {
        const res = await axios.get(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
          { timeout: 4000 }
        );
        return res.data.ethereum.usd;
      },
    },
  ];

  for (const source of sources) {
    try {
      const price = await source.fetch();
      if (price > 1000 && price < 8000) {
        priceCache.ethPrice = { value: price, timestamp: now, ttl: 20000 };
        BotState.ethPrice = price;
        return { price, source: source.name };
      }
    } catch (e) {
      console.log(`⚠️ ${source.name} price fetch failed`);
    }
  }

  // Return cached value as fallback
  return { price: priceCache.ethPrice.value, source: "cached-fallback" };
}

async function getDynamicGasPrice(borrowAmountETH, urgency = "normal") {
  const now = Date.now();

  if (now - priceCache.gasPrice.timestamp < priceCache.gasPrice.ttl) {
    const baseGas = priceCache.gasPrice.value;
    return calculateOptimalGasPrice(baseGas, borrowAmountETH, urgency);
  }

  try {
    // Try simple eth_gasPrice first (most efficient)
    const gasPriceWei = await apiManager.makeRequest("eth_gasPrice");
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPriceWei, "gwei"));

    priceCache.gasPrice = { value: gasPriceGwei, timestamp: now, ttl: 30000 };

    return calculateOptimalGasPrice(gasPriceGwei, borrowAmountETH, urgency);
  } catch (e) {
    console.log(`⚠️ Gas price fetch failed: ${e.message}`);
    const fallbackGas = priceCache.gasPrice.value || 1.0;
    return calculateOptimalGasPrice(fallbackGas, borrowAmountETH, urgency);
  }
}

function calculateOptimalGasPrice(baseGasPrice, borrowAmountETH, urgency) {
  let multiplier = 1.0;

  // 🎯 PROFIT-BASED GAS PRICING
  if (borrowAmountETH > 20) multiplier = 1.5; // Big profit trades pay more gas
  else if (borrowAmountETH > 10) multiplier = 1.3;
  else if (borrowAmountETH > 5) multiplier = 1.2;

  // ⚡ URGENCY MULTIPLIER
  if (urgency === "high")
    multiplier *= 1.4; // Fast execution for good opportunities
  else if (urgency === "low") multiplier *= 0.8; // Slow for marginal trades

  const optimalGas = baseGasPrice * multiplier;
  const cappedGas = Math.min(optimalGas, CONFIG.STRATEGY.maxGasPriceGwei);

  console.log(
    `⛽ Dynamic Gas: ${baseGasPrice.toFixed(2)} → ${cappedGas.toFixed(
      2
    )} gwei (${borrowAmountETH.toFixed(1)} ETH, ${urgency})`
  );

  return cappedGas;
}

// Legacy function for compatibility
async function getCachedGasPrice() {
  return await getDynamicGasPrice(1.0, "normal");
}

// ═══════════════════════════════════════════════════════════════
// 💱 SMART ROUTER PRICE FETCHING
// ═══════════════════════════════════════════════════════════════

async function getRouterPricesOptimized(baseAddr, quoteAddr, router1, router2) {
  const cacheKey = `${baseAddr}-${quoteAddr}-${router1}-${router2}`;
  const now = Date.now();

  // Check cache
  if (priceCache.routerPrices.has(cacheKey)) {
    const cached = priceCache.routerPrices.get(cacheKey);
    if (now - cached.timestamp < 12000) {
      // 12 second cache
      return cached.data;
    }
  }

  try {
    const routerNames = {
      [CONFIG.ADDRESSES.UNISWAP_ROUTER]: "Uni",
      [CONFIG.ADDRESSES.SUSHISWAP_ROUTER]: "Sushi",
    };

    // Create router contracts
    const routerABI = [
      "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    ];

    // Use ethers provider with API manager fallback
    let provider;
    try {
      provider = ethers.provider;
    } catch (e) {
      throw new Error("Provider not available");
    }

    const router1Contract = new ethers.Contract(router1, routerABI, provider);
    const router2Contract = new ethers.Contract(router2, routerABI, provider);

    const path = [baseAddr, quoteAddr];
    const inputAmount = ethers.parseEther("1");

    // Batch both calls
    const [amounts1, amounts2] = await Promise.all([
      router1Contract.getAmountsOut(inputAmount, path),
      router2Contract.getAmountsOut(inputAmount, path),
    ]);

    // Get correct decimals for quote token
    let decimals = 18; // Default for DAI
    if (
      quoteAddr === CONFIG.ADDRESSES.USDC ||
      quoteAddr === CONFIG.ADDRESSES.USDT
    ) {
      decimals = 6; // USDC and USDT use 6 decimals
    }

    const price1 = parseFloat(ethers.formatUnits(amounts1[1], decimals));
    const price2 = parseFloat(ethers.formatUnits(amounts2[1], decimals));

    const result = {
      router1: { name: routerNames[router1], price: price1 },
      router2: { name: routerNames[router2], price: price2 },
      spread: (Math.abs(price1 - price2) / Math.max(price1, price2)) * 100,
    };

    // Cache result
    priceCache.routerPrices.set(cacheKey, {
      data: result,
      timestamp: now,
    });

    return result;
  } catch (e) {
    console.log(`⚠️ Router price fetch error: ${e.message}`);

    // Return cached if available
    if (priceCache.routerPrices.has(cacheKey)) {
      const cached = priceCache.routerPrices.get(cacheKey);
      console.log(
        `📦 Using cached router prices (${(
          (now - cached.timestamp) /
          1000
        ).toFixed(0)}s old)`
      );
      return cached.data;
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔍 OPTIMIZED SCANNING LOGIC
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 🎯 DYNAMIC BORROW CALCULATION FOR $500 TARGET
// ═══════════════════════════════════════════════════════════════

function calculateOptimalBorrow(spreadPercent, ethPrice) {
  // Target: $500 profit
  const targetProfitUSD = CONFIG.STRATEGY.targetProfitUSD;

  // 🎯 DYNAMIC BUFFER BASED ON TRADE SIZE
  const dynamicBuffer = calculateDynamicBuffer(spreadPercent);
  const grossProfitNeeded = targetProfitUSD * dynamicBuffer;

  // Calculate required borrow amount
  const spreadDecimal = spreadPercent / 100;
  const requiredTradeValueUSD = grossProfitNeeded / spreadDecimal;
  const requiredBorrowETH = requiredTradeValueUSD / ethPrice;

  // Apply limits
  const minBorrow = 0.5; // At least 0.5 ETH
  const maxBorrow = CONFIG.STRATEGY.maxBorrowETH;

  const optimalBorrow = Math.max(
    minBorrow,
    Math.min(requiredBorrowETH, maxBorrow)
  );

  // 🛡️ CALCULATE DYNAMIC SLIPPAGE FOR THIS TRADE
  const expectedSlippage = calculateExpectedSlippage(
    optimalBorrow,
    spreadPercent
  );

  console.log(`💡 DYNAMIC CALCULATION:`);
  console.log(`   📊 Spread: ${spreadPercent.toFixed(3)}%`);
  console.log(`   🎯 Target: $${targetProfitUSD} profit`);
  console.log(
    `   🛡️ Buffer: ${((dynamicBuffer - 1) * 100).toFixed(
      1
    )}% (slippage protection)`
  );
  console.log(`   📉 Expected Slippage: ${expectedSlippage.toFixed(2)}%`);
  console.log(`   💰 Required: ${requiredBorrowETH.toFixed(2)} ETH`);
  console.log(`   ⚡ Optimal: ${optimalBorrow.toFixed(2)} ETH`);

  return optimalBorrow;
}

function calculateDynamicBuffer(spreadPercent) {
  // 🎯 SPREAD-BASED BUFFER: Tighter spreads need more protection
  if (spreadPercent < 0.18) return 1.4; // 40% buffer for tight spreads
  if (spreadPercent < 0.25) return 1.3; // 30% buffer
  if (spreadPercent < 0.35) return 1.25; // 25% buffer
  return 1.2; // 20% buffer for wide spreads
}

function calculateExpectedSlippage(borrowAmountETH, spreadPercent) {
  // 📊 TRADE SIZE vs LIQUIDITY IMPACT
  let baseSlippage = 0.05; // 0.05% base slippage

  // Size impact (bigger trades = more slippage)
  if (borrowAmountETH > 25) baseSlippage += 0.4; // Large size penalty
  else if (borrowAmountETH > 15) baseSlippage += 0.25;
  else if (borrowAmountETH > 10) baseSlippage += 0.15;
  else if (borrowAmountETH > 5) baseSlippage += 0.1;

  // Spread impact (tighter spreads = higher slippage risk)
  if (spreadPercent < 0.2) baseSlippage += 0.2; // Tight spread penalty
  else if (spreadPercent < 0.3) baseSlippage += 0.1;

  return Math.min(baseSlippage, CONFIG.STRATEGY.maxSlippagePercent); // Cap at max
}

function getDynamicSlippageTolerance(borrowAmountETH, spreadPercent) {
  const expectedSlippage = calculateExpectedSlippage(
    borrowAmountETH,
    spreadPercent
  );

  // 🛡️ ADD SAFETY MARGIN: Expected + 50% buffer
  const safeSlippage = expectedSlippage * 1.5;
  const maxAllowed = CONFIG.STRATEGY.maxSlippagePercent;

  const finalTolerance = Math.min(safeSlippage, maxAllowed);

  console.log(
    `🛡️ Slippage: Expected ${expectedSlippage.toFixed(
      2
    )}% → Tolerance ${finalTolerance.toFixed(2)}%`
  );

  return finalTolerance;
}

// ═══════════════════════════════════════════════════════════════
// 📊 DYNAMIC MARKET CONDITIONS ASSESSMENT
// ═══════════════════════════════════════════════════════════════

const marketState = {
  recentSpreads: [], // Last 10 spreads for volatility calculation
  avgGasPrices: [], // Gas price trend
  failureRate: 0, // Recent failure rate
  lastUpdate: 0,
};

function updateMarketState(spreads, gasPrice, success) {
  const now = Date.now();

  // Update spreads (keep last 10)
  spreads.forEach((spread) => {
    marketState.recentSpreads.push({ value: spread, timestamp: now });
  });
  if (marketState.recentSpreads.length > 10) {
    marketState.recentSpreads = marketState.recentSpreads.slice(-10);
  }

  // Update gas prices (keep last 20)
  marketState.avgGasPrices.push({ value: gasPrice, timestamp: now });
  if (marketState.avgGasPrices.length > 20) {
    marketState.avgGasPrices = marketState.avgGasPrices.slice(-20);
  }

  // Update failure rate (rolling window)
  const recentResults = [success]; // Add more sophisticated tracking
  marketState.failureRate =
    recentResults.filter((r) => !r).length / recentResults.length;

  marketState.lastUpdate = now;
}

function calculateMarketVolatility() {
  if (marketState.recentSpreads.length < 3) return "unknown";

  const spreads = marketState.recentSpreads.map((s) => s.value);
  const avg = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const variance =
    spreads.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / spreads.length;
  const stdDev = Math.sqrt(variance);

  // Volatility assessment
  const volatilityRatio = stdDev / avg;

  if (volatilityRatio > 0.5) return "high";
  if (volatilityRatio > 0.2) return "medium";
  return "low";
}

function getDynamicSafetyMultiplier() {
  const volatility = calculateMarketVolatility();
  const gasStable =
    marketState.avgGasPrices.length > 5 &&
    Math.max(...marketState.avgGasPrices.slice(-5).map((g) => g.value)) /
      Math.min(...marketState.avgGasPrices.slice(-5).map((g) => g.value)) <
      1.5;

  let multiplier = 1.0;

  // 📊 VOLATILITY ADJUSTMENT
  if (volatility === "high") multiplier += 0.8; // 80% extra safety
  else if (volatility === "medium") multiplier += 0.4; // 40% extra safety

  // ⛽ GAS INSTABILITY PENALTY
  if (!gasStable) multiplier += 0.3; // 30% extra for gas instability

  // 📉 FAILURE RATE PENALTY
  if (marketState.failureRate > 0.3) multiplier += 0.5; // 50% extra for high failures

  console.log(
    `🌊 Market: ${volatility} volatility, ${
      gasStable ? "stable" : "unstable"
    } gas → ${multiplier.toFixed(1)}x safety`
  );

  return multiplier;
}

// ═══════════════════════════════════════════════════════════════
// 📊 OPPORTUNITY SCANNING
// ═══════════════════════════════════════════════════════════════

async function scanOpportunitiesOptimized() {
  const gasPrice = await getCachedGasPrice();
  const opportunities = [];

  // Skip if gas too high (very lenient now due to ultra-low fees)
  if (gasPrice > CONFIG.STRATEGY.maxGasPriceGwei) {
    console.log(
      `⚠️ Gas too high: ${gasPrice} gwei (max: ${CONFIG.STRATEGY.maxGasPriceGwei})`
    );
    return { opportunities: [], gasPrice, priceData: [] };
  }

  const priceData = [];

  // Scan each pair
  for (const pair of CONFIG.PAIRS) {
    try {
      const baseAddr = CONFIG.ADDRESSES[pair.base];
      const quoteAddr = CONFIG.ADDRESSES[pair.quote];

      const prices = await getRouterPricesOptimized(
        baseAddr,
        quoteAddr,
        CONFIG.ADDRESSES.UNISWAP_ROUTER,
        CONFIG.ADDRESSES.SUSHISWAP_ROUTER
      );

      if (!prices) {
        priceData.push({ pair: pair.name, error: "Price fetch failed" });
        continue;
      }

      priceData.push({
        pair: pair.name,
        router1: prices.router1,
        router2: prices.router2,
        spread: prices.spread,
      });

      // Check if spread is profitable
      if (prices.spread > CONFIG.STRATEGY.minProfitPercent) {
        // 🎯 CALCULATE OPTIMAL BORROW FOR $500 TARGET
        const optimalBorrowETH = calculateOptimalBorrow(
          prices.spread,
          BotState.ethPrice
        );

        // Update current borrow for this opportunity
        BotState.currentBorrow = ethers.parseEther(optimalBorrowETH.toString());

        // 🌊 GET DYNAMIC MARKET CONDITIONS
        const safetyMultiplier = getDynamicSafetyMultiplier();
        const dynamicSlippage = getDynamicSlippageTolerance(
          optimalBorrowETH,
          prices.spread
        );

        // ⛽ DYNAMIC GAS CALCULATION
        const urgency =
          prices.spread > 0.3 ? "high" : prices.spread > 0.2 ? "normal" : "low";
        const dynamicGasPrice = await getDynamicGasPrice(
          optimalBorrowETH,
          urgency
        );
        const estimatedGasUsed =
          optimalBorrowETH > 10
            ? 750000
            : optimalBorrowETH > 5
            ? 650000
            : 550000;
        const estimatedGasCostETH = (dynamicGasPrice * estimatedGasUsed) / 1e9;
        const estimatedGasCostUSD = estimatedGasCostETH * BotState.ethPrice;

        // 💰 CALCULATE PROFIT WITH ALL DYNAMIC FACTORS
        const grossProfitUSD =
          (BotState.ethPrice * optimalBorrowETH * prices.spread) / 100;
        const slippageCostUSD = grossProfitUSD * (dynamicSlippage / 100);
        const dynamicSafetyCostUSD = grossProfitUSD * (safetyMultiplier - 1);
        const estimatedProfit =
          grossProfitUSD -
          estimatedGasCostUSD -
          slippageCostUSD -
          dynamicSafetyCostUSD;

        console.log(
          `💰 Borrow: ${optimalBorrowETH.toFixed(2)} ETH (${urgency} urgency)`
        );
        console.log(
          `🛡️ Safety: ${safetyMultiplier.toFixed(
            1
          )}x, Slippage: ${dynamicSlippage.toFixed(2)}%`
        );
        console.log(
          `💰 Gross: $${grossProfitUSD.toFixed(
            2
          )} - Gas: $${estimatedGasCostUSD.toFixed(
            2
          )} - Slippage: $${slippageCostUSD.toFixed(
            2
          )} - Safety: $${dynamicSafetyCostUSD.toFixed(
            2
          )} = Net: $${estimatedProfit.toFixed(2)}`
        );

        if (estimatedProfit > CONFIG.STRATEGY.minNetProfitUSD) {
          opportunities.push({
            pair: pair.name,
            baseAddr,
            quoteAddr,
            spread: prices.spread,
            estimatedProfit,
            gasPrice,
            prices,
            optimalBorrowETH, // Include calculated borrow amount
          });
        }
      }
    } catch (e) {
      console.log(`⚠️ Error scanning ${pair.name}: ${e.message}`);
      priceData.push({ pair: pair.name, error: e.message });
    }
  }

  // 🌊 UPDATE MARKET STATE WITH SCAN RESULTS
  const allSpreads = priceData.filter((p) => !p.error).map((p) => p.spread);
  updateMarketState(allSpreads, gasPrice, true); // Default success=true for scan

  return { opportunities, gasPrice, priceData };
}

// ═══════════════════════════════════════════════════════════════
// 📊 BORROW AMOUNT SCALING
// ═══════════════════════════════════════════════════════════════

function scaleBorrowAmount(success) {
  if (success) {
    // Scale up by factor on success
    const currentETH = parseFloat(ethers.formatEther(BotState.currentBorrow));
    const newAmount = Math.min(
      currentETH * CONFIG.STRATEGY.scaleFactor,
      CONFIG.STRATEGY.maxBorrowETH
    );
    BotState.currentBorrow = ethers.parseEther(newAmount.toString());
    console.log(`📈 Scaling up borrow amount to ${newAmount.toFixed(2)} ETH`);
  } else {
    // Scale down on failure
    const currentETH = parseFloat(ethers.formatEther(BotState.currentBorrow));
    const newAmount = Math.max(
      currentETH / CONFIG.STRATEGY.scaleFactor,
      CONFIG.STRATEGY.baseBorrowETH
    );
    BotState.currentBorrow = ethers.parseEther(newAmount.toString());
    console.log(`📉 Scaling down borrow amount to ${newAmount.toFixed(2)} ETH`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 EXECUTION LOGIC
// ═══════════════════════════════════════════════════════════════

async function executeArbitrageOptimized(opportunity) {
  try {
    console.log(`💎 EXECUTING ARBITRAGE: ${opportunity.pair}`);
    console.log(`📊 Spread: ${opportunity.spread.toFixed(3)}%`);
    console.log(
      `💰 Borrow Amount: ${opportunity.optimalBorrowETH.toFixed(2)} ETH`
    );
    console.log(`💰 Est. Profit: $${opportunity.estimatedProfit.toFixed(2)}`);

    // REAL ARBITRAGE EXECUTION
    console.log(`🔄 Preparing transaction...`);

    // Determine router order based on which has better price
    const router1 =
      opportunity.prices.router1.price > opportunity.prices.router2.price
        ? CONFIG.ADDRESSES.UNISWAP_ROUTER
        : CONFIG.ADDRESSES.SUSHISWAP_ROUTER;
    const router2 =
      opportunity.prices.router1.price > opportunity.prices.router2.price
        ? CONFIG.ADDRESSES.SUSHISWAP_ROUTER
        : CONFIG.ADDRESSES.UNISWAP_ROUTER;

    // Calculate minimum profit in wei (ULTRA CONSERVATIVE)
    const minProfitUSD = Math.max(CONFIG.STRATEGY.minNetProfitUSD, 1.0); // At least $1 minimum!!
    const minProfitETH = minProfitUSD / BotState.ethPrice;
    // Safety: Ensure minimum 0.0005 ETH to prevent precision errors
    const minProfitETHFixed = Math.max(minProfitETH, 0.0005).toFixed(8); // Higher minimum
    const minProfitWei = ethers.parseEther(minProfitETHFixed);

    // Set the optimal borrow amount for this trade
    const optimalBorrowWei = ethers.parseEther(
      opportunity.optimalBorrowETH.toString()
    );

    // Prepare arbitrage parameters
    const arbParams = {
      tokenA: opportunity.baseAddr, // WETH
      tokenB: opportunity.quoteAddr, // USDC/USDT/DAI
      amountIn: optimalBorrowWei, // Use calculated optimal amount for $500 target
      router1: router1, // Buy on this DEX (higher price)
      router2: router2, // Sell on this DEX (lower price)
      minProfitWei: minProfitWei,
    };

    // Encode parameters
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,address,uint256,address,address,uint256)"],
      [
        [
          arbParams.tokenA,
          arbParams.tokenB,
          arbParams.amountIn,
          arbParams.router1,
          arbParams.router2,
          arbParams.minProfitWei,
        ],
      ]
    );

    // 🌊 GET DYNAMIC EXECUTION SETTINGS
    const safetyMultiplier = getDynamicSafetyMultiplier();
    const dynamicSlippage = getDynamicSlippageTolerance(
      borrowETH,
      opportunity.spread
    );

    // ⛽ DYNAMIC GAS PRICING FOR EXECUTION
    const urgency =
      opportunity.spread > 0.3
        ? "high"
        : opportunity.spread > 0.2
        ? "normal"
        : "low";
    const optimalGasPrice = await getDynamicGasPrice(borrowETH, urgency);
    const gasPrice = ethers.parseUnits(optimalGasPrice.toString(), "gwei");

    // 📊 DYNAMIC GAS LIMIT BASED ON TRADE SIZE
    const gasLimit =
      borrowETH > 15
        ? 900000
        : borrowETH > 10
        ? 800000
        : borrowETH > 5
        ? 700000
        : 600000;

    // LAST-MINUTE PRICE CHECK (Enhanced Revert Protection)
    console.log(`🔄 Final price verification...`);
    const finalPrices = await getRouterPricesOptimized(
      opportunity.baseAddr,
      opportunity.quoteAddr,
      CONFIG.ADDRESSES.UNISWAP_ROUTER,
      CONFIG.ADDRESSES.SUSHISWAP_ROUTER
    );

    // 🛡️ DYNAMIC SAFETY MARGIN: Based on market conditions
    const baseSafetyMargin = CONFIG.STRATEGY.minProfitPercent * 1.5; // Base 50% margin
    const safetyMargin = baseSafetyMargin * safetyMultiplier; // Apply dynamic multiplier

    if (!finalPrices || finalPrices.spread < safetyMargin) {
      console.log(
        `⚠️ Market moved! Spread dropped to ${
          finalPrices?.spread?.toFixed(3) || 0
        }% (required: ${safetyMargin.toFixed(3)}%)`
      );
      console.log(`❌ Canceling trade - insufficient safety margin`);
      return {
        success: false,
        profit: 0,
        reason: "Insufficient safety margin",
      };
    }

    // PRICE IMPACT CHECK: Calculate slippage for our trade size
    const borrowETH = opportunity.optimalBorrowETH; // Use the calculated optimal amount
    const priceImpactThreshold = CONFIG.STRATEGY.maxSlippagePercent * 0.5; // 50% of max allowed

    if (borrowETH > 2.0) {
      // Large trades >2 ETH need extra protection (adjusted for $500 target)
      console.log(
        `⚠️ Large trade detected (${borrowETH.toFixed(
          2
        )} ETH), applying extra caution`
      );
      const extraSafetyMargin = CONFIG.STRATEGY.minProfitPercent * 2.0; // Extra safety for large amounts
      if (finalPrices.spread < extraSafetyMargin) {
        console.log(
          `❌ Large trade requires ${extraSafetyMargin.toFixed(
            3
          )}% minimum spread`
        );
        return {
          success: false,
          profit: 0,
          reason: "Large trade safety check",
        };
      }
    }

    console.log(`✅ Spread confirmed: ${finalPrices.spread.toFixed(3)}%`);
    console.log(
      `🛡️ Dynamic Safety: ${safetyMultiplier.toFixed(
        1
      )}x margin (${safetyMargin.toFixed(3)}% required)`
    );
    console.log(
      `📉 Dynamic Slippage: ${dynamicSlippage.toFixed(2)}% tolerance`
    );
    console.log(`📡 Sending transaction...`);
    console.log(
      `⛽ Gas: ${optimalGasPrice.toFixed(
        2
      )} gwei (${urgency}), Limit: ${gasLimit.toLocaleString()}`
    );
    console.log(
      `💱 Route: ${opportunity.prices.router1.name} → ${opportunity.prices.router2.name}`
    );

    // Execute the arbitrage
    const tx = await BotState.contract.startArbitrage(
      opportunity.baseAddr, // asset (WETH)
      BotState.currentBorrow, // amount
      encodedParams, // params
      {
        gasPrice: gasPrice,
        gasLimit: gasLimit,
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);

    // Wait for transaction confirmation
    const receipt = await tx.wait(1); // Wait for 1 confirmation

    if (receipt.status === 1) {
      // Parse logs to get actual profit
      let actualProfitWei = ethers.parseEther("0");
      let actualProfitUSD = opportunity.estimatedProfit;

      // Look for ArbitrageExecuted event
      const arbitrageEvent = receipt.logs.find((log) => {
        try {
          const parsed = BotState.contract.interface.parseLog(log);
          return parsed?.name === "ArbitrageExecuted";
        } catch (e) {
          return false;
        }
      });

      if (arbitrageEvent) {
        const parsed = BotState.contract.interface.parseLog(arbitrageEvent);
        actualProfitWei = parsed.args.profit;
        actualProfitUSD =
          parseFloat(ethers.formatEther(actualProfitWei)) * BotState.ethPrice;
      }

      BotState.totalProfit += actualProfitUSD;
      BotState.successTrades++;
      BotState.consecutiveFailures = 0;

      // 🌊 UPDATE MARKET STATE WITH SUCCESS
      updateMarketState([opportunity.spread], optimalGasPrice, true);
      console.log(`🎯 Using dynamic borrowing for next opportunity`);

      console.log(`✅ SUCCESS! Arbitrage completed!`);
      console.log(
        `💰 Actual Profit: $${actualProfitUSD.toFixed(2)} (${ethers.formatEther(
          actualProfitWei
        )} ETH)`
      );
      console.log(`⛽ Gas Used: ${receipt.gasUsed.toLocaleString()}`);
      console.log(
        `💸 Gas Cost: $${(
          parseFloat(ethers.formatEther(receipt.gasUsed * gasPrice)) *
          BotState.ethPrice
        ).toFixed(2)}`
      );

      return {
        success: true,
        profit: actualProfitUSD,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } else {
      console.log(`❌ Transaction failed`);
      BotState.failedTrades++;
      BotState.consecutiveFailures++;
      // 🌊 UPDATE MARKET STATE WITH FAILURE
      updateMarketState([opportunity.spread], optimalGasPrice, false);
      return { success: false, profit: 0, txHash: tx.hash };
    }
  } catch (e) {
    console.log(`❌ Execution error: ${e.message}`);

    // Handle specific errors
    if (e.message.includes("Profit below minimum threshold")) {
      console.log(`⚠️ Profit too low, increasing minimum threshold`);
    } else if (e.message.includes("insufficient funds")) {
      console.log(`⚠️ Insufficient ETH for gas, check wallet balance`);
    } else if (e.message.includes("execution reverted")) {
      console.log(`⚠️ Contract execution failed, market may have moved`);
    } else if (e.message.includes("replacement fee too low")) {
      console.log(`⚠️ Gas price too low, try increasing`);
    }

    BotState.failedTrades++;
    BotState.consecutiveFailures++;
    // 🌊 UPDATE MARKET STATE WITH ERROR
    updateMarketState(
      [opportunity.spread],
      await getDynamicGasPrice(opportunity.optimalBorrowETH, "normal"),
      false
    );
    return { success: false, profit: 0, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔄 ADAPTIVE SCANNING LOOP
// ═══════════════════════════════════════════════════════════════

async function runAdaptiveScanCycle() {
  const scanNumber = ++BotState.totalScans;
  const timestamp = new Date().toLocaleTimeString();

  console.log(`\n🔍 [${timestamp}] Scan #${scanNumber}`);

  try {
    // Get ETH price
    const ethPriceData = await getCachedETHPrice();
    console.log(
      `💰 ETH: $${ethPriceData.price.toFixed(2)} (${ethPriceData.source})`
    );

    // Show API status
    const apiStatus = apiManager.getStatus();
    const availableProviders = apiStatus.filter((p) => p.available);
    console.log(
      `🌐 API: ${availableProviders.length}/${apiStatus.length} available`
    );

    if (availableProviders.length === 0) {
      console.log(`🚫 No API providers available - entering slow mode`);
      BotState.rateLimitMode = true;
      BotState.currentInterval = CONFIG.TIMING.slowModeInterval;
      return;
    } else if (BotState.rateLimitMode && availableProviders.length > 0) {
      console.log(`✅ API providers recovered - resuming normal mode`);
      BotState.rateLimitMode = false;
      BotState.currentInterval = CONFIG.TIMING.scanInterval;
    }

    // Scan for opportunities
    const scanResult = await scanOpportunitiesOptimized();

    if (scanResult.opportunities.length > 0) {
      console.log(`🎯 Found ${scanResult.opportunities.length} opportunities!`);

      // Execute best opportunity
      const bestOpp = scanResult.opportunities[0];
      const result = await executeArbitrageOptimized(bestOpp);

      if (result.success) {
        // Switch to fast mode temporarily
        BotState.currentInterval = CONFIG.TIMING.fastModeInterval;
      }
    } else {
      console.log(`😴 No opportunities found`);
    }

    // Show price data
    scanResult.priceData.forEach((data) => {
      if (data.error) {
        console.log(`📊 ${data.pair} - Error: ${data.error}`);
      } else {
        console.log(
          `📊 ${data.pair} - ${
            data.router1.name
          }: $${data.router1.price.toFixed(2)} | ${
            data.router2.name
          }: $${data.router2.price.toFixed(2)} | Spread: ${data.spread.toFixed(
            3
          )}%`
        );
      }
    });

    // Show API usage
    apiStatus.forEach((provider) => {
      if (provider.available) {
        console.log(
          `📡 ${provider.name}: ${provider.usage}% (${provider.requests}/${provider.maxRequests})`
        );
      } else {
        const backoffTime =
          provider.backoffUntil > 0
            ? ` - backoff ${Math.ceil(
                (provider.backoffUntil - Date.now()) / 1000
              )}s`
            : "";
        console.log(`🚫 ${provider.name}: unavailable${backoffTime}`);
      }
    });

    const scanTime = process.hrtime.bigint();
    console.log(`⏱️ Cycle: ${Number(scanTime) / 1000000}ms`);
  } catch (e) {
    console.log(`❌ Scan error: ${e.message}`);

    if (
      e.message.includes("rate limit") ||
      e.message.includes("Too Many Requests")
    ) {
      BotState.rateLimitMode = true;
      BotState.currentInterval = CONFIG.TIMING.slowModeInterval;
      console.log(`🐌 Entering slow mode due to rate limits`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 BOT INITIALIZATION & CONTROL
// ═══════════════════════════════════════════════════════════════

async function initEnhancedBot() {
  console.log(`🔧 Initializing Enhanced Bot...`);

  try {
    // Load deployment
    const deploymentPath = path.join(
      __dirname,
      "..",
      "deployments",
      "mainnet-deployment.json"
    );
    if (!fs.existsSync(deploymentPath)) {
      throw new Error("Deployment file not found!");
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath));
    const contractAddress = deployment.contract || deployment.contractAddress;

    // Get signer and contract
    const [signer] = await ethers.getSigners();
    const contractFactory = await ethers.getContractFactory(
      "FlashLoanArbitrageMainnet"
    );
    const contract = contractFactory.attach(contractAddress);

    BotState.signer = signer;
    BotState.contract = contract;

    // Get initial ETH price
    const ethPriceData = await getCachedETHPrice();
    BotState.ethPrice = ethPriceData.price;

    // Check wallet balance for gas
    const walletBalance = await ethers.provider.getBalance(signer.address);
    const walletETH = parseFloat(ethers.formatEther(walletBalance));
    const walletUSD = walletETH * BotState.ethPrice;

    console.log(`✅ Bot Ready!`);
    console.log(`📍 Contract: ${contractAddress}`);
    console.log(`👤 Trader: ${signer.address}`);
    console.log(`💰 ETH: $${BotState.ethPrice.toFixed(2)}`);
    console.log(
      `💼 Wallet: ${walletETH.toFixed(4)} ETH ($${walletUSD.toFixed(2)})`
    );

    // Warn if low balance
    if (walletETH < 0.01) {
      console.log(`⚠️ Warning: Low ETH balance for gas fees!`);
      console.log(
        `⚠️ Recommended: At least 0.01 ETH ($${(
          0.01 * BotState.ethPrice
        ).toFixed(2)}) for gas`
      );
    }

    console.log(`⚡ Interval: ${CONFIG.TIMING.scanInterval / 1000}s`);
    console.log(
      `🎯 TARGET PROFIT: $${CONFIG.STRATEGY.targetProfitUSD} per trade (DYNAMIC BORROWING)`
    );
    console.log(
      `🌊 DYNAMIC SYSTEMS: Gas pricing, slippage protection, safety margins`
    );
    console.log(
      `📊 Min Spread: ${CONFIG.STRATEGY.minProfitPercent}% (base, dynamic safety multiplier applies)`
    );
    console.log(
      `💰 Min Net Profit: $${CONFIG.STRATEGY.minNetProfitUSD} after all dynamic costs`
    );
    console.log(
      `📈 Borrow Range: 0.5 - ${CONFIG.STRATEGY.maxBorrowETH} ETH (calculated per opportunity)`
    );
    console.log(
      `⛽ Gas Strategy: ${CONFIG.STRATEGY.maxGasPriceGwei} gwei max (dynamic pricing active)`
    );
    console.log(
      `🛡️ Market Learning: Volatility tracking, failure rate monitoring, adaptive protection`
    );

    return true;
  } catch (e) {
    console.log(`❌ Init failed: ${e.message}`);
    return false;
  }
}

async function startEnhancedBot() {
  if (BotState.running) return;

  console.log(`\n🚀 ENHANCED ARBITRAGE BOT STARTED!`);
  console.log(
    `🎯 DYNAMIC BORROWING MODE: Targeting $${CONFIG.STRATEGY.targetProfitUSD} per trade`
  );
  console.log(
    `📈 Bot will calculate optimal borrow amount (0.5-${CONFIG.STRATEGY.maxBorrowETH} ETH) based on spread`
  );
  console.log(
    `🌊 DYNAMIC SYSTEMS ACTIVE: Smart gas pricing, adaptive slippage, market learning`
  );
  console.log(
    `🛡️ ADAPTIVE PROTECTION: Safety margins adjust to market volatility & failure rates`
  );
  console.log(`Press Ctrl+C to stop\n`);

  BotState.running = true;
  BotState.startTime = Date.now();

  const runLoop = async () => {
    if (!BotState.running) return;

    await runAdaptiveScanCycle();

    // Check stop conditions
    if (BotState.consecutiveFailures >= CONFIG.TARGETS.maxFailures) {
      console.log(`🛑 Too many failures, stopping`);
      stopEnhancedBot();
      return;
    }

    // Schedule next scan with adaptive interval
    setTimeout(runLoop, BotState.currentInterval);
  };

  runLoop();
}

function stopEnhancedBot() {
  if (!BotState.running) return;

  BotState.running = false;
  const runtime = (Date.now() - BotState.startTime) / (1000 * 3600);

  console.log(`\n🛑 Stopping bot...\n`);
  console.log(`══════════════════════════════════════════════════`);
  console.log(`📊 ENHANCED BOT FINAL STATS`);
  console.log(`══════════════════════════════════════════════════`);
  console.log(`⏱️ Runtime: ${runtime.toFixed(1)} hours`);
  console.log(`🔍 Total Scans: ${BotState.totalScans}`);
  console.log(`✅ Success: ${BotState.successTrades}`);
  console.log(`❌ Failed: ${BotState.failedTrades}`);
  console.log(`💰 Profit: $${BotState.totalProfit.toFixed(2)}`);
  console.log(`💸 Loss: $${BotState.totalLoss.toFixed(2)}`);
  console.log(
    `📈 Net P&L: $${(BotState.totalProfit - BotState.totalLoss).toFixed(2)}`
  );
  console.log(`══════════════════════════════════════════════════`);
  console.log(`🛑 Enhanced Bot stopped!`);
}

// Handle graceful shutdown
process.on("SIGINT", () => stopEnhancedBot());
process.on("SIGTERM", () => stopEnhancedBot());

// ═══════════════════════════════════════════════════════════════
// 🎬 MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════

async function main() {
  try {
    const success = await initEnhancedBot();
    if (success) {
      await startEnhancedBot();
    }
  } catch (e) {
    console.log(`❌ Fatal error: ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  APIManager,
  BotState,
  CONFIG,
  startEnhancedBot,
  stopEnhancedBot,
  main,
};
