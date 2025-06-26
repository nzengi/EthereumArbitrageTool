use super::{DexInterface, DexPrice, SwapRoute};
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use ethers::prelude::*;
use log::debug;
use std::sync::Arc;

pub struct UniswapV2 {
    client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>,
    router_address: Address,
}

impl UniswapV2 {
    pub fn new(client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>, router_address: Address) -> Self {
        Self {
            client,
            router_address,
        }
    }

    async fn get_amounts_out(&self, amount_in: U256, path: Vec<Address>) -> Result<Vec<U256>> {
        // Uniswap V2 Router getAmountsOut call
        let router = IUniswapV2Router02::new(self.router_address, self.client.clone());
        
        let amounts = router
            .get_amounts_out(amount_in, path)
            .call()
            .await
            .map_err(|e| anyhow!("Failed to get amounts out: {}", e))?;
        
        Ok(amounts)
    }

    async fn estimate_gas_for_swap(&self, path: Vec<Address>, amount_in: U256, amount_out_min: U256) -> Result<U256> {
        let router = IUniswapV2Router02::new(self.router_address, self.client.clone());
        
        let deadline = U256::from(chrono::Utc::now().timestamp() + 300); // 5 minutes from now
        
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
            .map_err(|e| anyhow!("Failed to estimate gas: {}", e))?;
        
        Ok(gas_estimate)
    }
}

#[async_trait]
impl DexInterface for UniswapV2 {
    async fn get_price(&self, token_in: Address, token_out: Address, amount_in: U256) -> Result<DexPrice> {
        let path = vec![token_in, token_out];
        let amounts = self.get_amounts_out(amount_in, path.clone()).await?;
        
        if amounts.len() < 2 {
            return Err(anyhow!("Invalid amounts returned from Uniswap"));
        }
        
        let amount_out = amounts[1];
        let gas_estimate = self.estimate_gas_for_swap(path, amount_in, amount_out).await.unwrap_or(U256::from(150000));
        
        let price_per_token = amount_out.as_u128() as f64 / amount_in.as_u128() as f64;
        
        Ok(DexPrice {
            dex_name: "UniswapV2".to_string(),
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
            dex_name: "UniswapV2".to_string(),
            router_address: self.router_address,
            path,
            amount_in,
            amount_out_min,
            gas_estimate,
        })
    }

    async fn execute_swap(&self, route: &SwapRoute) -> Result<H256> {
        let router = IUniswapV2Router02::new(route.router_address, self.client.clone());
        let deadline = U256::from(chrono::Utc::now().timestamp() + 300);
        
        debug!("Executing UniswapV2 swap: {} -> {}", route.amount_in, route.amount_out_min);
        
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
            .map_err(|e| anyhow!("Failed to execute swap: {}", e))?;
        
        Ok(tx.tx_hash())
    }

    fn get_name(&self) -> &str {
        "UniswapV2"
    }
}

// Uniswap V2 Router02 interface
abigen!(
    IUniswapV2Router02,
    r#"[
        function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)
        function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)
    ]"#
);
