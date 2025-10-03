# 🚀 AI-Powered Log Analyzer Backend

> **Intelligent log analysis system powered by Cerebras LLaMA 4** - Automatically detects anomalies, generates smart alerts, and provides natural language insights into your application logs.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Configuration](#-configuration)
- [AI Models](#-ai-models)
- [Monitoring](#-monitoring)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 🤖 AI-Powered Analysis

- **Automatic Anomaly Detection** - Cerebras LLaMA 4 Scout analyzes every log
- **Root Cause Analysis** - AI explains WHY errors happened
- **Smart Clustering** - Groups similar errors together
- **Natural Language Search** - Ask questions like "Why are payments failing?"
- **Storytelling Explanations** - Human-readable error explanations

### 🚨 Smart Alerts

- **Error Rate Spike Detection** - Alerts when error rate increases >50%
- **Critical Endpoint Monitoring** - Tracks payment, auth, checkout failures
- **User Impact Analysis** - Estimates affected users and revenue loss
- **Blast Radius Tracking** - Shows how many users are affected by each error
- **Auto-escalation** - Critical alerts with runbook suggestions

### ⚡ High Performance

- **Batch Processing** - Handles 50 logs at once
- **Connection Pooling** - 50 max MongoDB connections
- **Redis Queue** - Bull queues for async processing
- **Rate Limiting** - 10,000 requests/minute
- **Compression** - Smaller API responses
- **Auto-cleanup** - Keeps last 7 days only

### 📊 Advanced Features

- **User Journey Timeline** - Track what users did before errors
- **Session Replay** - See complete user flow leading to errors
- **Trending Issues** - Real-time top problems
- **AI Copilot Chat** - Conversational log analysis
- **Multiple AI Models** - Cerebras for analysis + LLaMA for explanations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT/FRONTEND                       │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP/REST
                    ▼
┌─────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER                         │
│  • Rate Limiting (10k req/min)                          │
│  • Compression & Security (Helmet)                      │
│  • Request Logging                                      │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│  LOG ROUTES   │       │  AI ROUTES    │
│  • POST /logs │       │  • AI Search  │
│  • GET /logs  │       │  • Alerts     │
│  • Stats      │       │  • Timeline   │
└───────┬───────┘       └───────┬───────┘
        │                       │
        ▼                       ▼
┌─────────────────────────────────────────┐
│           BULL QUEUE (Redis)            │
│  • Log Processing Queue                 │
│  • AI Analysis Queue                    │
│  • Retry Logic (3 attempts)             │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│            MONGODB                       │
│  Collections:                            │
│  • logs (raw ingestion)                 │
│  • cerebraslogs (AI analysis)           │
│  • alerts (smart alerts)                │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│         CEREBRAS AI API                  │
│  • LLaMA 4 Scout 17B (analysis)         │
│  • Anomaly detection                     │
│  • Root cause identification             │
│  • Error clustering                      │
└─────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Category        | Technology                 |
| --------------- | -------------------------- |
| **Runtime**     | Node.js v16+               |
| **Framework**   | Express.js                 |
| **Database**    | MongoDB (Mongoose ODM)     |
| **Cache/Queue** | Redis + Bull               |
| **AI Engine**   | Cerebras LLaMA 4 Scout 17B |
| **Security**    | Helmet, express-rate-limit |
| **Compression** | compression middleware     |
| **Scheduling**  | node-cron                  |

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required software
✅ Node.js v16 or higher
✅ MongoDB v5 or higher
✅ Redis v6 or higher
✅ Cerebras API Key (get from https://cerebras.ai/)
```

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Add your environment variables
nano .env
```

### Environment Variables

Create a `.env` file in the backend root:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/log-analyzer

# Cerebras AI
CEREBRAS_API_KEY=your_cerebras_api_key_here

# Redis (optional - defaults to localhost)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Start Services

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Redis
redis-server

# Terminal 3: Start Backend
npm start
```

### Verify Installation

```bash
# Check health endpoint
curl http://localhost:5000/health

# Expected response:
{
  "status": "OK",
  "uptime": 123.45,
  "cerebrasApiConfigured": true,
  "memory": { ... }
}
```

---

## 📡 API Documentation

### **Logs API**

#### 1. Send Single Log

```bash
POST /api/logs
Content-Type: application/json

{
  "level": "ERROR",
  "message": "Payment gateway timeout",
  "endpoint": "/api/payment",
  "userId": "user_123",
  "sessionId": "sess_456",
  "city": "New York",
  "errorCode": "PAYMENT_GATEWAY_TIMEOUT",
  "responseTime": 5000
}
```

**Response:**

```json
{
  "success": true,
  "message": "Log queued for processing"
}
```

---

#### 2. Send Batch Logs (Recommended for high volume)

```bash
POST /api/logs/batch
Content-Type: application/json

{
  "logs": [
    { "level": "ERROR", "message": "..." },
    { "level": "INFO", "message": "..." },
    { "level": "WARN", "message": "..." }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Batch of 3 logs queued for processing"
}
```

---

#### 3. Get Logs (with filters)

```bash
GET /api/logs?level=ERROR,CRITICAL&limit=50&page=1&anomalyOnly=true
```

**Response:**

```json
{
  "success": true,
  "page": 1,
  "total": 1234,
  "logs": [...]
}
```

---

#### 4. Get Statistics

```bash
GET /api/logs/stats
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "total": 10000,
    "anomalies": 234,
    "byLevel": {
      "ERROR": 500,
      "CRITICAL": 50,
      "WARN": 1000,
      "INFO": 8450
    }
  },
  "recentErrors": [...]
}
```

---

### **AI Search API (Copilot)**

#### 5. Natural Language Search

```bash
POST /api/ai/search
Content-Type: application/json

{
  "query": "Why are payments failing?",
  "timeRange": 24
}
```

**Response:**

```json
{
  "success": true,
  "answer": "Payments are failing due to gateway timeouts...",
  "rootCause": "Payment gateway experiencing high latency",
  "impact": "47 users affected, estimated $2,350 revenue loss",
  "suggestedFixes": [
    "Enable circuit breaker on payment service",
    "Switch to backup payment gateway",
    "Increase gateway timeout to 10 seconds"
  ],
  "relevantLogs": [...]
}
```

---

#### 6. Get Trending Issues

```bash
GET /api/ai/trending?hours=1
```

**Response:**

```json
{
  "success": true,
  "trending": [
    {
      "_id": "Payment Gateway Timeout",
      "count": 45,
      "avgAnomalyScore": 0.85,
      "severity": "critical"
    }
  ]
}
```

---

### **Smart Alerts API**

#### 7. Get Recent Alerts

```bash
GET /api/alerts?hours=24&limit=100
```

**Response:**

```json
{
  "success": true,
  "alerts": [
    {
      "alertId": "alert_1234_spike",
      "type": "ERROR_SPIKE",
      "severity": "HIGH",
      "title": "⚠️ Error Rate Spike Detected (+150%)",
      "description": "Error rate jumped from 2.3% to 5.8%",
      "affectedLogs": 123,
      "affectedUsers": 45,
      "status": "active",
      "suggestedAction": "Investigate top error patterns immediately",
      "runbook": [...]
    }
  ]
}
```

---

#### 8. Acknowledge Alert

```bash
POST /api/alerts/:alertId/acknowledge
```

---

#### 9. Resolve Alert

```bash
POST /api/alerts/:alertId/resolve
```

---

### **Timeline API (User Journey)**

#### 10. Get Session Timeline

```bash
GET /api/timeline/session/:sessionId
```

**Response:**

```json
{
  "success": true,
  "sessionId": "sess_456",
  "summary": {
    "totalEvents": 12,
    "duration": "2m 34s",
    "errorOccurred": true
  },
  "timeline": [
    { "timestamp": "...", "action": "🏠 Visited homepage" },
    { "timestamp": "...", "action": "🎭 Browsed events" },
    { "timestamp": "...", "action": "💳 Payment attempt" },
    { "timestamp": "...", "action": "❌ Error occurred" }
  ],
  "errorAnalysis": {
    "whatHappened": "Payment gateway timeout",
    "whyItHappened": "Gateway response exceeded 5s threshold",
    "howToFix": "Increase timeout or use backup gateway",
    "userImpact": "User completed: browsing → cart → payment, but failed at payment"
  }
}
```

---

#### 11. Get Blast Radius

```bash
GET /api/timeline/blast-radius/:errorCode?hours=1
```

**Response:**

```json
{
  "success": true,
  "blastRadius": {
    "errorCode": "PAYMENT_GATEWAY_TIMEOUT",
    "affectedUsers": 47,
    "affectedCities": ["New York", "Los Angeles"],
    "totalOccurrences": 123,
    "estimatedRevenueLoss": "$2,350.00"
  }
}
```

---

## ⚙️ Configuration

### MongoDB Connection Pooling

Edit `backend/config/database.js`:

```javascript
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 50, // Max connections
  minPoolSize: 10, // Min connections
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### Rate Limiting

Edit `backend/server.js`:

```javascript
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10000, // 10k requests per minute
  message: "Too many requests",
});
```

### AI Analysis Schedule

Edit `backend/server.js`:

```javascript
// Runs every 2 minutes (change to */5 for 5 minutes)
cron.schedule("*/2 * * * *", async () => {
  await aiAnalysisQueue.add({ batchSize: 500 });
});
```

### Auto-cleanup Schedule

```javascript
// Runs daily at 3 AM, keeps last 7 days
cron.schedule("0 3 * * *", async () => {
  const daysToKeep = 7; // Change this value
  // ... cleanup logic
});
```

---

## 🤖 AI Models

### Cerebras LLaMA 4 Scout 17B

**Used for:** Real-time log analysis, anomaly detection, clustering

**Configuration:**

```javascript
model: "llama-4-scout-17b-16e-instruct";
temperature: 0.1; // Low for consistent analysis
max_tokens: 8000;
```

**Features:**

- Detects anomalies with 0-1 score
- Identifies root causes automatically
- Groups similar errors into clusters
- Provides actionable fix suggestions

**Cost:** ~$0.10 per 1M tokens (very cheap!)

---

## 📊 Monitoring

### Queue Status

```bash
GET /api/logs/queue/stats
```

**Response:**

```json
{
  "queue": {
    "waiting": 10,
    "active": 2,
    "completed": 1234,
    "failed": 3
  }
}
```

### Memory Monitoring

The server automatically logs memory warnings if usage exceeds 400MB:

```
⚠️ High memory usage: 450MB
```

### Health Check

```bash
GET /health
```

Provides:

- Server uptime
- Memory usage (RSS, heap)
- Cerebras API configuration status

---

## 🐛 Troubleshooting

### Issue: Logs not being analyzed

**Solution:**

1. Check Redis is running: `redis-cli ping`
2. Check AI queue: `GET /api/logs/queue/stats`
3. Verify Cerebras API key: `GET /health`
4. Check logs: `tail -f server.log`

---

### Issue: MongoDB connection failed

**Solution:**

```bash
# Check MongoDB is running
systemctl status mongod

# Check connection string
echo $MONGODB_URI

# Test connection
mongosh "mongodb://localhost:27017/log-analyzer"
```

---

### Issue: High memory usage

**Solution:**

- Reduce `batchSize` in AI analysis (line 185 in server.js)
- Decrease `maxPoolSize` in MongoDB config
- Enable more aggressive cleanup (reduce `daysToKeep`)

---

### Issue: Rate limit errors

**Solution:**
Edit rate limiter in `server.js`:

```javascript
max: 20000; // Increase from 10000
```

---

## 📈 Performance Tips

1. **Batch Logs** - Use `/api/logs/batch` instead of individual POSTs
2. **Enable Compression** - Already enabled, but ensure client supports gzip
3. **Use Indexes** - MongoDB indexes are auto-created on startup
4. **Monitor Queue** - Keep queue length under 100 for best performance
5. **Scale Horizontally** - Run multiple backend instances behind load balancer

---

## 🔒 Security

- ✅ **Helmet.js** - Security headers
- ✅ **Rate Limiting** - Prevents DDoS
- ✅ **CORS** - Configured for your frontend
- ✅ **Input Validation** - All endpoints validate input
- ✅ **Error Handling** - No sensitive data in error responses

---

## 📝 Development

### Running in Development Mode

```bash
NODE_ENV=development npm start
```

**Development features:**

- Detailed error messages
- Console logging
- No compression (for debugging)

### Running Tests

```bash
npm test
```

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong MongoDB password
- [ ] Enable MongoDB authentication
- [ ] Use Redis password
- [ ] Set up log rotation
- [ ] Configure firewall (block direct MongoDB/Redis access)
- [ ] Use process manager (PM2 recommended)
- [ ] Set up monitoring (Prometheus/Grafana)

### Deploy with PM2

```bash
npm install -g pm2
pm2 start server.js --name log-analyzer-backend
pm2 save
pm2 startup
```

---

## 📦 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── models/
│   ├── Log.js              # Raw logs schema
│   ├── CerebrasLog.js      # AI-analyzed logs schema
│   └── Alert.js            # Smart alerts schema
├── routes/
│   ├── logs.js             # Log ingestion endpoints
│   ├── aiLogs.js           # AI log queries
│   ├── aiSearch.js         # Natural language search
│   ├── smartAlerts.js      # Alert management
│   └── timeline.js         # User journey tracking
├── services/
│   ├── logQueue.js         # Bull queue for logs
│   ├── cerebrasService.js  # AI analysis service
│   ├── aiSearchService.js  # NL search logic
│   ├── smartAlerts.js      # Alert engine
│   └── llamaService.js     # LLaMA explanations
├── server.js               # Main application entry
├── package.json
└── .env.example
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Cerebras AI** - For the amazing LLaMA 4 Scout model
- **Bull Queue** - For reliable job processing
- **MongoDB** - For flexible document storage

---

## 📞 Support

- 📧 Email: your-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 Discord: [Join our community](#)

---

<div align="center">

**Made with ❤️ by Team Ananta**

⭐ Star this repo if you find it helpful!

</div>
