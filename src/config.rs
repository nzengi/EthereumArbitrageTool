use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub ethereum: EthereumConfig,
    pub dex: DexConfig,
    pub arbitrage: ArbitrageConfig,
    pub flashloan: FlashLoanConfig,
    pub bot: BotConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EthereumConfig {
    pub http_rpc_url: String,
    pub ws_rpc_url: String,
    pub private_key: String,
    pub chain_id: u64,
    pub gas_price_gwei: u64,
    pub max_gas_limit: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DexConfig {
    pub uniswap_v2_router: String,
    pub uniswap_v3_factory: String,
    pub sushiswap_router: String,
    pub curve_registry: String,
    pub balancer_vault: String,
    pub one_inch_api_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArbitrageConfig {
    pub min_profit_usd: f64,
    pub max_slippage_percent: f64,
    pub trading_pairs: Vec<TradingPair>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingPair {
    pub token0: String,
    pub token1: String,
    pub symbol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashLoanConfig {
    pub aave_pool_address: String,
    pub contract_address: String,
    pub max_loan_amount_eth: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BotConfig {
    pub scan_interval_ms: u64,
    pub max_concurrent_trades: u32,
    pub enable_mev_protection: bool,
    pub flashbots_relay_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Config {
            ethereum: EthereumConfig {
                http_rpc_url: env::var("ETH_HTTP_RPC_URL")
                    .unwrap_or_else(|_| "https://mainnet.infura.io/v3/YOUR_API_KEY".to_string()),
                ws_rpc_url: env::var("ETH_WS_RPC_URL")
                    .unwrap_or_else(|_| "wss://mainnet.infura.io/ws/v3/YOUR_API_KEY".to_string()),
                private_key: env::var("PRIVATE_KEY")
                    .map_err(|_| anyhow!("PRIVATE_KEY environment variable is required"))?,
                chain_id: env::var("CHAIN_ID")
                    .unwrap_or_else(|_| "1".to_string())
                    .parse()?,
                gas_price_gwei: env::var("GAS_PRICE_GWEI")
                    .unwrap_or_else(|_| "30".to_string())
                    .parse()?,
                max_gas_limit: env::var("MAX_GAS_LIMIT")
                    .unwrap_or_else(|_| "500000".to_string())
                    .parse()?,
            },
            dex: DexConfig {
                uniswap_v2_router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D".to_string(),
                uniswap_v3_factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984".to_string(),
                sushiswap_router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F".to_string(),
                curve_registry: "0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5".to_string(),
                balancer_vault: "0xBA12222222228d8Ba445958a75a0704d566BF2C8".to_string(),
                one_inch_api_url: "https://api.1inch.dev/swap/v5.2/1".to_string(),
            },
            arbitrage: ArbitrageConfig {
                min_profit_usd: env::var("MIN_PROFIT_USD")
                    .unwrap_or_else(|_| "50.0".to_string())
                    .parse()?,
                max_slippage_percent: env::var("MAX_SLIPPAGE_PERCENT")
                    .unwrap_or_else(|_| "0.5".to_string())
                    .parse()?,
                trading_pairs: vec![
                    TradingPair {
                        token0: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9".to_string(), // WETH Sepolia
                        token1: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8".to_string(), // USDC Sepolia
                        symbol: "ETH/USDC".to_string(),
                    }
                ],
            },
            flashloan: FlashLoanConfig {
                aave_pool_address: "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A".to_string(), // Aave V3 Sepolia
                contract_address: env::var("FLASHLOAN_CONTRACT_ADDRESS")
                    .unwrap_or_else(|_| "0x0000000000000000000000000000000000000000".to_string()),
                max_loan_amount_eth: env::var("MAX_LOAN_AMOUNT_ETH")
                    .unwrap_or_else(|_| "100.0".to_string())
                    .parse()?,
            },
            bot: BotConfig {
                scan_interval_ms: env::var("SCAN_INTERVAL_MS")
                    .unwrap_or_else(|_| "1000".to_string())
                    .parse()?,
                max_concurrent_trades: env::var("MAX_CONCURRENT_TRADES")
                    .unwrap_or_else(|_| "3".to_string())
                    .parse()?,
                enable_mev_protection: env::var("ENABLE_MEV_PROTECTION")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()?,
                flashbots_relay_url: "https://relay.flashbots.net".to_string(),
            },
        })
    }
}
