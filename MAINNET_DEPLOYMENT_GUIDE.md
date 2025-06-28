# 🚀 Mainnet Deployment Guide - Flash Loan Arbitrage

## ✅ Pre-Deployment Checklist

### 1. **Uyumsuzluklar Düzeltildi ✅**

- ✅ Interface uyumsuzluğu düzeltildi (`IFlashLoanReceiver.sol`)
- ✅ Contract interface implementasyonu eklendi
- ✅ Compilation başarılı
- ✅ Deploy scripti test edildi

### 2. **Gerekli Dosyalar**

- ✅ `contracts/FlashLoanArbitrageMainnet.sol` - Ana contract
- ✅ `contracts/interfaces/IFlashLoanReceiver.sol` - Düzeltilmiş interface
- ✅ `scripts/deploy-mainnet.js` - Deploy scripti
- ✅ `hardhat.config.js` - Network konfigürasyonu

## 📋 Deployment Adımları

### 1. **Environment Hazırlama**

```bash
# .env dosyasını oluşturun ve doldurun:
PRIVATE_KEY=your_private_key_here
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### 2. **Cüzdan Hazırlığı**

- ⚠️ **Minimum 0.02 ETH** deployment için gerekli
- ⚠️ **Private key** güvenliğini sağlayın
- ⚠️ **Mainnet** olduğunu unutmayın - GERÇEK PARA!

### 3. **Deployment Komutları**

#### Test Deployment (Önerilen):

```bash
# Önce test edelim
npx hardhat run scripts/deploy-mainnet.js --network hardhat
```

#### Gerçek Mainnet Deployment:

```bash
# 🚨 DIKKAT: Bu gerçek para harcar!
npm run deploy:mainnet

# Veya direkt olarak:
npx hardhat run scripts/deploy-mainnet.js --network mainnet
```

### 4. **Verification (Doğrulama)**

Deploy sonrası çıktıda verilen komutu çalıştırın:

```bash
npx hardhat verify --network mainnet CONTRACT_ADDRESS "FEE_COLLECTOR_ADDRESS"
```

## 📊 Deploy Sonrası Bilgiler

Deploy başarılı olduğunda şu bilgiler `mainnet-deployment.json` dosyasına kaydedilir:

- Contract adresi
- Deployer adresi
- Fee collector adresi
- Network bilgisi
- Deploy zamanı

## 🔧 Contract Kullanımı

### 1. **Contract Instance Oluşturma**

```javascript
const contract = await ethers.getContractAt(
  "FlashLoanArbitrageMainnet",
  "CONTRACT_ADDRESS"
);
```

### 2. **Arbitrage Execution**

```javascript
// Parametreleri encode edin
const params = ethers.AbiCoder.defaultAbiCoder().encode(
  ["tuple(address,address,uint256,address,address,uint256)"],
  [
    [
      WETH, // tokenA
      USDC, // tokenB
      parseEther("1"), // amountIn
      UNISWAP_ROUTER, // router1 (buy)
      SUSHISWAP_ROUTER, // router2 (sell)
      parseEther("0.005"), // minProfitWei
    ],
  ]
);

// Arbitrage başlat
await contract.startArbitrage(WETH, parseEther("1"), params);
```

## 🎯 Mainnet Adresleri

### DEX Router'ları:

- **Uniswap V2**: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`
- **SushiSwap**: `0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F`

### Token Adresleri:

- **WETH**: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- **USDC**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- **DAI**: `0x6B175474E89094C44Da98b954EedeAC495271d0F`
- **USDT**: `0xdAC17F958D2ee523a2206206994597C13D831ec7`

### Aave V3:

- **Pool**: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`

## ⚠️ Güvenlik Uyarıları

### 🚨 MUTLAKA OKUYUN:

1. **🧪 Testnet'te Test Edin**: Önce Sepolia'da test edin
2. **💰 Küçük Miktarlarla Başlayın**: İlk denemeler için 0.1-1 ETH
3. **⛽ Gas Fiyatlarını İzleyin**: Yüksek gas dönemlerinde bekleyin
4. **📊 Profit Marjinlerini Kontrol Edin**: Minimum %0.5 profit hedefleyin
5. **🛑 Acil Durum Planı**: Emergency withdraw fonksiyonunu bilin

### 📋 Risk Yönetimi:

- **Slippage**: DEX'lerde yüksek slippage riski
- **MEV**: Front-running riski var
- **Gas Costs**: Profit < Gas fee riski
- **Smart Contract**: Code risk her zaman var

## 🔍 İzleme ve Bakım

### Log İzleme:

```bash
# Continuous arbitrage bot
npm run bot:start

# Profit monitoring
npm run monitor:mainnet
```

### Emergency Functions:

```javascript
// Acil para çekme
await contract.emergencyWithdraw(TOKEN_ADDRESS);

// Profit çekme
await contract.withdrawProfit(TOKEN_ADDRESS, AMOUNT);

// Fee collector değiştirme
await contract.setFeeCollector(NEW_ADDRESS);
```

## 📞 Sorun Giderme

### Yaygın Hatalar:

1. **"Insufficient balance"**: Daha fazla ETH gerekli
2. **"Not enough balance to repay loan"**: Profit yetersiz
3. **"First swap failed"**: Liquidity veya slippage sorunu
4. **"Arbitrage not profitable"**: Fiyat farkı yetersiz

### Debug Komutları:

```bash
# Contract balance kontrolü
await contract.getContractBalance(TOKEN_ADDRESS);

# Arbitrage profit hesaplama
await contract.calculateArbitrageProfit(tokenA, tokenB, amount, router1, router2);
```

---

## 🎉 Deploy Hazır!

Tüm kontroller tamamlandı ve deploy scripti test edildi. Mainnet'e deploy etmeye hazırsınız!

**Son kontrol**:

- ✅ Uyumsuzluklar düzeltildi
- ✅ Script test edildi
- ✅ Güvenlik uyarıları okundu
- ✅ Emergency planı hazır

🚀 **Deploy komutu**: `npm run deploy:mainnet`

---

_⚠️ Bu deployment gerçek para kullanır. Tüm riskleri kabul ettiğinizden emin olun._
