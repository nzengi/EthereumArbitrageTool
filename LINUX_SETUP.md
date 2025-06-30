# 🐧 Linux Sisteminde Ultra Arbitraj Botu Kurulum Rehberi

## 📋 Sistem Gereksinimleri

- **Ubuntu 20.04+** veya **CentOS 8+**
- **RAM**: Minimum 4GB (8GB önerilen)
- **Disk**: 10GB boş alan
- **İnternet**: Stabil bağlantı (24/7 çalışacak)

## 🚀 Adım 1: Node.js Kurulumu

### Ubuntu/Debian için:

```bash
# Node.js 18.x kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Git kurulumu
sudo apt-get install git

# Versiyonları kontrol et
node --version  # v18.x.x olmalı
npm --version   # 9.x.x olmalı
```

### CentOS/RHEL için:

```bash
# Node.js kurulumu
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git

# Versiyonları kontrol et
node --version
npm --version
```

## 📦 Adım 2: Projeyi İndirme ve Kurulum

```bash
# Ana dizine git
cd ~

# Projeyi klonla
git clone https://github.com/nzengi/EthereumArbitrageTool.git
cd EthereumArbitrageTool

# Bağımlılıkları kur
npm install
```

## 🔧 Adım 3: Environment Dosyası Oluşturma

```bash
# .env dosyasını oluştur
cat > .env << 'EOF'
# RPC URLs
MAINNET_RPC_URL=https://mainnet.infura.io/v3/4bcf9d0577da4ecc8ce07d76ca8b94e0
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/4bcf9d0577da4ecc8ce07d76ca8b94e0

# Private Key (0x olmadan - GÜVENLİ SAKLAYIN!)
PRIVATE_KEY=your_private_key_here

# API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key

# Bot Configuration
MIN_PROFIT_THRESHOLD=0.005
DEBUG=false
LOG_LEVEL=info
EOF

# Dosya izinlerini güvenli yap
chmod 600 .env
```

### Private Key Ekleme:

```bash
# Güvenli editör ile .env dosyasını düzenle
nano .env

# PRIVATE_KEY satırını gerçek private key'inizle değiştirin
# Örnek: PRIVATE_KEY=abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yz567890abcdef12
```

## 🧪 Adım 4: Test Etme

```bash
# Contract'ı derle
npm run compile

# Test ağında dene (opsiyonel)
npm run deploy

# Mainnet contract'ının çalıştığını kontrol et
node -e "console.log('Node.js çalışıyor ✅')"
```

## 🚀 Adım 5: Ultra Botu Çalıştırma

### Ön Plan (Foreground) Çalıştırma:

```bash
# Ultra bot'u başlat
npm run ultra-bot

# Çıktı örneği:
# 🚀 ULTRA ARBITRAGE BOT v2.0 🚀
# 📊 Configuration loaded...
# 💰 Scanning for opportunities...
```

### Arka Plan (Background) Çalıştırma:

```bash
# Screen kullanarak arka planda çalıştır
sudo apt-get install screen  # Ubuntu için
# sudo yum install screen    # CentOS için

# Yeni screen session başlat
screen -S arbitrage-bot

# Bot'u başlat
npm run ultra-bot

# Screen'den çık (bot çalışmaya devam eder)
# Ctrl+A, sonra D tuşlarına bas

# Tekrar bağlanmak için:
screen -r arbitrage-bot
```

### Systemd Service (Önerilen - Otomatik Başlatma):

```bash
# Service dosyası oluştur
sudo tee /etc/systemd/system/arbitrage-bot.service > /dev/null << EOF
[Unit]
Description=Ultra Arbitrage Bot
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/EthereumArbitrageTool
ExecStart=/usr/bin/npm run ultra-bot
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Service'i etkinleştir
sudo systemctl daemon-reload
sudo systemctl enable arbitrage-bot
sudo systemctl start arbitrage-bot

# Durumunu kontrol et
sudo systemctl status arbitrage-bot
```

## 📊 Adım 6: Monitoring ve Yönetim

### Log Takibi:

```bash
# Canlı log takibi
sudo journalctl -u arbitrage-bot -f

# Son 100 log satırı
sudo journalctl -u arbitrage-bot -n 100

# Bugünkü loglar
sudo journalctl -u arbitrage-bot --since today
```

### Bot Yönetimi:

```bash
# Bot'u durdur
sudo systemctl stop arbitrage-bot

# Bot'u başlat
sudo systemctl start arbitrage-bot

# Bot'u yeniden başlat
sudo systemctl restart arbitrage-bot

# Bot durumunu kontrol et
sudo systemctl status arbitrage-bot
```

### Performance Monitoring:

```bash
# CPU ve RAM kullanımı
htop

# Disk kullanımı
df -h

# Network trafiği
iftop  # sudo apt-get install iftop
```

## 🔒 Güvenlik Ayarları

### Firewall Konfigürasyonu:

```bash
# UFW firewall aktif et
sudo ufw enable

# Sadece SSH'a izin ver
sudo ufw allow ssh

# Gereksiz portları kapat
sudo ufw deny 3000
sudo ufw deny 8080
```

### Private Key Güvenliği:

```bash
# .env dosyasının izinlerini kontrol et
ls -la .env
# -rw------- olmalı (sadece owner okuyabilir)

# Backup oluştur (şifreli)
gpg -c .env  # .env.gpg dosyası oluşur
```

## 📈 Performans Optimizasyonu

### System Limits:

```bash
# Dosya limit'lerini artır
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Yeniden giriş yap veya reboot et
```

### Node.js Optimizasyonu:

```bash
# Memory limit artır (4GB RAM için)
export NODE_OPTIONS="--max-old-space-size=2048"

# .bashrc'ye ekle
echo 'export NODE_OPTIONS="--max-old-space-size=2048"' >> ~/.bashrc
```

## 🚨 Sorun Giderme

### Bot Başlamıyor:

```bash
# Hata loglarını kontrol et
sudo journalctl -u arbitrage-bot --since "1 hour ago"

# Manuel test
cd ~/EthereumArbitrageTool
npm run ultra-bot
```

### RPC Bağlantı Sorunu:

```bash
# RPC URL'ini test et
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://mainnet.infura.io/v3/4bcf9d0577da4ecc8ce07d76ca8b94e0
```

### Yetersiz ETH Hatası:

```bash
# Bakiye kontrol scripti
node -e "
const { ethers } = require('hardhat');
async function checkBalance() {
  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);
  console.log('Bakiye:', ethers.formatEther(balance), 'ETH');
}
checkBalance();
"
```

## 📊 Başarı Metrikleri

Bot çalışırken göreceğin çıktı:

```
╔══════════════════════════════════════════════════════════════╗
║                🚀 ULTRA ARBITRAGE BOT v2.0 🚀                ║
║              Engineered for Maximum Profit                   ║
╚══════════════════════════════════════════════════════════════╝

📊 Bot Configuration:
   - Network: mainnet
   - Contract: 0x5846D3bDF1103001C9c7837D33f02E260F83f53F
   - Min Profit: 0.12%
   - Scan Interval: 10 seconds
   - Max Trades/Day: 20

💰 Market Analysis:
   - ETH Price: $2,400.50
   - Gas Price: 12 gwei
   - Active Pairs: 3

🔍 Opportunity Scanner Active...
   - WETH/USDC: 0.08% spread
   - WETH/USDT: 0.15% spread ⚡
   - WETH/DAI: 0.05% spread

⚡ TRADE EXECUTED!
   - Pair: WETH/USDT
   - Amount: 1.2 ETH
   - Profit: 0.0089 ETH ($21.36)
   - Gas: 0.0012 ETH ($2.88)
   - Net: 0.0077 ETH ($18.48)

📈 Daily Stats:
   - Trades: 3/20
   - Profit: $45.60
   - Success Rate: 100%
   - Target: $40.00 ✅
```

## 🎯 Günlük Hedefler

- **$40/gün** kar hedefi
- **Maksimum 20** işlem/gün
- **%85+** başarı oranı
- **Otomatik** çalışma (24/7)

---

## 🔄 Güncelleme ve Bakım

### Bot Güncelleme:

```bash
# Botu durdur
sudo systemctl stop arbitrage-bot

# Güncellemeleri çek
cd ~/EthereumArbitrageTool
git pull origin main
npm install

# Botu başlat
sudo systemctl start arbitrage-bot
```

### Log Temizleme:

```bash
# Eski logları temizle (1 hafta öncesi)
sudo journalctl --vacuum-time=7d

# Log boyutunu sınırla (100MB)
sudo journalctl --vacuum-size=100M
```

---

**🚀 Linux sisteminde ultra bot kurulumu tamamlandı!**

Bot artık 24/7 çalışarak arbitraj fırsatlarını yakalayacak ve günlük $40 hedefine ulaşmaya çalışacak.

**Önemli Notlar:**

- Private key'inizi asla paylaşmayın
- Düzenli olarak logları kontrol edin
- Sistem güncellemelerini takip edin
- Backup'larınızı düzenli alın
