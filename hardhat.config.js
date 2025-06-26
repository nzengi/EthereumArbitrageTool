require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mainnet: {
      url: process.env.ETH_HTTP_RPC_URL || "https://mainnet.infura.io/v3/YOUR_API_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 30000000000, // 30 gwei
    },
    goerli: {
      url: process.env.GOERLI_RPC_URL || "https://goerli.infura.io/v3/YOUR_API_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000000, // 10 gwei
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_API_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000000, // 10 gwei
    },
    hardhat: {
      forking: {
        url: process.env.ETH_HTTP_RPC_URL || "https://mainnet.infura.io/v3/YOUR_API_KEY",
        blockNumber: 18500000, // Optional: pin to specific block
      },
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};
