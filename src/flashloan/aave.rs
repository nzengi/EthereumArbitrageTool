use super::FlashLoanProvider;
use crate::config::Config;
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use ethers::prelude::*;
use log::{debug, info};
use std::sync::Arc;

pub struct AaveFlashLoan {
    client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>,
    pool_address: Address,
    contract_address: Address,
}

impl AaveFlashLoan {
    pub async fn new(
        client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>,
        config: Config,
    ) -> Result<Self> {
        let pool_address: Address = config.flashloan.aave_pool_address.parse()?;
        let contract_address: Address = config.flashloan.contract_address.parse()?;

        Ok(Self {
            client,
            pool_address,
            contract_address,
        })
    }

    pub async fn execute_arbitrage(
        &self,
        token_in: Address,
        token_out: Address,
        loan_amount: U256,
        buy_dex: &str,
        sell_dex: &str,
    ) -> Result<[u8; 32]> {
        info!("🔄 Initiating flash loan arbitrage");
        debug!("Token In: {:?}, Token Out: {:?}", token_in, token_out);
        debug!("Loan Amount: {}", loan_amount);
        debug!("Buy DEX: {}, Sell DEX: {}", buy_dex, sell_dex);

        // Encode arbitrage parameters
        let arbitrage_params = self.encode_arbitrage_params(
            token_in,
            token_out,
            buy_dex,
            sell_dex,
        )?;

        // Execute flash loan through our arbitrage contract
        let arbitrage_contract = IFlashLoanArbitrage::new(self.contract_address, self.client.clone());
        
        let tx = arbitrage_contract
            .start_arbitrage(token_in, loan_amount, arbitrage_params)
            .gas(500000) // Set high gas limit for complex arbitrage
            .send()
            .await
            .map_err(|e| anyhow!("Failed to execute flash loan arbitrage: {}", e))?;

        let tx_hash = tx.tx_hash();
        
        // Wait for transaction confirmation
        info!("⏳ Waiting for transaction confirmation...");
        let receipt = tx.confirmations(1).await?;
        
        if let Some(receipt) = receipt {
            if receipt.status == Some(U256::from(1)) {
                info!("✅ Flash loan arbitrage completed successfully");
                return Ok(tx_hash.0);
            } else {
                return Err(anyhow!("Transaction failed"));
            }
        }

        Err(anyhow!("Transaction receipt not available"))
    }

    fn encode_arbitrage_params(
        &self,
        token_in: Address,
        token_out: Address,
        buy_dex: &str,
        sell_dex: &str,
    ) -> Result<Bytes> {
        // Encode parameters for the arbitrage contract
        let params = (
            token_in,
            token_out,
            buy_dex.to_string(),
            sell_dex.to_string(),
        );

        // In a real implementation, you would use ABI encoding
        // For now, we'll create a simple byte representation
        let encoded = ethers::abi::encode(&[
            ethers::abi::Token::Address(token_in),
            ethers::abi::Token::Address(token_out),
            ethers::abi::Token::String(buy_dex.to_string()),
            ethers::abi::Token::String(sell_dex.to_string()),
        ]);

        Ok(Bytes::from(encoded))
    }
}

#[async_trait]
impl FlashLoanProvider for AaveFlashLoan {
    async fn execute_flash_loan(
        &self,
        asset: Address,
        amount: U256,
        params: Vec<u8>,
    ) -> Result<[u8; 32]> {
        let pool = IAavePool::new(self.pool_address, self.client.clone());
        
        let tx = pool
            .flash_loan(
                self.contract_address,
                vec![asset],
                vec![amount],
                vec![U256::from(0)], // Interest rate mode (0 for no debt)
                Address::zero(),
                Bytes::from(params),
                U256::from(0),
            )
            .gas(400000)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to execute flash loan: {}", e))?;

        Ok(tx.tx_hash().0)
    }

    async fn get_available_liquidity(&self, asset: Address) -> Result<U256> {
        let pool = IAavePool::new(self.pool_address, self.client.clone());
        
        // Get reserve data to check available liquidity
        let reserve_data = pool
            .get_reserve_data(asset)
            .call()
            .await
            .map_err(|e| anyhow!("Failed to get reserve data: {}", e))?;

        // The available liquidity is typically stored in the reserve data
        // This is a simplified version - in practice you'd need to parse the full reserve data structure
        Ok(reserve_data.0) // Assuming first field is available liquidity
    }

    async fn get_flash_loan_fee(&self, asset: Address, amount: U256) -> Result<U256> {
        // Aave V3 flash loan fee is typically 0.05% (5 basis points)
        let fee_rate = U256::from(5); // 0.05% = 5/10000
        let fee = amount * fee_rate / U256::from(10000);
        Ok(fee)
    }
}

// Aave Pool interface
abigen!(
    IAavePool,
    r#"[
        function flashLoan(address receiverAddress, address[] calldata assets, uint256[] calldata amounts, uint256[] calldata interestRateModes, address onBehalfOf, bytes calldata params, uint16 referralCode) external
        function getReserveData(address asset) external view returns (tuple(uint256,uint128,uint128,uint128,uint128,uint128,uint40,uint16,address,address,address,address,uint128,uint128,uint128))
    ]"#
);

// Flash Loan Arbitrage Contract interface
abigen!(
    IFlashLoanArbitrage,
    r#"[
        function startArbitrage(address asset, uint256 amount, bytes calldata params) external
    ]"#
);
