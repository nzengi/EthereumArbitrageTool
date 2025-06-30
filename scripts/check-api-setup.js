const axios = require("axios");
require("dotenv").config();

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🔑 API SETUP CHECKER                      ║
║            Test your API keys before running bot             ║
╚══════════════════════════════════════════════════════════════╝
`);

async function checkInfuraAPI() {
  try {
    // Check for URL or API key format
    const infuraURL =
      process.env.ETHEREUM_RPC_URL || process.env.MAINNET_RPC_URL;
    const infuraKey = process.env.INFURA_API_KEY;

    let apiUrl;
    if (infuraURL && infuraURL.includes("infura.io")) {
      apiUrl = infuraURL;
      console.log(`✅ Found Infura URL in .env`);
    } else if (infuraKey && infuraKey !== "your_infura_api_key_here") {
      apiUrl = `https://mainnet.infura.io/v3/${infuraKey}`;
    } else {
      console.log(`❌ No valid Infura configuration found`);
      return false;
    }

    const response = await axios.post(apiUrl, {
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1,
    });

    if (response.data.result) {
      const blockNumber = parseInt(response.data.result, 16);
      console.log(`✅ Infura API: Working! Latest block: ${blockNumber}`);
      return true;
    } else {
      console.log(`❌ Infura API: Invalid response`);
      return false;
    }
  } catch (e) {
    console.log(`❌ Infura API: ${e.message}`);
    return false;
  }
}

async function checkAlchemyAPI() {
  try {
    // Check for URL or API key format
    const alchemyURL = process.env.ALCHEMY_API_URL;
    const alchemyKey = process.env.ALCHEMY_API_KEY;

    let apiUrl;
    if (alchemyURL && alchemyURL.includes("alchemy.com")) {
      apiUrl = alchemyURL;
      console.log(`✅ Found Alchemy URL in .env`);
    } else if (alchemyKey && alchemyKey !== "your_alchemy_api_key_here") {
      apiUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;
    } else {
      console.log(`❌ No valid Alchemy configuration found`);
      return false;
    }

    const response = await axios.post(apiUrl, {
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1,
    });

    if (response.data.result) {
      const blockNumber = parseInt(response.data.result, 16);
      console.log(`✅ Alchemy API: Working! Latest block: ${blockNumber}`);
      return true;
    } else {
      console.log(`❌ Alchemy API: Invalid response`);
      return false;
    }
  } catch (e) {
    console.log(`❌ Alchemy API: ${e.message}`);
    return false;
  }
}

async function checkBinanceAPI() {
  try {
    const response = await axios.get(
      "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
      {
        timeout: 5000,
      }
    );

    if (response.data.price) {
      const price = parseFloat(response.data.price);
      console.log(`✅ Binance API: Working! ETH Price: $${price.toFixed(2)}`);
      return true;
    } else {
      console.log(`❌ Binance API: Invalid response`);
      return false;
    }
  } catch (e) {
    console.log(`❌ Binance API: ${e.message}`);
    return false;
  }
}

async function checkPrivateKey() {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey || privateKey === "your_private_key_here") {
      console.log(`❌ PRIVATE_KEY not set in .env file`);
      return false;
    }

    if (privateKey.length !== 64 && privateKey.length !== 66) {
      console.log(`❌ PRIVATE_KEY invalid length (should be 64 or 66 chars)`);
      return false;
    }

    console.log(
      `✅ Private Key: Set correctly (${privateKey.substring(
        0,
        6
      )}...${privateKey.substring(privateKey.length - 4)})`
    );
    return true;
  } catch (e) {
    console.log(`❌ Private Key: ${e.message}`);
    return false;
  }
}

async function testAPIRateLimit() {
  console.log(`\n🧪 Testing API rate limits...`);

  const startTime = Date.now();
  let infuraRequests = 0;
  let alchemyRequests = 0;

  // Test Infura rate limit
  try {
    const infuraURL =
      process.env.ETHEREUM_RPC_URL ||
      process.env.MAINNET_RPC_URL ||
      `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;

    for (let i = 0; i < 10; i++) {
      await axios.post(infuraURL, {
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: i,
      });
      infuraRequests++;
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
    }
    console.log(
      `📊 Infura: ${infuraRequests}/10 requests successful in ${
        Date.now() - startTime
      }ms`
    );
  } catch (e) {
    console.log(
      `⚠️ Infura rate limit reached after ${infuraRequests} requests`
    );
  }

  // Test Alchemy rate limit
  try {
    const alchemyURL =
      process.env.ALCHEMY_API_URL ||
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const alchemyStartTime = Date.now();

    for (let i = 0; i < 10; i++) {
      await axios.post(alchemyURL, {
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: i,
      });
      alchemyRequests++;
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
    }
    console.log(
      `📊 Alchemy: ${alchemyRequests}/10 requests successful in ${
        Date.now() - alchemyStartTime
      }ms`
    );
  } catch (e) {
    console.log(
      `⚠️ Alchemy rate limit reached after ${alchemyRequests} requests`
    );
  }
}

async function showRecommendations() {
  console.log(`\n💡 RECOMMENDATIONS:`);
  console.log(`\n🎯 For Free Tier Users:`);
  console.log(`   • Use 30-45 second scan intervals`);
  console.log(`   • Enable aggressive caching (15-30s TTL)`);
  console.log(`   • Use multiple providers (Infura + Alchemy)`);
  console.log(`   • Monitor API usage in real-time`);

  console.log(`\n⚡ Free Tier Limits:`);
  console.log(`   • Infura: 100,000 requests/day (~69/minute)`);
  console.log(`   • Alchemy: 300M compute units/month (varies)`);
  console.log(`   • Binance: 1,200 requests/minute`);

  console.log(`\n🚀 Enhanced Bot Features:`);
  console.log(`   • Smart API rotation`);
  console.log(`   • Automatic backoff on rate limits`);
  console.log(`   • Adaptive scan intervals`);
  console.log(`   • Aggressive caching system`);
  console.log(`   • Real-time API monitoring`);
}

async function main() {
  console.log(`🔍 Checking API configurations...\n`);

  const results = [];

  results.push(await checkInfuraAPI());
  results.push(await checkAlchemyAPI());
  results.push(await checkBinanceAPI());
  results.push(await checkPrivateKey());

  const workingAPIs = results.filter(Boolean).length;

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`📊 SETUP STATUS: ${workingAPIs}/4 services working`);
  console.log(`══════════════════════════════════════════════════`);

  if (workingAPIs >= 3) {
    console.log(`✅ READY TO RUN! You can start the enhanced bot.`);
    console.log(`🚀 Command: npm run enhanced-bot`);

    if (process.env.INFURA_API_KEY && process.env.ALCHEMY_API_KEY) {
      await testAPIRateLimit();
    }
  } else {
    console.log(`❌ NOT READY! Fix the failing APIs first.`);
    console.log(`📝 Create/update your .env file with proper API keys.`);
  }

  await showRecommendations();
}

main().catch(console.error);
