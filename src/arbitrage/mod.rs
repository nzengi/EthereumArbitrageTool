pub mod detector;
pub mod executor;

use ethers::types::{Address, U256};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArbitrageOpportunity {
    pub id: String,
    pub token_in: Address,
    pub token_out: Address,
    pub buy_dex: String,
    pub sell_dex: String,
    pub amount_in: U256,
    pub buy_amount_out: U256,
    pub sell_amount_out: U256,
    pub estimated_profit: U256,
    pub estimated_profit_usd: f64,
    pub estimated_gas_cost: U256,
    pub estimated_gas_cost_usd: f64,
    pub profit_percentage: f64,
    pub timestamp: u64,
}

impl ArbitrageOpportunity {
    pub fn is_profitable(&self) -> bool {
        self.estimated_profit_usd > self.estimated_gas_cost_usd + 10.0 // Minimum $10 profit after gas
    }

    pub fn calculate_net_profit_usd(&self) -> f64 {
        self.estimated_profit_usd - self.estimated_gas_cost_usd
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub opportunity_id: String,
    pub tx_hash: String,
    pub executed_at: u64,
    pub actual_profit: Option<U256>,
    pub gas_used: Option<U256>,
    pub success: bool,
    pub error_message: Option<String>,
}
