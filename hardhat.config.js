require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url:
        process.env.SEPOLIA_RPC_URL ||
        "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000, // 20 gwei
      chainId: 11155111,
    },
    mainnet: {
      url:
        process.env.MAINNET_RPC_URL ||
        process.env.ALCHEMY_RPC_URL ||
        "https://mainnet.infura.io/v3/7a01b081b19346deb6d774f2288c8800",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      maxFeePerGas: 25000000000, // 25 gwei - Ultra Bot için yeterli
      maxPriorityFeePerGas: 2000000000, // 2 gwei priority
      gas: 500000, // Arbitraj için optimize
      timeout: 60000, // 1 dakika - hızlı execution
      blockGasLimit: 30000000, // Mainnet block limit
    },
    "mainnet-ultra": {
      // Ultra Bot için optimize edilmiş mainnet
      url:
        process.env.ALCHEMY_RPC_URL ||
        process.env.MAINNET_RPC_URL ||
        "https://eth-mainnet.g.alchemy.com/v2/AuVUEeQepgc5IR7tW6zpn",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      maxFeePerGas: 20000000000, // 20 gwei max - bot kontrolü
      maxPriorityFeePerGas: 1500000000, // 1.5 gwei priority
      gas: 450000, // Bot'un kullandığı gas limit
      timeout: 30000, // 30 saniye - çok hızlı
      chainId: 1,
    },
    hardhat: {
      chainId: 31337,
      forking: {
        url:
          process.env.ETHEREUM_RPC_URL ||
          "https://mainnet.infura.io/v3/7a01b081b19346deb6d774f2288c8800",
        blockNumber: undefined, // Latest block
      },
      gas: 30000000, // Max gas for testing
      gasPrice: 20000000000, // 20 gwei for testing
      blockGasLimit: 30000000,
      allowUnlimitedContractSize: true,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  mocha: {
    timeout: 120000, // 2 dakika test timeout
  },
  // Ultra Bot için performans optimizasyonları
  defaultNetwork: "mainnet",
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
};
