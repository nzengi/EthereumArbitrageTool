pub mod uniswap;
pub mod sushiswap;

use anyhow::Result;
use async_trait::async_trait;
use ethers::types::{Address, U256};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DexPrice {
    pub dex_name: String,
    pub token_in: Address,
    pub token_out: Address,
    pub amount_in: U256,
    pub amount_out: U256,
    pub price_per_token: f64,
    pub gas_estimate: U256,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapRoute {
    pub dex_name: String,
    pub router_address: Address,
    pub path: Vec<Address>,
    pub amount_in: U256,
    pub amount_out_min: U256,
    pub gas_estimate: U256,
}

#[async_trait]
pub trait DexInterface {
    async fn get_price(&self, token_in: Address, token_out: Address, amount_in: U256) -> Result<DexPrice>;
    async fn get_swap_route(&self, token_in: Address, token_out: Address, amount_in: U256) -> Result<SwapRoute>;
    async fn execute_swap(&self, route: &SwapRoute) -> Result<ethers::types::H256>;
    fn get_name(&self) -> &str;
}

pub fn calculate_price_impact(amount_in: U256, amount_out: U256, market_price: f64) -> f64 {
    let actual_price = amount_out.as_u128() as f64 / amount_in.as_u128() as f64;
    ((market_price - actual_price) / market_price * 100.0).abs()
}
