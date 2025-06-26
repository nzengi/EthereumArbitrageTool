use anyhow::{anyhow, Result};
use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct EthPriceResponse {
    ethereum: EthereumPrice,
}

#[derive(Debug, Deserialize)]
struct EthereumPrice {
    usd: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GasEstimate {
    pub standard: u64,
    pub fast: u64,
    pub instant: u64,
}

pub async fn estimate_eth_price() -> Result<f64> {
    let client = reqwest::Client::new();
    
    let response = client
        .get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
        .send()
        .await
        .map_err(|e| anyhow!("Failed to fetch ETH price: {}", e))?;

    let price_data: EthPriceResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse ETH price response: {}", e))?;

    Ok(price_data.ethereum.usd)
}

pub async fn get_gas_prices() -> Result<GasEstimate> {
    // In a production environment, you would use a gas price API like:
    // - ETH Gas Station
    // - Blocknative
    // - Or your Ethereum node's gas price estimation
    
    // For now, return reasonable default values
    Ok(GasEstimate {
        standard: 30, // 30 gwei
        fast: 40,     // 40 gwei
        instant: 60,  // 60 gwei
    })
}

pub fn calculate_gas_cost_usd(gas_used: u64, gas_price_gwei: u64, eth_price_usd: f64) -> f64 {
    let gas_cost_eth = (gas_used as f64) * (gas_price_gwei as f64) * 1e-9;
    gas_cost_eth * eth_price_usd
}

pub fn estimate_total_arbitrage_gas() -> u64 {
    // Flash loan: ~100,000 gas
    // DEX swap 1: ~150,000 gas
    // DEX swap 2: ~150,000 gas
    // Contract overhead: ~50,000 gas
    450000
}
