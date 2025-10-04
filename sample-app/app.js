const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // Add this dependency
// require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Backend URL where logs will be sent
// Change these lines at the top of sample-app/app.js
const LOG_BACKEND_URL = process.env.LOG_BACKEND_URL || 'http://localhost:5000/api/logs';
const BATCH_LOG_URL = process.env.BATCH_LOG_URL || 'http://localhost:5000/api/logs/batch';
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock data for realistic booking platform
const mockEvents = [
  { id: 1, name: 'Coldplay Concert', price: 2500, venue: 'Wembley Stadium', available: 150 },
  { id: 2, name: 'Taylor Swift Era Tour', price: 3500, venue: 'Madison Square', available: 50 },
  { id: 3, name: 'Marvel Movie Premiere', price: 800, venue: 'IMAX Theater', available: 200 },
  { id: 4, name: 'Cricket World Cup Final', price: 5000, venue: 'Lords Cricket Ground', available: 25 },
  { id: 5, name: 'Stand-up Comedy Night', price: 600, venue: 'Comedy Club', available: 80 }
];

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'];
const userNames = ['Arjun', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Anita', 'Rohit', 'Kavya'];

// Batch logging for better performance
let logBatch = [];
const BATCH_SIZE = 20; // Send 20 logs at once
const BATCH_TIMEOUT = 2000; // Or send after 2 seconds
let batchTimer = null;

// Enhanced logging function - now sends to backend
async function createLog(level, message, details = {}) {
  const log = {
    timestamp: new Date().toISOString(),
    level: level,
    message: message,
    service: 'ticketbooking-platform',
    userId: `user_${Math.floor(Math.random() * 10000)}`,
    sessionId: `session_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    requestId: `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    city: cities[Math.floor(Math.random() * cities.length)],
    ...details
  };
  
  // Still log to console for debugging
  console.log(`📊 ${level}: ${message}`);
  
  // Add to batch for sending to backend
  addLogToBatch(log);
  
  return log;
}

// Add log to batch
function addLogToBatch(logData) {
  logBatch.push(logData);
  
  // If batch is full, send immediately
  if (logBatch.length >= BATCH_SIZE) {
    clearTimeout(batchTimer);
    sendLogBatch();
  } else {
    // Otherwise, wait for timeout
    if (!batchTimer) {
      batchTimer = setTimeout(sendLogBatch, BATCH_TIMEOUT);
    }
  }
}

// Send batch of logs to backend
async function sendLogBatch() {
  if (logBatch.length === 0) return;
  
  const currentBatch = [...logBatch];
  logBatch = [];
  batchTimer = null;
  
  try {
    await axios.post(BATCH_LOG_URL, { logs: currentBatch }, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Sent ${currentBatch.length} logs to backend successfully`);
  } catch (error) {
    console.error(`❌ Failed to send batch of ${currentBatch.length} logs:`, error.message);
    
    // Fallback: try individual log sending
    for (const log of currentBatch) {
      try {
        await axios.post(LOG_BACKEND_URL, log, { timeout: 3000 });
      } catch (individualError) {
        console.error('❌ Individual log send also failed:', individualError.message);
      }
    }
  }
}

// Send single log to backend (alternative method)
async function sendSingleLog(logData) {
  try {
    await axios.post(LOG_BACKEND_URL, logData, {
      timeout: 3000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('✅ Single log sent to backend');
  } catch (error) {
    console.error('❌ Failed to send single log:', error.message);
  }
}

// All simulation functions (unchanged but now send logs to backend)
function simulateHomePage() {
  createLog('INFO', 'User visited homepage', {
    endpoint: 'GET /',
    responseTime: Math.floor(Math.random() * 500) + 100,
    eventsDisplayed: 5
  });
}

function simulateEventBrowse() {
  const event = mockEvents[Math.floor(Math.random() * mockEvents.length)];
  createLog('INFO', 'User browsed event details', {
    endpoint: `GET /events/${event.id}`,
    eventName: event.name,
    eventPrice: event.price,
    availableTickets: event.available,
    responseTime: Math.floor(Math.random() * 300) + 50
  });
}

function simulateAddToCart() {
  const event = mockEvents[Math.floor(Math.random() * mockEvents.length)];
  const success = Math.random() > 0.3; // 70% success rate
  
  if (success) {
    createLog('INFO', 'Ticket added to cart successfully', {
      endpoint: 'POST /cart/add',
      eventId: event.id,
      eventName: event.name,
      quantity: Math.floor(Math.random() * 4) + 1,
      totalPrice: event.price * (Math.floor(Math.random() * 4) + 1)
    });
  } else {
    createLog('ERROR', 'Failed to add ticket to cart', {
      endpoint: 'POST /cart/add',
      eventId: event.id,
      eventName: event.name,
      errorCode: 'INSUFFICIENT_INVENTORY',
      errorMessage: 'Not enough tickets available'
    });
  }
}

function simulatePaymentAttempt() {
  const event = mockEvents[Math.floor(Math.random() * mockEvents.length)];
  const paymentMethods = ['credit_card', 'debit_card', 'upi', 'netbanking', 'wallet'];
  const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
  const quantity = Math.floor(Math.random() * 4) + 1;

  // Check if tickets are available
  if (event.available < quantity) {
    createLog('ERROR', 'Payment failed - tickets sold out', {
      endpoint: 'POST /payment/process',
      paymentMethod: paymentMethod,
      eventId: event.id,
      eventName: event.name,
      requestedQuantity: quantity,
      availableTickets: event.available,
      errorCode: 'TICKETS_SOLD_OUT',
      errorMessage: 'Tickets are no longer available'
    });
    return;
  }

  const success = Math.random() > 0.4; // 60% success rate

  if (success) {
    createLog('INFO', 'Payment processed successfully', {
      endpoint: 'POST /payment/process',
      paymentMethod: paymentMethod,
      amount: event.price * quantity,
      transactionId: `txn_${Date.now()}`,
      bankResponse: 'SUCCESS',
      processingTime: Math.floor(Math.random() * 3000) + 500
    });
  } else {
    const errors = [
      { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient balance in account' },
      { code: 'CARD_DECLINED', message: 'Card declined by bank' },
      { code: 'PAYMENT_GATEWAY_TIMEOUT', message: 'Payment gateway timeout' },
      { code: 'INVALID_CVV', message: 'Invalid CVV entered' }
    ];
    const error = errors[Math.floor(Math.random() * errors.length)];

    createLog('ERROR', 'Payment failed', {
      endpoint: 'POST /payment/process',
      paymentMethod: paymentMethod,
      amount: event.price * quantity,
      errorCode: error.code,
      errorMessage: error.message,
      retryAttempt: Math.floor(Math.random() * 3) + 1
    });
  }
}

function simulateSearchFailure() {
  createLog('WARN', 'Search returned no results', {
    endpoint: 'GET /search',
    searchQuery: ['Bollywood concert', 'Football match', 'Theater show'][Math.floor(Math.random() * 3)],
    filters: { city: cities[Math.floor(Math.random() * cities.length)], priceRange: '1000-5000' },
    resultCount: 0
  });
}

function simulateServerError() {
  if (Math.random() > 0.85) { // 15% chance of server errors
    const errors = [
      { level: 'ERROR', message: 'Database connection pool exhausted', code: 'DB_POOL_EXHAUSTED' },
      { level: 'ERROR', message: 'External payment API down', code: 'PAYMENT_API_DOWN' },
      { level: 'CRITICAL', message: 'High memory usage detected', code: 'MEMORY_CRITICAL' },
      { level: 'ERROR', message: 'Redis cache miss - performance degraded', code: 'CACHE_MISS' }
    ];
    
    const error = errors[Math.floor(Math.random() * errors.length)];
    createLog(error.level, error.message, {
      errorCode: error.code,
      systemLoad: `${Math.floor(Math.random() * 40) + 60}%`,
      activeConnections: Math.floor(Math.random() * 500) + 100
    });
  }
}

function simulateSlowResponse() {
  if (Math.random() > 0.8) { // 20% chance of slow responses
    createLog('WARN', 'Slow response time detected', {
      endpoint: `GET /events/${Math.floor(Math.random() * 5) + 1}`,
      responseTime: Math.floor(Math.random() * 3000) + 2000,
      threshold: '1000ms',
      cause: 'Database query optimization needed'
    });
  }
}

function simulateAPICall() {
  const apis = ['recommendation', 'notification', 'analytics', 'geo-location'];
  const api = apis[Math.floor(Math.random() * apis.length)];
  
  createLog('INFO', `${api} API called`, {
    endpoint: `GET /api/${api}`,
    responseTime: Math.floor(Math.random() * 200) + 25,
    cacheHit: Math.random() > 0.3
  });
}

function simulateUserLogin() {
  const success = Math.random() > 0.2; // 80% success rate
  
  if (success) {
    createLog('INFO', 'User login successful', {
      endpoint: 'POST /auth/login',
      loginMethod: ['email', 'phone', 'social'][Math.floor(Math.random() * 3)],
      sessionCreated: true
    });
  } else {
    createLog('WARN', 'Login attempt failed', {
      endpoint: 'POST /auth/login',
      reason: ['invalid_credentials', 'account_locked', 'too_many_attempts'][Math.floor(Math.random() * 3)]
    });
  }
}

function simulateSessionTimeout() {
  if (Math.random() > 0.9) { // 10% chance
    createLog('WARN', 'User session expired', {
      endpoint: 'GET /auth/check',
      sessionDuration: `${Math.floor(Math.random() * 120) + 30}m`,
      redirectToLogin: true
    });
  }
}

// Auto-generate realistic user activity logs every 50-500 milliseconds (ULTRA FAST!)
function simulateUserActivity() {
  const activities = [
    () => simulateHomePage(),
    () => simulateEventBrowse(),
    () => simulateAddToCart(),
    () => simulatePaymentAttempt(),
    () => simulateSearchFailure(),
    () => simulateServerError(),
    () => simulateSlowResponse(),
    () => simulateAPICall(),
    () => simulateUserLogin(),
    () => simulateSessionTimeout()
  ];
  
  // Execute multiple activities simultaneously for high volume
  const activityCount = Math.floor(Math.random() * 3) + 1; // 1-3 activities at once
  
  for (let i = 0; i < activityCount; i++) {
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    setTimeout(() => randomActivity(), Math.random() * 100); // Spread within 100ms
  }
  
  // Schedule next batch - MUCH FASTER (50-500ms)
  setTimeout(simulateUserActivity, Math.random() * 450 + 50); // 50-500 milliseconds
}

// Add burst mode for extreme log volume
function burstMode() {
  console.log('🔥 BURST MODE ACTIVATED - Generating 100 logs rapidly!');
  
  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      const activities = [
        () => simulateHomePage(),
        () => simulateEventBrowse(),
        () => simulateAddToCart(),
        () => simulatePaymentAttempt(),
        () => simulateAPICall(),
        () => simulateUserLogin()
      ];
      
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      randomActivity();
    }, i * 10); // One log every 10ms for 1 second
  }
}

// API Routes (these now also create logs that get sent to backend)
app.get('/', (req, res) => {
  createLog('INFO', 'Homepage accessed via API', {
    endpoint: 'GET /',
    featuredEvents: mockEvents.length,
    responseTime: Math.floor(Math.random() * 200) + 50,
    userAgent: req.get('User-Agent') || 'Unknown'
  });
  
  res.json({
    message: '🎭 TicketBooking Platform - Like BookMyShow',
    featuredEvents: mockEvents,
    totalEvents: mockEvents.length
  });
});

app.get('/events', (req, res) => {
  const city = req.query.city;
  createLog('INFO', 'Events list requested via API', {
    endpoint: 'GET /events',
    city: city || 'all',
    eventCount: mockEvents.length,
    responseTime: Math.floor(Math.random() * 300) + 50
  });
  
  res.json({ events: mockEvents, city: city || 'all' });
});

app.get('/events/:id', (req, res) => {
  const eventId = parseInt(req.params.id);
  const event = mockEvents.find(e => e.id === eventId);
  
  if (event) {
    createLog('INFO', 'Event details viewed via API', {
      endpoint: `GET /events/${eventId}`,
      eventName: event.name,
      price: event.price,
      available: event.available,
      responseTime: Math.floor(Math.random() * 200) + 30
    });
    res.json(event);
  } else {
    createLog('WARN', 'Event not found via API', {
      endpoint: `GET /events/${eventId}`,
      requestedId: eventId,
      errorCode: 'EVENT_NOT_FOUND'
    });
    res.status(404).json({ error: 'Event not found' });
  }
});

app.post('/cart/add', (req, res) => {
  const { eventId, quantity } = req.body;
  const event = mockEvents.find(e => e.id === eventId);
  
  if (!event) {
    createLog('ERROR', 'Add to cart failed - event not found via API', {
      endpoint: 'POST /cart/add',
      eventId,
      errorCode: 'EVENT_NOT_FOUND',
      requestBody: req.body
    });
    return res.status(404).json({ error: 'Event not found' });
  }
  
  if (event.available < quantity) {
    createLog('ERROR', 'Add to cart failed - insufficient tickets via API', {
      endpoint: 'POST /cart/add',
      eventId,
      requestedQuantity: quantity,
      availableTickets: event.available,
      errorCode: 'INSUFFICIENT_INVENTORY'
    });
    return res.status(400).json({ error: 'Not enough tickets available' });
  }
  
  createLog('INFO', 'Tickets added to cart via API', {
    endpoint: 'POST /cart/add',
    eventId,
    eventName: event.name,
    quantity,
    totalAmount: event.price * quantity,
    responseTime: Math.floor(Math.random() * 150) + 25
  });
  
  res.json({ message: 'Added to cart', totalAmount: event.price * quantity });
});

// Graceful shutdown - send remaining logs
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await sendLogBatch(); // Send any remaining logs
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await sendLogBatch(); // Send any remaining logs
  process.exit(0);
});

// Start server and begin auto-simulation
app.listen(PORT, () => {
  createLog('INFO', 'TicketBooking platform started', { 
    port: PORT,
    environment: 'development',
    eventsAvailable: mockEvents.length,
    backendURL: LOG_BACKEND_URL
  });
  
  console.log(`
  ╔════════════════════════════════════════════════════════════════╗
  ║       🎭 TICKETBOOKING PLATFORM (Now with Backend Logs!)      ║
  ║                  ⚡ ULTRA-HIGH VOLUME LOGS ⚡                  ║
  ║                                                                ║
  ║  🌐 App Server: http://localhost:${PORT}                           ║
  ║  📊 Log Backend: ${LOG_BACKEND_URL}              ║
  ║  🚀 Batch Size: ${BATCH_SIZE} logs every ${BATCH_TIMEOUT/1000}s                        ║
  ║  💥 Expected: 2,000-20,000+ logs per minute → MongoDB         ║
  ║                                                                ║
  ║  Available endpoints:                                          ║
  ║  • GET  /                    - Homepage                        ║
  ║  • GET  /events              - Browse events                   ║
  ║  • GET  /events/:id          - Event details                  ║
  ║  • POST /cart/add            - Add to cart                     ║
  ║                                                                ║
  ║  🔗 Now sending ALL logs to MongoDB backend!                   ║
  ║  • Batch processing for performance                            ║
  ║  • Fallback to individual sends if batch fails                ║
  ║  • Real API calls also generate logs                          ║
  ║  • Automatic + Manual log generation                          ║
  ╚════════════════════════════════════════════════════════════════╝
  `);
  
  // Start automatic log generation IMMEDIATELY
  console.log('🚀 Starting ULTRA-FAST automatic user activity simulation...');
  console.log('📡 All logs will be sent to MongoDB via backend API\n');
  setTimeout(simulateUserActivity, 100); // Start after 100ms
  
  // Trigger burst mode every 30 seconds
  setInterval(burstMode, 30000);
  
  // Also flush any remaining logs every 5 seconds
  setInterval(() => {
    if (logBatch.length > 0) {
      sendLogBatch();
    }
  }, 5000);
});
