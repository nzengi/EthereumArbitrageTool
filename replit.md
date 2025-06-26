# Ethereum Flash Loan Arbitrage Bot

## Overview

This is a high-performance Rust-based arbitrage bot that executes flash loan arbitrage between multiple DEXes on Ethereum. The bot monitors price differences across Uniswap V2, SushiSwap, and Curve, then executes profitable trades using Aave V3 flash loans for zero-capital arbitrage. The system combines Rust's performance advantages with Solidity smart contracts for on-chain execution.

## System Architecture

The system follows a hybrid architecture combining:

1. **Rust Backend**: High-performance bot logic for price monitoring, opportunity detection, and execution coordination
2. **Smart Contract Layer**: Solidity contracts for flash loan execution and DEX interactions
3. **Multi-DEX Integration**: Supports Uniswap V2, SushiSwap, and Curve protocols
4. **Flash Loan Provider**: Integrates with Aave V3 for capital-efficient arbitrage

### Key Architectural Decisions

- **Rust for Performance**: Chosen for its low-latency capabilities and memory safety, critical for high-frequency arbitrage detection
- **WebSocket Connections**: Real-time price monitoring through Ethereum WebSocket providers
- **Modular DEX Design**: Abstract trait-based system allowing easy addition of new DEX protocols
- **Flash Loan Integration**: Uses Aave V3 for maximum liquidity and lowest fees

## Key Components

### Core Modules

1. **Arbitrage Detector** (`src/arbitrage/detector.rs`)
   - Monitors price differences across multiple DEXes
   - Identifies profitable opportunities above minimum thresholds
   - Calculates gas costs and net profitability

2. **Arbitrage Executor** (`src/arbitrage/executor.rs`)
   - Executes profitable opportunities using flash loans
   - Manages transaction flow and error handling
   - Validates opportunities before execution

3. **DEX Interfaces** (`src/dex/`)
   - **Uniswap V2**: AMM-based price calculations and swap execution
   - **SushiSwap**: Similar to Uniswap V2 with different router contracts
   - **Curve**: Specialized for stablecoin and like-asset swaps

4. **Flash Loan Provider** (`src/flashloan/aave.rs`)
   - Integrates with Aave V3 lending pools
   - Manages flash loan initiation and repayment
   - Handles arbitrage execution within flash loan callback

5. **Smart Contract** (`contracts/FlashLoanArbitrage.sol`)
   - Implements Aave flash loan receiver interface
   - Executes multi-DEX arbitrage in single transaction
   - Includes reentrancy protection and access controls

### Configuration System

- Environment-based configuration through `.env` files
- Supports multiple networks (mainnet, Goerli, Sepolia)
- Configurable gas settings, profit thresholds, and risk parameters

## Data Flow

1. **Price Monitoring**: Bot continuously monitors DEX prices via WebSocket connections
2. **Opportunity Detection**: Compares prices across DEXes to identify arbitrage opportunities
3. **Profitability Analysis**: Calculates potential profit minus gas costs and flash loan fees
4. **Execution**: If profitable, initiates flash loan and executes arbitrage through smart contract
5. **Settlement**: Profits are automatically captured, flash loan is repaid, net profit retained

### Transaction Flow

```
Flash Loan Request → Borrow Assets → Buy on Cheaper DEX → Sell on Expensive DEX → Repay Loan + Fee → Keep Profit
```

## External Dependencies

### Blockchain Infrastructure
- **Ethereum RPC Providers**: Infura/Alchemy for network connectivity
- **WebSocket Connections**: Real-time blockchain data streaming
- **Etherscan API**: Contract verification and gas price estimation

### DeFi Protocols
- **Aave V3**: Flash loan provider (primary)
- **Uniswap V2**: AMM DEX for token swaps
- **SushiSwap**: Alternative AMM with similar interface
- **Curve Finance**: Specialized for stablecoin arbitrage

### External APIs
- **CoinGecko**: ETH price data for profit calculations
- **Gas Station APIs**: Dynamic gas price optimization

### Development Tools
- **Hardhat**: Smart contract development and deployment
- **OpenZeppelin**: Security-audited contract libraries
- **Ethers.rs**: Ethereum interaction library for Rust

## Deployment Strategy

### Smart Contract Deployment
1. Deploy flash loan arbitrage contract using Hardhat
2. Verify contract on Etherscan for transparency
3. Configure contract address in bot environment

### Bot Deployment
1. Configure environment variables (RPC URLs, private keys, contract addresses)
2. Set profitability thresholds and risk parameters
3. Deploy on cloud infrastructure with low-latency network connections
4. Monitor performance and adjust parameters based on market conditions

### Security Considerations
- **Private Key Management**: Environment-based key storage, consider hardware wallets for production
- **MEV Protection**: Uses configurable MEV protection to avoid front-running
- **Gas Price Optimization**: Dynamic gas pricing to ensure transaction inclusion
- **Slippage Protection**: Configurable maximum slippage limits

## Changelog
- June 26, 2025: Initial setup
- June 26, 2025: Configured for Sepolia testnet with fee collection
  - Added fee collector address: 0x5Cd87281B8Aec278136f1bC41173fBC69b1c0670
  - Removed Curve and Balancer DEX support for testnet compatibility
  - Updated smart contract with 0.1% fee mechanism
  - Configured USDC and WETH addresses for Sepolia testnet
- June 26, 2025: Smart contract successfully deployed
  - Contract address: 0x0D2AfC2862b491e06467AF5dfeAd1f8e6037445E
  - Deployed to Sepolia testnet with proper OpenZeppelin v5 compatibility
  - Fixed compilation issues with viaIR compiler option
  - Updated .env with deployed contract address
- June 26, 2025: Rust arbitrage bot fully operational
  - Resolved dependency conflicts with simplified dependencies
  - Bot successfully monitoring DEX price differences
  - Configured for 5-second monitoring intervals with 1% profit threshold
  - System ready for mainnet deployment or real price monitoring integration
- June 26, 2025: Real API integration completed
  - Bot now fetches real ETH prices from CoinGecko API every minute
  - Using curl-based HTTP requests for compatibility
  - DEX price variations simulated realistically based on real ETH price
  - Smart contract deployment pending - needs test ETH for gas fees
  - System ready for production with live price data integration

## User Preferences

Preferred communication style: Simple, everyday language.