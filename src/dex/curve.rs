use super::{DexInterface, DexPrice, SwapRoute};
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use ethers::prelude::*;
use log::debug;
use std::sync::Arc;

pub struct Curve {
    client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>,
    registry_address: Address,
}

impl Curve {
    pub fn new(client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>, registry_address: Address) -> Self {
        Self {
            client,
            registry_address,
        }
    }

    async fn find_pool_for_coins(&self, token_in: Address, token_out: Address) -> Result<Address> {
        let registry = ICurveRegistry::new(self.registry_address, self.client.clone());
        
        let pool_address = registry
            .find_pool_for_coins(token_in, token_out)
            .call()
            .await
            .map_err(|e| anyhow!("Failed to find Curve pool: {}", e))?;
        
        if pool_address == Address::zero() {
            return Err(anyhow!("No Curve pool found for token pair"));
        }
        
        Ok(pool_address)
    }

    async fn get_dy(&self, pool_address: Address, i: U256, j: U256, dx: U256) -> Result<U256> {
        let pool = ICurvePool::new(pool_address, self.client.clone());
        
        let dy = pool
            .get_dy(i, j, dx)
            .call()
            .await
            .map_err(|e| anyhow!("Failed to get dy from Curve pool: {}", e))?;
        
        Ok(dy)
    }

    async fn get_coin_indices(&self, pool_address: Address, token_in: Address, token_out: Address) -> Result<(U256, U256)> {
        let pool = ICurvePool::new(pool_address, self.client.clone());
        
        // Try to find the coin indices by iterating through possible values
        for i in 0..4 {
            for j in 0..4 {
                if i == j { continue; }
                
                if let Ok(coin_i) = pool.coins(U256::from(i)).call().await {
                    if let Ok(coin_j) = pool.coins(U256::from(j)).call().await {
                        if coin_i == token_in && coin_j == token_out {
                            return Ok((U256::from(i), U256::from(j)));
                        }
                    }
                }
            }
        }
        
        Err(anyhow!("Could not find coin indices in Curve pool"))
    }
}

#[async_trait]
impl DexInterface for Curve {
    async fn get_price(&self, token_in: Address, token_out: Address, amount_in: U256) -> Result<DexPrice> {
        let pool_address = self.find_pool_for_coins(token_in, token_out).await?;
        let (i, j) = self.get_coin_indices(pool_address, token_in, token_out).await?;
        
        let amount_out = self.get_dy(pool_address, i, j, amount_in).await?;
        let price_per_token = amount_out.as_u128() as f64 / amount_in.as_u128() as f64;
        
        Ok(DexPrice {
            dex_name: "Curve".to_string(),
            token_in,
            token_out,
            amount_in,
            amount_out,
            price_per_token,
            gas_estimate: U256::from(200000), // Curve swaps typically use more gas
            timestamp: chrono::Utc::now().timestamp() as u64,
        })
    }

    async fn get_swap_route(&self, token_in: Address, token_out: Address, amount_in: U256) -> Result<SwapRoute> {
        let pool_address = self.find_pool_for_coins(token_in, token_out).await?;
        let (i, j) = self.get_coin_indices(pool_address, token_in, token_out).await?;
        
        let amount_out = self.get_dy(pool_address, i, j, amount_in).await?;
        let amount_out_min = amount_out * U256::from(995) / U256::from(1000); // 0.5% slippage
        
        Ok(SwapRoute {
            dex_name: "Curve".to_string(),
            router_address: pool_address,
            path: vec![token_in, token_out], // Simplified path representation
            amount_in,
            amount_out_min,
            gas_estimate: U256::from(200000),
        })
    }

    async fn execute_swap(&self, route: &SwapRoute) -> Result<H256> {
        // For Curve, we need to get the pool address and indices again
        let pool_address = route.router_address;
        let token_in = route.path[0];
        let token_out = route.path[1];
        
        let (i, j) = self.get_coin_indices(pool_address, token_in, token_out).await?;
        
        let pool = ICurvePool::new(pool_address, self.client.clone());
        
        debug!("Executing Curve swap: {} -> {}", route.amount_in, route.amount_out_min);
        
        let tx = pool
            .exchange(i, j, route.amount_in, route.amount_out_min)
            .gas(route.gas_estimate)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to execute Curve swap: {}", e))?;
        
        Ok(tx.tx_hash())
    }

    fn get_name(&self) -> &str {
        "Curve"
    }
}

// Curve Registry interface
abigen!(
    ICurveRegistry,
    r#"[
        function find_pool_for_coins(address from, address to) external view returns (address)
    ]"#
);

// Curve Pool interface
abigen!(
    ICurvePool,
    r#"[
        function get_dy(uint256 i, uint256 j, uint256 dx) external view returns (uint256)
        function exchange(uint256 i, uint256 j, uint256 dx, uint256 min_dy) external returns (uint256)
        function coins(uint256 arg0) external view returns (address)
    ]"#
);
