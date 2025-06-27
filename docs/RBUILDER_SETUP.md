# 🔥 rbuilder Integration Setup Guide

## 📋 Overview

rbuilder is Flashbots' blazingly fast, state-of-the-art Ethereum MEV-Boost block builder written in Rust. This guide will help you integrate rbuilder with our arbitrage bot for maximum MEV extraction.

## 🚀 Quick Start

### 1. Configuration Ready ✅

Your `config-mainnet.toml` is already configured with:

- **RPC URL**: `https://mainnet.infura.io/v3/4bcf9d0577da4ecc8ce07d76ca8b94e0`
- **Parallel block building** enabled
- **MEV-Gas-Price** and **Max-Profit** sorting algorithms
- **Flashbots relay** integration

### 2. Build rbuilder

```bash
cd rbuilder
make build
```

### 3. Set Environment Variables

Add to your `.env` file:

```env
# rbuilder Environment Variables
COINBASE_SECRET_KEY=your_coinbase_secret_key_here
RELAY_SECRET_KEY=your_relay_secret_key_here
OPTIMISTIC_RELAY_SECRET_KEY=your_optimistic_relay_key_here
CL_NODE_URL=http://localhost:3500
```

### 4. Start rbuilder

```bash
# Using our custom script
npm run rbuilder:start

# Or manually
cd rbuilder && ./target/release/rbuilder run config-mainnet.toml
```

## 🎯 Key Features Enabled

### **Parallel Block Building**

- ⚡ **3x faster** than traditional sequential building
- 🔄 Multiple conflict resolution algorithms running simultaneously
- 🎯 Better transaction ordering for maximum MEV

### **Multiple Building Algorithms**

1. **MGP-Ordering**: MEV-Gas-Price sorting
2. **MP-Ordering**: Max-Profit optimization
3. **Parallel**: Conflict-aware parallel processing

### **Advanced Features**

- 📊 **Telemetry**: Performance monitoring on ports 6060/6061
- 🔗 **Flashbots Integration**: Direct relay submission
- 🛡️ **Smart Nonce Management**: Dependency handling
- 🎲 **Bundle Merging**: Optimized transaction inclusion

## 🔧 Configuration Details

### Current Config (`config-mainnet.toml`):

```toml
# Ethereum RPC Configuration
el_node_url = "https://mainnet.infura.io/v3/4bcf9d0577da4ecc8ce07d76ca8b94e0"

# Chain Configuration
chain = "mainnet"

# Building Algorithms
live_builders = ["mp-ordering", "mgp-ordering", "parallel"]

# Relay Configuration
enabled_relays = ["flashbots"]

# Parallel Builder Settings
[[builders]]
name = "parallel"
algo = "parallel-builder"
num_threads = 25
safe_sorting_only = false
```

## 📊 Performance Benefits

### **Backtesting Results**:

- 📈 **50% better blocks** in high-MEV environments
- 💰 **40 additional ETH** across 2000 blocks
- ⚡ **19% improvement** in live production

### **Key Advantages**:

1. **Faster Building**: Parallel processing reduces latency
2. **Better Ordering**: Multiple algorithms optimize for different scenarios
3. **Resource Maximization**: Dynamic resource allocation
4. **Pipelining**: Independent component operations

## 🔗 Integration with Arbitrage Bot

### **MEV-Boost Integration**

Our `mev-boost-integration.js` script automatically connects with rbuilder:

```javascript
// rbuilder Configuration
const RBUILDER_CONFIG = {
  mainnet: {
    endpoint: "http://localhost:8080", // rbuilder API endpoint
    api_key: process.env.RBUILDER_API_KEY || "",
  },
};
```

### **Bundle Submission**

Enhanced bundle submission through rbuilder's parallel processing:

```javascript
// Submit bundles to rbuilder for optimal processing
await this.submitEnhancedMEVBundle(targetTx, arbitrageTx, {
  validatorShare: 90,
  targetBlock: "latest",
  maxBlock: "latest+3",
});
```

## 🚨 Requirements

### **System Requirements**:

- **RAM**: Minimum 16GB (32GB recommended)
- **CPU**: Multi-core processor (8+ cores recommended)
- **Storage**: SSD with 100GB+ free space
- **Network**: High-speed internet connection

### **Dependencies**:

- **Rust**: Latest stable version
- **reth**: Ethereum execution client (optional for full node)
- **Lighthouse**: Consensus client (for full MEV-Boost setup)

## 🔄 Monitoring

### **Telemetry Endpoints**:

- **Full Telemetry**: `http://localhost:6060`
- **Redacted Telemetry**: `http://localhost:6061`
- **Prometheus Metrics**: `/debug/metrics/prometheus`

### **Health Checks**:

```bash
# Check if rbuilder is running
curl http://localhost:8080/health

# View current metrics
curl http://localhost:6060/debug/metrics/prometheus
```

## 🎯 Next Steps

1. **Build rbuilder**: `cd rbuilder && make build`
2. **Set environment variables** in your `.env` file
3. **Start rbuilder**: `npm run rbuilder:start`
4. **Start arbitrage bot**: `npm run bot:mev-boost`
5. **Monitor performance** via telemetry endpoints

## 📚 Additional Resources

- **rbuilder GitHub**: https://github.com/flashbots/rbuilder
- **Flashbots Docs**: https://docs.flashbots.net/
- **MEV-Boost Guide**: https://boost.flashbots.net/
- **Builder Playground**: https://github.com/flashbots/builder-playground

---

🔥 **Ready for Maximum MEV Extraction!** 🔥
