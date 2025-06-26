# Ethereum Flash Loan Arbitrage Bot

A high-performance Rust-based arbitrage bot that executes flash loan arbitrage between multiple DEXes on Ethereum. The bot monitors price differences across Uniswap V2, SushiSwap, and Curve, then executes profitable arbitrage opportunities using Aave V3 flash loans.

## 🚀 Features

- **Real-time DEX Price Monitoring**: Tracks prices across multiple DEXes
- **Flash Loan Integration**: Uses Aave V3 for zero-capital arbitrage
- **Gas Optimization**: Intelligent gas price management and MEV protection
- **Risk Management**: Slippage protection and profitability validation
- **High Performance**: Written in Rust for maximum execution speed
- **Comprehensive Logging**: Detailed execution logs and statistics

## 📋 Prerequisites

- Rust 1.70+ installed
- Node.js 18+ (for smart contract deployment)
- Ethereum wallet with ETH for gas fees
- Infura or Alchemy RPC endpoint
- Etherscan API key (optional, for contract verification)

## 🛠️ Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd ethereum-flashloan-arbitrage-bot
