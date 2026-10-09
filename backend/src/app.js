const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const sanitizeInput = require('./middleware/sanitize');

// Import route modules
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const donationRoutes = require('./modules/donations/donation.routes');
const matchingRoutes = require('./modules/matching/matching.routes');
const volunteerRoutes = require('./modules/volunteers/volunteer.routes');
const deliveryRoutes = require('./modules/deliveries/delivery.routes');
const qrcodeRoutes = require('./modules/qrcodes/qrcode.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const reviewRoutes = require('./modules/reviews/review.routes');

// Import background jobs
const { startExpiryChecker } = require('./jobs/expiry-checker.cron');

const app = express();

// Disable fingerprinting header
app.disable('x-powered-by');

// ─── 1. Security Headers (Helmet) ────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'deny' },
    hsts: config.isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// ─── 2. CORS Whitelisting ────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, server-to-server, curl, Postman in dev)
    if (!origin) return callback(null, true);

    if (config.corsOrigins.includes(origin) || !config.isProduction) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not permitted by CORS policy.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// ─── 3. Request Logging & Body Parsers ───────────────────────
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── 4. Input Sanitization & XSS Defense ─────────────────────
app.use(sanitizeInput);

// ─── 5. Rate Limiting ────────────────────────────────────────
// Strict limiter for authentication endpoints (prevent brute-force & credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isProduction ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isProduction ? 1000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', authLimiter);

// ─── 6. Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'FoodRescue API is running securely.',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ─── 7. API Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/qr-codes', qrcodeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

// ─── 8. 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ─── 9. Global Error Handler ─────────────────────────────────
app.use(errorHandler);

// ─── 10. Start Server ────────────────────────────────────────
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`\n🛡️ FoodRescue Secure API running on port ${PORT}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);

  // Start background jobs
  startExpiryChecker();
});

// ─── Process Error Handlers ──────────────────────────────────
process.on('uncaughtException', (err) => {
  if (err?.code === 'ECONNRESET' || err?.code === 'EPIPE') {
    console.warn('⚠️ [PROCESS] Transient network socket error caught:', err.message);
  } else {
    console.error('❌ [PROCESS] Uncaught Exception:', err.message || err);
  }
});

process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ [PROCESS] Unhandled Promise Rejection:', reason?.message || reason);
});

module.exports = app;
