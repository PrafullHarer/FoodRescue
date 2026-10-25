require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Validate critical secrets in production
if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ [SECURITY CRITICAL] JWT_SECRET must be set and at least 32 characters long in production.');
  }
  if (!process.env.DATABASE_URL) {
    console.error('❌ [SECURITY CRITICAL] DATABASE_URL is missing.');
  }
}

// Allowed CORS origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,

  corsOrigins: allowedOrigins,

  db: {
    connectionString: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-fallback-secret-key-change-in-production-min32',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  fcm: {
    serverKey: process.env.FCM_SERVER_KEY,
  },

  maps: {
    apiKey: process.env.MAPS_API_KEY,
  },

  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  },
};
