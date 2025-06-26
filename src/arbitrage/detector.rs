use super::ArbitrageOpportunity;
use crate::config::Config;
use crate::dex::{balancer::Balancer, curve::Curve, sushiswap::SushiSwap, uniswap::UniswapV2, DexInterface};
use crate::utils::gas::estimate_eth_price;
use anyhow::Result;
use ethers::prelude::*;
use log::{debug, warn};
use std::sync::Arc;
use uuid::Uuid;

pub struct ArbitrageDetector {
    provider: Arc<Provider<Ws>>,
    config: Config,
    dexes: Vec<Box<dyn DexInterface + Send + Sync>>,
    eth_price_usd: f64,
}

impl ArbitrageDetector {
    pub async fn new(provider: Arc<Provider<Ws>>, config: Config) -> Result<Self> {
        // Initialize mock client for DEX interfaces (read-only operations)
        let wallet: LocalWallet = "0x0000000000000000000000000000000000000000000000000000000000000001".parse()?;
        let client = SignerMiddleware::new(provider.clone(), wallet);
        let client = Arc::new(client);

        let mut dexes: Vec<Box<dyn DexInterface + Send + Sync>> = Vec::new();
        
        // Add Uniswap V2
        let uniswap_v2_router: Address = config.dex.uniswap_v2_router.parse()?;
        dexes.push(Box::new(UniswapV2::new(client.clone(), uniswap_v2_router)));
        
        // Add SushiSwap
        let sushiswap_router: Address = config.dex.sushiswap_router.parse()?;
        dexes.push(Box::new(SushiSwap::new(client.clone(), sushiswap_router)));
        
        // Add Curve
        let curve_registry: Address = config.dex.curve_registry.parse()?;
        dexes.push(Box::new(Curve::new(client.clone(), curve_registry)));
        
        // Add Balancer
        let balancer_vault: Address = config.dex.balancer_vault.parse()?;
        dexes.push(Box::new(Balancer::new(client.clone(), balancer_vault)));

        let eth_price_usd = estimate_eth_price().await.unwrap_or(3000.0); // Fallback price

        Ok(Self {
            provider,
            config,
            dexes,
            eth_price_usd,
        })
    }

    pub async fn detect_opportunities(&self) -> Result<Vec<ArbitrageOpportunity>> {
        let mut opportunities = Vec::new();

        for trading_pair in &self.config.arbitrage.trading_pairs {
            let token_in: Address = trading_pair.token0.parse()?;
            let token_out: Address = trading_pair.token1.parse()?;
            
            // Test with different amounts
            let test_amounts = vec![
                U256::from(1) * U256::exp10(18), // 1 ETH
                U256::from(5) * U256::exp10(18), // 5 ETH
                U256::from(10) * U256::exp10(18), // 10 ETH
            ];

            for amount_in in test_amounts {
                if let Some(opportunity) = self.find_arbitrage_opportunity(token_in, token_out, amount_in).await? {
                    if opportunity.estimated_profit_usd >= self.config.arbitrage.min_profit_usd {
                        opportunities.push(opportunity);
                    }
                }
            }
        }

        Ok(opportunities)
    }

    async fn find_arbitrage_opportunity(
        &self,
        token_in: Address,
        token_out: Address,
        amount_in: U256,
    ) -> Result<Option<ArbitrageOpportunity>> {
        let mut prices = Vec::new();

        // Get prices from all DEXes
        for dex in &self.dexes {
            match dex.get_price(token_in, token_out, amount_in).await {
                Ok(price) => {
                    debug!("Got price from {}: {}", dex.get_name(), price.price_per_token);
                    prices.push(price);
                }
                Err(e) => {
                    warn!("Failed to get price from {}: {}", dex.get_name(), e);
                }
            }
        }

        if prices.len() < 2 {
            return Ok(None);
        }

        // Find the best buy and sell prices
        let mut best_buy_price = &prices[0];
        let mut best_sell_price = &prices[0];

        for price in &prices {
            if price.amount_out > best_buy_price.amount_out {
                best_buy_price = price;
            }
            if price.amount_out < best_sell_price.amount_out {
                best_sell_price = price;
            }
        }

        // Calculate arbitrage opportunity
        if best_buy_price.amount_out > best_sell_price.amount_out {
            let profit = best_buy_price.amount_out - best_sell_price.amount_out;
            let profit_percentage = (profit.as_u128() as f64 / amount_in.as_u128() as f64) * 100.0;

            // Estimate costs
            let total_gas_estimate = best_buy_price.gas_estimate + best_sell_price.gas_estimate + U256::from(100000); // Flash loan overhead
            let gas_cost_eth = total_gas_estimate.as_u128() as f64 * self.config.ethereum.gas_price_gwei as f64 * 1e-9;
            let gas_cost_usd = gas_cost_eth * self.eth_price_usd;
            
            let profit_eth = profit.as_u128() as f64 / 1e18;
            let profit_usd = profit_eth * self.eth_price_usd;

            // Check minimum profit threshold
            if profit_percentage >= 0.1 && profit_usd > gas_cost_usd {
                return Ok(Some(ArbitrageOpportunity {
                    id: Uuid::new_v4().to_string(),
                    token_in,
                    token_out,
                    buy_dex: best_buy_price.dex_name.clone(),
                    sell_dex: best_sell_price.dex_name.clone(),
                    amount_in,
                    buy_amount_out: best_buy_price.amount_out,
                    sell_amount_out: best_sell_price.amount_out,
                    estimated_profit: profit,
                    estimated_profit_usd: profit_usd,
                    estimated_gas_cost: total_gas_estimate,
                    estimated_gas_cost_usd: gas_cost_usd,
                    profit_percentage,
                    timestamp: chrono::Utc::now().timestamp() as u64,
                }));
            }
        }

        Ok(None)
    }

    pub async fn update_eth_price(&mut self) -> Result<()> {
        self.eth_price_usd = estimate_eth_price().await?;
        debug!("Updated ETH price: ${:.2}", self.eth_price_usd);
        Ok(())
    }
}
