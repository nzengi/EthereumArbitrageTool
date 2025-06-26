use env_logger::{Builder, Target};
use log::LevelFilter;
use std::io::Write;

pub fn setup_logger() {
    let mut builder = Builder::from_default_env();
    
    builder
        .target(Target::Stdout)
        .filter_level(LevelFilter::Info)
        .format(|buf, record| {
            writeln!(
                buf,
                "[{}] {} - {} - {}",
                chrono::Utc::now().format("%Y-%m-%d %H:%M:%S%.3f"),
                record.level(),
                record.target(),
                record.args()
            )
        })
        .init();
}

pub fn log_arbitrage_opportunity(
    id: &str,
    token_pair: &str,
    profit_usd: f64,
    profit_percentage: f64,
    buy_dex: &str,
    sell_dex: &str,
) {
    log::info!(
        "🎯 ARBITRAGE OPPORTUNITY DETECTED:\n\
        ID: {}\n\
        Pair: {}\n\
        Profit: ${:.2} ({:.3}%)\n\
        Route: {} → {}\n\
        ────────────────────────────────",
        id, token_pair, profit_usd, profit_percentage, buy_dex, sell_dex
    );
}

pub fn log_execution_result(
    id: &str,
    success: bool,
    tx_hash: Option<&str>,
    actual_profit: Option<f64>,
    gas_used: Option<u64>,
    error: Option<&str>,
) {
    if success {
        log::info!(
            "✅ ARBITRAGE EXECUTED SUCCESSFULLY:\n\
            ID: {}\n\
            TX Hash: {}\n\
            Profit: ${:.2}\n\
            Gas Used: {}\n\
            ────────────────────────────────",
            id,
            tx_hash.unwrap_or("N/A"),
            actual_profit.unwrap_or(0.0),
            gas_used.unwrap_or(0)
        );
    } else {
        log::error!(
            "❌ ARBITRAGE EXECUTION FAILED:\n\
            ID: {}\n\
            Error: {}\n\
            ────────────────────────────────",
            id,
            error.unwrap_or("Unknown error")
        );
    }
}
