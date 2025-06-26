use super::{DexInterface, DexPrice, SwapRoute};
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use ethers::prelude::*;
use log::debug;
use std::sync::Arc;

pub struct SushiSwap {
    client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>,
    router_address: Address,
}

impl SushiSwap {
    pub fn new(client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>, router_address: Address) -> Self {
        Self {
            client,
            router_address,
        }
    }

    async fn get_amounts_out(&self, amount_in: U256, path: Vec<Address>) -> Result<Vec<U256>> {
        let router = ISushiSwapRouter::new(self.router_address, self.client.clone());
        
        let amounts = router
            .get_amounts_out(amount_in, path)
            .call()
            .await
            .map_err(|e| anyhow!("Failed to get amounts out from SushiSwap: {}", e))?;
        
        Ok(amounts)
    }

    async fn estimate_gas_for_swap(&self, path: Vec<Address>, amount_in: U256, amount_out_min: U256) -> Result<U256> {
        let router = ISushiSwapRouter::new(self.router_address, self.client.clone());
        let deadline = U256::from(chrono::Utc::now().timestamp() + 300);
        
        let gas_estimate = router
            .swap_exact_tokens_for_tokens(
                amount_in,
                amount_out_min,
                path,
                self.client.address(),
                deadline,
            )
            .estimate_gas()
            .await
            .map_err(|e| anyhow!("Failed to estimate gas for SushiSwap: {}", e))?;
        
        Ok(gas_estimate)
    }
}

#[async_trait]
impl DexInterface for SushiSwap {
    async fn get_price(&self, token_in: Address, token_out: Address, amount_in: U256) -> Result<DexPrice> {
        let path = vec![token_in, token_out];
        let amounts = self.get_amounts_out(amount_in, path.clone()).await?;
        
        if amounts.len() < 2 {
            return Err(anyhow!("Invalid amounts returned from SushiSwap"));
        }
        
        let amount_out = amounts[1];
        let gas_estimate = self.estimate_gas_for_swap(path, amount_in, amount_out).await.unwrap_or(U256::from(180000));
        
        let price_per_token = amount_out.as_u128() as f64 / amount_in.as_u128() as f64;
        
        Ok(DexPrice {
            dex_name: "SushiSwap".to_string(),
            token_in,
            token_out,
            amount_in,
            amount_out,
            price_per_token,
            gas_estimate,
            timestamp: chrono::Utc::now().timestamp() as u64,
        })
    }

    async fn get_swap_route(&self, token_in: Address, token_out: Address, amount_in: U256) -> Result<SwapRoute> {
        let path = vec![token_in, token_out];
        let amounts = self.get_amounts_out(amount_in, path.clone()).await?;
        let amount_out = amounts[1];
        let amount_out_min = amount_out * U256::from(995) / U256::from(1000); // 0.5% slippage
        
        let gas_estimate = self.estimate_gas_for_swap(path.clone(), amount_in, amount_out_min).await?;
        
        Ok(SwapRoute {
            dex_name: "SushiSwap".to_string(),
            router_address: self.router_address,
            path,
            amount_in,
            amount_out_min,
            gas_estimate,
        })
    }

    async fn execute_swap(&self, route: &SwapRoute) -> Result<H256> {
        let router = ISushiSwapRouter::new(route.router_address, self.client.clone());
        let deadline = U256::from(chrono::Utc::now().timestamp() + 300);
        
        debug!("Executing SushiSwap swap: {} -> {}", route.amount_in, route.amount_out_min);
        
        let tx = router
            .swap_exact_tokens_for_tokens(
                route.amount_in,
                route.amount_out_min,
                route.path.clone(),
                self.client.address(),
                deadline,
            )
            .gas(route.gas_estimate)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to execute SushiSwap swap: {}", e))?;
        
        Ok(tx.tx_hash())
    }

    fn get_name(&self) -> &str {
        "SushiSwap"
    }
}

// SushiSwap Router interface (similar to Uniswap V2)
abigen!(
    ISushiSwapRouter,
    r#"[
        function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)
        function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)
    ]"#
);
