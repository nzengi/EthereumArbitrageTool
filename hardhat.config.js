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
      url: process.env.ETHEREUM_RPC_URL || "https://sepolia.infura.io/v3/4bcf9d0577da4ecc8ce07d76ca8b94e0",
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY.replace('0x', '')}`] : ["0xd9041cc00f04b3c131baa5dfaff3228f90689b71e4940b2bac0b5557de6d0fb2"],
      gasPrice: 20000000000, // 20 gwei
      chainId: 11155111
    },
    hardhat: {
      chainId: 31337
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
