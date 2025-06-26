pub mod aave;

use anyhow::Result;
use async_trait::async_trait;
use ethers::types::{Address, U256};

#[async_trait]
pub trait FlashLoanProvider {
    async fn execute_flash_loan(
        &self,
        asset: Address,
        amount: U256,
        params: Vec<u8>,
    ) -> Result<[u8; 32]>;
    
    async fn get_available_liquidity(&self, asset: Address) -> Result<U256>;
    async fn get_flash_loan_fee(&self, asset: Address, amount: U256) -> Result<U256>;
}
