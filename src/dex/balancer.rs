use super::{DexInterface, DexPrice, SwapRoute};
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use ethers::prelude::*;
use log::debug;
use std::sync::Arc;

pub struct Balancer {
    client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>,
    vault_address: Address,
}

impl Balancer {
    pub fn new(client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>, vault_address: Address) -> Self {
        Self {
            client,
            vault_address,
        }
    }

    async fn query_batch_swap(
        &self,
        pool_id: [u8; 32],
        token_in: Address,
        token_out: Address,
        amount_in: U256,
    ) -> Result<U256> {
        let vault = IBalancerVault::new(self.vault_address, self.client.clone());
        
        // Create swap step for Balancer batch swap
        let swap_step = BalancerSwapStep {
            pool_id,
            asset_in_index: 0,
            asset_out_index: 1,
            amount: amount_in,
            user_data: Bytes::new(),
        };

        let assets = vec![token_in, token_out];
        let funds = BalancerFundManagement {
            sender: self.client.address(),
            from_internal_balance: false,
            recipient: self.client.address(),
            to_internal_balance: false,
        };

        let deltas = vault
            .query_batch_swap(
                0, // SwapKind.GIVEN_IN
                vec![swap_step],
                assets,
                funds,
            )
            .call()
            .await
            .map_err(|e| anyhow!("Failed to query Balancer batch swap: {}", e))?;

        // Return absolute value of output delta
        if deltas.len() > 1 {
            Ok(deltas[1].into())
        } else {
            Err(anyhow!("Invalid Balancer swap response"))
        }
    }

    async fn find_pool_for_tokens(&self, token_in: Address, token_out: Address) -> Result<[u8; 32]> {
        // In a real implementation, you would query the Balancer subgraph or pool registry
        // For now, we'll use a common ETH/USDC pool ID as placeholder
        // This should be dynamically discovered in production
        let common_pool_id = [0u8; 32]; // Placeholder - should be actual pool ID
        Ok(common_pool_id)
    }
}

#[async_trait]
impl DexInterface for Balancer {
    async fn get_price(&self, token_in: Address, token_out: Address, amount_in: U256) -> Result<DexPrice> {
        let pool_id = self.find_pool_for_tokens(token_in, token_out).await?;
        let amount_out = self.query_batch_swap(pool_id, token_in, token_out, amount_in).await?;
        
        let price_per_token = amount_out.as_u128() as f64 / amount_in.as_u128() as f64;
        
        Ok(DexPrice {
            dex_name: "Balancer".to_string(),
            token_in,
            token_out,
            amount_in,
            amount_out,
            price_per_token,
            gas_estimate: U256::from(250000), // Balancer swaps typically use more gas
            timestamp: chrono::Utc::now().timestamp() as u64,
        })
    }

    async fn get_swap_route(&self, token_in: Address, token_out: Address, amount_in: U256) -> Result<SwapRoute> {
        let pool_id = self.find_pool_for_tokens(token_in, token_out).await?;
        let amount_out = self.query_batch_swap(pool_id, token_in, token_out, amount_in).await?;
        let amount_out_min = amount_out * U256::from(995) / U256::from(1000); // 0.5% slippage
        
        Ok(SwapRoute {
            dex_name: "Balancer".to_string(),
            router_address: self.vault_address,
            path: vec![token_in, token_out],
            amount_in,
            amount_out_min,
            gas_estimate: U256::from(250000),
        })
    }

    async fn execute_swap(&self, route: &SwapRoute) -> Result<H256> {
        let vault = IBalancerVault::new(route.router_address, self.client.clone());
        let pool_id = self.find_pool_for_tokens(route.path[0], route.path[1]).await?;
        
        let swap_step = BalancerSwapStep {
            pool_id,
            asset_in_index: 0,
            asset_out_index: 1,
            amount: route.amount_in,
            user_data: Bytes::new(),
        };

        let funds = BalancerFundManagement {
            sender: self.client.address(),
            from_internal_balance: false,
            recipient: self.client.address(),
            to_internal_balance: false,
        };

        let limits = vec![route.amount_in.into(), -(route.amount_out_min.as_u128() as i128)];
        let deadline = U256::from(chrono::Utc::now().timestamp() + 300);

        debug!("Executing Balancer swap: {} -> {}", route.amount_in, route.amount_out_min);
        
        let tx = vault
            .batch_swap(
                0, // SwapKind.GIVEN_IN
                vec![swap_step],
                route.path.clone(),
                funds,
                limits,
                deadline,
            )
            .gas(route.gas_estimate)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to execute Balancer swap: {}", e))?;
        
        Ok(tx.tx_hash())
    }

    fn get_name(&self) -> &str {
        "Balancer"
    }
}

// Balancer-specific structs
#[derive(Clone, Debug)]
struct BalancerSwapStep {
    pool_id: [u8; 32],
    asset_in_index: u8,
    asset_out_index: u8,
    amount: U256,
    user_data: Bytes,
}

#[derive(Clone, Debug)]
struct BalancerFundManagement {
    sender: Address,
    from_internal_balance: bool,
    recipient: Address,
    to_internal_balance: bool,
}

// Balancer Vault interface
abigen!(
    IBalancerVault,
    r#"[
        function queryBatchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds) external returns (int256[] memory)
        function batchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds, int256[] limits, uint256 deadline) external returns (int256[] memory)
    ]"#
);