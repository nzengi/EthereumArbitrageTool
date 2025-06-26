use anyhow::Result;
use dotenv::dotenv;
use ethers::prelude::*;
use log::{error, info, warn};
use std::env;
use std::sync::Arc;
use tokio::time::{sleep, Duration};

mod arbitrage;
mod config;
mod dex;
mod flashloan;
mod utils;

use crate::arbitrage::detector::ArbitrageDetector;
use crate::arbitrage::executor::ArbitrageExecutor;
use crate::config::Config;
use crate::utils::logger::setup_logger;

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv().ok();
    setup_logger();

    info!("🚀 Starting Ethereum Flash Loan Arbitrage Bot");

    // Load configuration
    let config = Config::from_env()?;
    info!("📋 Configuration loaded successfully");

    // Setup Ethereum provider
    let provider = Provider::<Ws>::connect(&config.ethereum.ws_rpc_url).await?;
    let provider = Arc::new(provider);
    info!("🔗 Connected to Ethereum network");

    // Create wallet from private key
    let wallet: LocalWallet = config.ethereum.private_key.parse()?;
    let wallet = wallet.with_chain_id(config.ethereum.chain_id);
    
    // Create signer client
    let client = SignerMiddleware::new(provider.clone(), wallet);
    let client = Arc::new(client);

    info!("💼 Wallet connected: {}", client.address());

    // Initialize components
    let detector = ArbitrageDetector::new(provider.clone(), config.clone()).await?;
    let executor = ArbitrageExecutor::new(client.clone(), config.clone()).await?;

    info!("🎯 Arbitrage detector and executor initialized");
    info!("👀 Monitoring DEX prices for arbitrage opportunities...");

    // Main arbitrage detection loop
    let mut opportunity_count = 0u64;
    let mut executed_count = 0u64;

    loop {
        match detector.detect_opportunities().await {
            Ok(opportunities) => {
                if !opportunities.is_empty() {
                    opportunity_count += opportunities.len() as u64;
                    info!("💡 Found {} arbitrage opportunities", opportunities.len());
                    
                    for opportunity in opportunities {
                        info!(
                            "🎯 Opportunity: {} -> {} | Profit: ${:.2} | Gas Cost: ${:.2}",
                            opportunity.buy_dex,
                            opportunity.sell_dex,
                            opportunity.estimated_profit_usd,
                            opportunity.estimated_gas_cost_usd
                        );

                        // Check if opportunity is profitable after gas costs
                        if opportunity.is_profitable() {
                            match executor.execute_arbitrage(&opportunity).await {
                                Ok(tx_hash) => {
                                    executed_count += 1;
                                    info!("✅ Arbitrage executed successfully! TX: 0x{}", hex::encode(tx_hash));
                                }
                                Err(e) => {
                                    error!("❌ Failed to execute arbitrage: {}", e);
                                }
                            }
                        } else {
                            warn!("⚠️  Opportunity not profitable after gas costs, skipping");
                        }
                    }
                }
            }
            Err(e) => {
                error!("🔍 Error detecting opportunities: {}", e);
            }
        }

        // Log statistics every 100 iterations
        if opportunity_count > 0 && opportunity_count % 100 == 0 {
            info!(
                "📊 Statistics: {} opportunities found, {} executed ({}% success rate)",
                opportunity_count,
                executed_count,
                (executed_count * 100) / opportunity_count
            );
        }

        // Sleep for a short interval to prevent excessive API calls
        sleep(Duration::from_millis(config.bot.scan_interval_ms)).await;
    }
}
