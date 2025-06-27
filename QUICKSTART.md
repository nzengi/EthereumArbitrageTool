# ⚡ Hızlı Başlangıç Rehberi

Bu rehber, projeyi 5 dakikada çalıştırmanız için gerekli adımları içeriyor.

## 🚀 1 Dakikada Kurulum

### Adım 1: Projeyi İndirin

```bash
git clone https://github.com/nzengi/EthereumArbitrageTool.git
cd EthereumArbitrageTool
npm install
```

### Adım 2: Environment Dosyası Oluşturun

Aşağıdaki komutu çalıştırarak `.env` dosyasını oluşturun:

```bash
cat > .env << 'EOF'
# RPC URLs (Infura ücretsiz tier yeterli)
MAINNET_RPC_URL=https://mainnet.infura.io/v3/4bcf9d0577da4ecc8ce07d76ca8b94e0
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/4bcf9d0577da4ecc8ce07d76ca8b94e0

# Private Key (0x olmadan)
PRIVATE_KEY=your_private_key_here

# Etherscan API Key (contract verification için)
ETHERSCAN_API_KEY=YourEtherscanAPIKey

# Bot Configuration
MIN_PROFIT_THRESHOLD=0.005
DEBUG=true
LOG_LEVEL=info
EOF
```

### Adım 3: Private Key'inizi Ekleyin

```bash
# .env dosyasını düzenleyin
nano .env

# PRIVATE_KEY satırını gerçek private key'inizle değiştirin
# Örnek: PRIVATE_KEY=abcd1234efgh5678...
```

## 🧪 Test Ağında Deneme (2 dakika)

### Contract Deploy ve Test

```bash
# Contract'ı derle
npm run compile

# Sepolia testnet'e deploy et
npm run deploy

# Test arbitrajı çalıştır
npm run test:arbitrage
```

Başarılı olursa şuna benzer çıktı göreceksiniz:

```
✅ Contract deployed to: 0x...
📊 Testing arbitrage...
✅ Test completed successfully!
```

## 💰 Mainnet'te Gerçek Kullanım (1 dakika)

⚠️ **UYARI**: Gerçek para kullanır! Cüzdanınızda en az 0.1 ETH gas fee bulundurun.

```bash
# Mainnet'e deploy et
npm run deploy:mainnet

# MEV-Boost botu başlat (önerilen)
npm run bot:mev-boost

# VEYA standart bot
npm run bot:start
```

## 📊 Çıktı Örnekleri

### Başarılı Bot Çalışması:

```
🚀 Starting Flash Loan Arbitrage Bot...
📊 Configuration:
   - Network: mainnet
   - Contract: 0x2Ec4D7102ab6863aEef44d140Af01CB667eD5DAa
   - Min Profit: 0.005 ETH

💰 Scanning for opportunities...
📊 ETH Price: $2,400.50
   - Uniswap: $2,398.20
   - SushiSwap: $2,403.80
   - Difference: 0.23% ($5.60)

🔍 Opportunity found! Potential profit: 0.008 ETH ($19.20)
⚡ Executing arbitrage...
✅ Transaction successful!
   - TX Hash: 0x...
   - Profit: 0.0067 ETH ($16.08)
   - Gas Used: 245,000 (1.2 Gwei)
   - Net Profit: 0.0064 ETH ($15.36)
```

## 🛠 Sorun Giderme

### "Private key hatası"

```bash
# Private key formatını kontrol edin (0x olmadan)
echo $PRIVATE_KEY  # Bu 64 karakter hex string olmalı
```

### "RPC hatası"

```bash
# RPC URL'ini test edin
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $MAINNET_RPC_URL
```

### "Yetersiz ETH" hatası

```bash
# Bakiyenizi kontrol edin
npx hardhat console --network mainnet
> await ethers.provider.getBalance("YOUR_ADDRESS")
# En az 0.1 ETH (100000000000000000 wei) olmalı
```

## 🎯 Hızlı Kar Stratejileri

### Başlangıç (1 ETH borç)

- Günlük hedef: $20
- İşlem başına kar: $8-15
- Günlük işlem sayısı: 2-3

### Orta Seviye (3-5 ETH borç)

- Günlük hedef: $50-80
- İşlem başına kar: $25-40
- Günlük işlem sayısı: 1-2

## 📞 Acil Yardım

### Bot durmuyor mu?

```bash
# Ctrl+C ile durdurun
# Veya kill komutu ile:
pkill -f "continuous-arbitrage"
```

### Contract'tan para çekme

```bash
# Emergency withdraw (sadece owner)
npx hardhat run scripts/emergency-withdraw.js --network mainnet
```

### Logları kontrol etme

```bash
# Son işlemleri görün
npm run monitor:mainnet

# Detaylı debug
DEBUG=true npm run bot:start
```

---

**🔥 5 dakikada başlamaya hazırsınız! 🔥**

Sorunlarınız için: GitHub Issues açabilir veya README.md'deki detaylı dökümantasyonu inceleyebilirsiniz.
