# 🚀 Ethereum Flash Loan Arbitrage Tool

## 📋 Proje Hakkında

Bu proje, Ethereum ağında DEX'ler arası fiyat farklarından yararlanarak arbitraj yapan gelişmiş bir flash loan arbitraj botudur. Aave V3 flash loan'ları kullanarak sıfır sermaye ile arbitraj işlemleri gerçekleştirir.

### ✨ Özellikler

- **Flash Loan Arbitrage**: Aave V3 protokolü ile sıfır sermaye arbitrajı
- **Multi-DEX Support**: Uniswap V2, SushiSwap desteği
- **MEV-Boost Integration**: Flashbots entegrasyonu ile gelişmiş kar optimizasyonu
- **Real-time Monitoring**: Sürekli fiyat izleme ve otomatik işlem tetikleme
- **Gas Optimization**: Düşük gas maliyeti ile optimize edilmiş işlemler
- **Profit Tracking**: Kar takibi ve detaylı raporlama

### 🎯 Desteklenen Ağlar

- **Mainnet**: Üretim ortamı (önerilen)
- **Sepolia Testnet**: Test ortamı

## 🛠 Kurulum

### 1. Sistem Gereksinimleri

- Node.js (v16 veya üzeri)
- npm veya yarn
- Git

### 2. Projeyi İndirin

```bash
git clone https://github.com/nzengi/EthereumArbitrageTool.git
cd EthereumArbitrageTool
```

### 3. Bağımlılıkları Kurun

```bash
npm install
```

### 4. Environment Variables Ayarlayın

`.env` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```bash
# .env dosyası
# RPC URLs
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Private Key (0x olmadan)
PRIVATE_KEY=your_private_key_here

# Etherscan API Key (contract verification için)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Opsiyonel API Keys (daha iyi fiyat verisi için)
BINANCE_API_KEY=your_binance_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key

# Bot Configuration
MIN_PROFIT_THRESHOLD=0.005  # ETH cinsinden minimum kar (varsayılan: ~$12)
```

### 5. Smart Contract'ı Derleyin

```bash
npm run compile
```

## 🚀 Kullanım

### Test Ağında Deneme (Sepolia)

#### 1. Contract'ı Deploy Edin

```bash
npm run deploy
```

#### 2. Contract'ı Verify Edin (Opsiyonel)

```bash
npm run verify
```

#### 3. Test Arbitrajı Çalıştırın

```bash
npm run test:arbitrage
```

### Mainnet'te Üretim Kullanımı

⚠️ **DİKKAT**: Mainnet'te gerçek para kullanılır. Önce test ağında deneyin!

#### 1. Mainnet'e Deploy

```bash
npm run deploy:mainnet
```

#### 2. Bot'u Başlatın

##### Standart Bot (Sürekli Çalışan)

```bash
npm run bot:start
```

##### MEV-Boost Entegre Bot (Önerilen)

```bash
npm run bot:mev-boost
```

#### 3. Kar Monitörü

```bash
npm run monitor:mainnet
```

## 📊 Bot Komutları

### Temel Komutlar

| Komut                     | Açıklama                  |
| ------------------------- | ------------------------- |
| `npm run compile`         | Smart contract'ları derle |
| `npm run deploy`          | Sepolia'ya deploy et      |
| `npm run deploy:mainnet`  | Mainnet'e deploy et       |
| `npm run bot:start`       | Ana botu başlat           |
| `npm run bot:mev-boost`   | MEV-Boost entegre bot     |
| `npm run execute:mainnet` | Tek seferlik arbitraj     |
| `npm run monitor:mainnet` | Kar monitörü              |

### Gelişmiş Komutlar

| Komut                         | Açıklama                   |
| ----------------------------- | -------------------------- |
| `npm run rbuilder:setup`      | rbuilder ortamını kur      |
| `npm run rbuilder:start`      | rbuilder'ı başlat          |
| `npm run rbuilder:production` | Üretim anahtarları oluştur |

## 💰 Karlılık ve Stratejiler

### Başlangıç Sermayesi Önerileri

#### Küçük Sermaye (1 ETH borç)

- **Hedef**: Günde $20 kar
- **Min Kar Eşiği**: 0.005 ETH (~$12)
- **İşlem Sıklığı**: Günde 2-3 işlem
- **Risk**: Düşük

#### Orta Sermaye (5 ETH borç)

- **Hedef**: Günde $50 kar
- **Min Kar Eşiği**: 0.02 ETH (~$50)
- **İşlem Sıklığı**: Günde 1-2 işlem
- **Risk**: Orta

### Maliyet Hesaplaması

```
Total Cost = Aave Fee (0.09%) + Gas Fee + Bot Fee (0.1% of profit)

Örnek 1 ETH borrowing:
- Aave Fee: 0.0009 ETH (~$2.16)
- Gas Fee: ~0.001 ETH (~$2.40) (1-2 Gwei ile)
- Bot Fee: Sadece kar üzerinden %0.1
```

## 🔒 Güvenlik

### Smart Contract Güvenliği

- **Owner-only Functions**: Sadece owner işlem yapabilir
- **Reentrancy Protection**: Yeniden girme saldırılarına karşı korunmalı
- **Emergency Withdraw**: Acil durum fonları çekme
- **Audited Code**: OpenZeppelin standartları

### Operasyonel Güvenlik

- **Private Key**: Asla paylaşmayın, güvenli saklayın
- **Test First**: Önce testnet'te deneyin
- **Monitor Regularly**: Sürekli monitör edin
- **Profit Limits**: Kar limitlerini ayarlayın

## 📈 Monitoring ve Analytics

### Real-time Monitoring

Bot çalışırken göreceğiniz çıktı örneği:

```
🚀 Starting Flash Loan Arbitrage Bot...
📊 Configuration:
   - Network: mainnet
   - Min Profit: 0.005 ETH
   - Gas Price: 1 Gwei
   - Contract: 0x2Ec4D7102ab6863aEef44d140Af01CB667eD5DAa

💰 Scanning for opportunities...
📊 ETH Price: $2,400.50
   - Uniswap: $2,398.20
   - SushiSwap: $2,403.80
   - Difference: 0.23% ($5.60)

🔍 Opportunity found! Potential profit: 0.008 ETH ($19.20)
⚡ Executing arbitrage...
✅ Transaction successful! Profit: 0.0067 ETH ($16.08)
```

### Profit Reports

```bash
# Günlük kar raporu
npm run monitor:mainnet

# Çıktı örneği:
📊 Daily Profit Report:
   - Total Profit: 0.045 ETH ($108.00)
   - Successful Trades: 7
   - Failed Trades: 2
   - Success Rate: 77.8%
   - Gas Spent: 0.012 ETH ($28.80)
   - Net Profit: 0.033 ETH ($79.20)
```

## 🛠 Troubleshooting

### Yaygın Sorunlar

#### 1. "Transaction failed" hatası

```bash
# Gas limit'i artırın
export GAS_LIMIT=3000000
npm run bot:start
```

#### 2. "Insufficient funds" hatası

```bash
# Cüzdan bakiyenizi kontrol edin
# En az 0.1 ETH gas fee için gerekli
```

#### 3. "Rate limit exceeded" hatası

```bash
# API key'lerinizi .env dosyasına ekleyin
# Veya farklı RPC provider kullanın
```

### Debug Modu

```bash
# Detaylı loglar için
DEBUG=true npm run bot:start

# Sadece hata logları için
LOG_LEVEL=error npm run bot:start
```

## 🤝 Katkıda Bulunma

1. Fork'layın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit'leyin (`git commit -m 'Add amazing feature'`)
4. Branch'i push'layın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje ISC lisansı altında lisanslanmıştır.

## ⚠️ Feragatname

Bu yazılım eğitim amaçlıdır. Gerçek parayla kullanımdan kaynaklanan zararlardan sorumlu değiliz. Lütfen kendi riskinizi değerlendirin ve sadece kaybetmeyi göze alabileceğiniz miktarla işlem yapın.

## 📞 Destek

- **GitHub Issues**: Bug raporu ve feature istekleri için
- **Documentation**: `/docs` klasöründe detaylı dökümantasyon

---

**🔥 Happy Arbitraging! 🔥**
