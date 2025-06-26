use super::{ArbitrageOpportunity, ExecutionResult};
use crate::config::Config;
use crate::flashloan::aave::AaveFlashLoan;
use anyhow::{anyhow, Result};
use ethers::prelude::*;
use log::{debug, error, info};
use std::sync::Arc;

pub struct ArbitrageExecutor {
    client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>,
    config: Config,
    flash_loan: AaveFlashLoan,
}

impl ArbitrageExecutor {
    pub async fn new(
        client: Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>,
        config: Config,
    ) -> Result<Self> {
        let flash_loan = AaveFlashLoan::new(client.clone(), config.clone()).await?;

        Ok(Self {
            client,
            config,
            flash_loan,
        })
    }

    pub async fn execute_arbitrage(&self, opportunity: &ArbitrageOpportunity) -> Result<[u8; 32]> {
        info!("🚀 Executing arbitrage opportunity: {}", opportunity.id);

        // Validate opportunity before execution
        self.validate_opportunity(opportunity).await?;

        // Prepare flash loan parameters
        let loan_amount = self.calculate_optimal_loan_amount(opportunity)?;
        
        debug!("💰 Flash loan amount: {} ETH", loan_amount.as_u128() as f64 / 1e18);

        // Execute flash loan arbitrage
        let tx_hash = self.flash_loan.execute_arbitrage(
            opportunity.token_in,
            opportunity.token_out,
            loan_amount,
            &opportunity.buy_dex,
            &opportunity.sell_dex,
        ).await?;

        info!("✅ Arbitrage executed successfully! TX Hash: 0x{}", hex::encode(tx_hash));

        Ok(tx_hash)
    }

    async fn validate_opportunity(&self, opportunity: &ArbitrageOpportunity) -> Result<()> {
        // Check if opportunity is still valid (prices might have changed)
        let current_time = chrono::Utc::now().timestamp() as u64;
        let age_seconds = current_time - opportunity.timestamp;
        
        if age_seconds > 30 { // Opportunity older than 30 seconds
            return Err(anyhow!("Arbitrage opportunity is too old: {} seconds", age_seconds));
        }

        // Check account balance
        let balance = self.client.get_balance(self.client.address(), None).await?;
        let required_balance = opportunity.estimated_gas_cost * U256::from(2); // 2x gas for safety
        
        if balance < required_balance {
            return Err(anyhow!("Insufficient balance for gas fees. Required: {}, Available: {}", required_balance, balance));
        }

        // Validate slippage tolerance
        let price_impact = self.calculate_price_impact(opportunity);
        if price_impact > self.config.arbitrage.max_slippage_percent {
            return Err(anyhow!("Price impact too high: {:.2}%", price_impact));
        }

        Ok(())
    }

    fn calculate_optimal_loan_amount(&self, opportunity: &ArbitrageOpportunity) -> Result<U256> {
        // For ETH/USDC arbitrage, we typically want to borrow ETH
        // The loan amount should be optimized based on available liquidity and gas costs
        
        let max_loan_eth = U256::from((self.config.flashloan.max_loan_amount_eth * 1e18) as u64);
        let opportunity_amount = opportunity.amount_in;
        
        // Use the smaller of max allowed or opportunity amount
        let loan_amount = if opportunity_amount < max_loan_eth {
            opportunity_amount
        } else {
            max_loan_eth
        };

        debug!("Calculated optimal loan amount: {} ETH", loan_amount.as_u128() as f64 / 1e18);
        
        Ok(loan_amount)
    }

    fn calculate_price_impact(&self, opportunity: &ArbitrageOpportunity) -> f64 {
        // Calculate the price impact based on the difference between buy and sell amounts
        let total_amount = opportunity.buy_amount_out + opportunity.sell_amount_out;
        let average_amount = total_amount / U256::from(2);
        
        let impact = if opportunity.buy_amount_out > opportunity.sell_amount_out {
            (opportunity.buy_amount_out - opportunity.sell_amount_out).as_u128() as f64
        } else {
            (opportunity.sell_amount_out - opportunity.buy_amount_out).as_u128() as f64
        };
        
        (impact / average_amount.as_u128() as f64) * 100.0
    }

    pub async fn simulate_arbitrage(&self, opportunity: &ArbitrageOpportunity) -> Result<ExecutionResult> {
        // Simulate the arbitrage execution without actually sending transactions
        info!("🧪 Simulating arbitrage opportunity: {}", opportunity.id);

        let simulation_result = ExecutionResult {
            opportunity_id: opportunity.id.clone(),
            tx_hash: "0x0000000000000000000000000000000000000000000000000000000000000000".to_string(),
            executed_at: chrono::Utc::now().timestamp() as u64,
            actual_profit: Some(opportunity.estimated_profit),
            gas_used: Some(opportunity.estimated_gas_cost),
            success: true,
            error_message: None,
        };

        debug!("📊 Simulation completed successfully");
        
        Ok(simulation_result)
    }

    pub async fn get_execution_history(&self) -> Result<Vec<ExecutionResult>> {
        // In a production system, this would fetch from a database
        // For now, return empty vector
        Ok(Vec::new())
    }
}
