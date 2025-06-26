pub mod gas;
pub mod logger;

use ethers::types::U256;

pub fn wei_to_eth(wei: U256) -> f64 {
    wei.as_u128() as f64 / 1e18
}

pub fn eth_to_wei(eth: f64) -> U256 {
    U256::from((eth * 1e18) as u64)
}

pub fn format_token_amount(amount: U256, decimals: u8) -> f64 {
    let divisor = 10_u128.pow(decimals as u32);
    amount.as_u128() as f64 / divisor as f64
}

pub fn calculate_percentage_change(old_value: f64, new_value: f64) -> f64 {
    if old_value == 0.0 {
        return 0.0;
    }
    ((new_value - old_value) / old_value) * 100.0
}
