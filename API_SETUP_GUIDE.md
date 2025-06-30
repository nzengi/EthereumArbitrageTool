# 🚀 Enhanced Arbitrage Bot - API Setup Guide

## 🎯 Bu Nedir?

Bu **Enhanced Ultra Arbitrage Bot v3.0** free API limitlerinizde çalışacak şekilde optimize edilmiştir. Rate limiting, caching ve smart API rotation ile:

- ✅ **Free Infura/Alchemy** ile çalışır
- ✅ **API rate limit**lerini otomatik handle eder
- ✅ **Akıllı cache** sistemi ile efficiency artırır
- ✅ **Adaptive interval** ile sorunsuz çalışır

## 🔑 Gerekli API Keys

### 1️⃣ Infura API Key (ÜCRETSİZ)

- **Website**: [https://app.infura.io/register](https://app.infura.io/register)
- **Limit**: 100,000 requests/day (~69 per minute)
- **Setup**:
  1. Hesap oluştur
  2. "Create New Key" → "Web3 API" seç
  3. Project ID'yi kopyala
  4. `.env` dosyasına `INFURA_API_KEY=` olarak ekle

### 2️⃣ Alchemy API Key (ÜCRETSİZ)

- **Website**: [https://dashboard.alchemy.com/signup](https://dashboard.alchemy.com/signup)
- **Limit**: 300M compute units/month
- **Setup**:
  1. Hesap oluştur
  2. "Create new app" → "Ethereum" → "Mainnet" seç
  3. API Key'i kopyala
  4. `.env` dosyasına `ALCHEMY_API_KEY=` olarak ekle

### 3️⃣ Private Key

- **MetaMask'ten Export**:
  1. Account → Settings → Security → Export Private Key
  2. `0x` prefix'ini kaldır (sadece 64 karakter)
  3. `.env` dosyasına `PRIVATE_KEY=` olarak ekle
  4. ⚠️ **ASLA kimseyle paylaşma!** ⚠️

## 📝 .env Dosyası Setup

Proje root'unda `.env` dosyası oluştur:

```bash
# .env dosyası içeriği
PRIVATE_KEY=your_64_character_private_key_here
INFURA_API_KEY=your_infura_project_id_here
ALCHEMY_API_KEY=your_alchemy_api_key_here
```

## 🧪 Setup Test Et

Botunu çalıştırmadan önce API key'lerini test et:

```bash
npm run check-api
```

Bu komut:

- ✅ API key'lerin geçerli olup olmadığını test eder
- ✅ Rate limit'leri simule eder
- ✅ Öneriler sunar
- ✅ Bot hazır mı kontrol eder

## 🚀 Bot'u Başlat

### Enhanced Bot (Önerilen):

```bash
npm run enhanced-bot
```

**Özellikler:**

- 🐌 30 saniye scan interval (API friendly)
- 🔄 Otomatik provider rotation
- 📦 15-30 saniye cache sistemi
- 🚫 Rate limit otomatik handling
- 📊 Real-time API monitoring

### Original Bot (Riskli):

```bash
npm run ultra-bot
```

⚠️ **Dikkat**: 10 saniye interval ile rate limit'e takılabilir!

## 📊 Rate Limit Bilgileri

| Provider | Free Limit             | Enhanced Bot Kullanım |
| -------- | ---------------------- | --------------------- |
| Infura   | 100K req/day (~69/min) | ~60/min (güvenli)     |
| Alchemy  | 300M units/month       | Variable              |
| Binance  | 1,200 req/min          | ~10/min               |

## 🛡️ Sorun Giderme

### "Too Many Requests" Hatası:

```
⚠️ Price fetch error: Too Many Requests error received from mainnet.infura.io
```

**Çözüm**: Enhanced bot kullan:

```bash
npm run enhanced-bot
```

### API Key Hatası:

```
❌ INFURA_API_KEY not set in .env file
```

**Çözüm**:

1. `.env` dosyasını kontrol et
2. API key'leri doğru kopyaladığından emin ol
3. `npm run check-api` ile test et

### Contract Deployment Hatası:

```
❌ Deployment file not found!
```

**Çözüm**: Contract'ı deploy et:

```bash
npm run deploy:mainnet
```

## 💡 Optimizasyon Önerileri

### Free Tier için:

- 🎯 **30-45 saniye** scan interval kullan
- 🔄 **Multiple provider** kullan (Infura + Alchemy)
- 📦 **Aggressive caching** aktif et
- 📊 **API usage monitoring** yap

### Kar Hedefleri:

- 💰 **$20-40/day** realistic hedef
- 📈 **0.08-0.15%** profit threshold
- ⛽ **5-8 gwei** max gas price

## 🎮 İleri Seviye

### Custom Configuration:

`.env` dosyasına ekleyebilirsin:

```bash
# Özel ayarlar
MAX_GAS_PRICE=8
MIN_PROFIT_PERCENT=0.08
SCAN_INTERVAL=30000
```

### Monitor Performance:

```bash
# Real-time monitoring
npm run monitor:mainnet
```

## 🆘 Yardım

**Enhanced Bot çalışmıyor?**

1. `npm run check-api` çalıştır
2. API key'leri doğru mu kontrol et
3. Internet bağlantını kontrol et
4. Rate limit'e takıldıysan 1-2 dakika bekle

**Sorular?**

- 📖 Bu guide'ı tekrar oku
- 🔧 `check-api` script'ini çalıştır
- 💬 İhtiyacın varsa sor!

---

## 🎉 Başarılı Setup Örneği:

```bash
$ npm run check-api

╔══════════════════════════════════════════════════════════════╗
║                    🔑 API SETUP CHECKER                      ║
║            Test your API keys before running bot             ║
╚══════════════════════════════════════════════════════════════╝

🔍 Checking API configurations...

✅ Infura API: Working! Latest block: 21234567
✅ Alchemy API: Working! Latest block: 21234567
✅ Binance API: Working! ETH Price: $2421.45
✅ Private Key: Set correctly (0x1234...abcd)

══════════════════════════════════════════════════════════════
📊 SETUP STATUS: 4/4 services working
══════════════════════════════════════════════════════════════
✅ READY TO RUN! You can start the enhanced bot.
🚀 Command: npm run enhanced-bot
```

Bu durumda **HAZIRSIN!** 🎉

```bash
npm run enhanced-bot
```

ile botu başlatabilirsin!
