const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  // Database
  DB_HOST: process.env.DB_HOST || '202.71.157.170',
  DB_PORT: parseInt(process.env.DB_PORT) || 3308,
  DB_NAME: process.env.DB_NAME || 'aws_billing_system',
  DB_USER: process.env.DB_USER || 'admin',
  DB_PASSWORD: process.env.DB_PASSWORD || 'admin@9955',

  // Server
  PORT: parseInt(process.env.PORT) || 5002,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-super-secret-session-key',
  SESSION_NAME: process.env.SESSION_NAME || 'aws_billing_session',

  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3002'],

  // Upload
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 16777216, // 16MB

  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,

  // AWS
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,

  // Application
  APP_URL: process.env.APP_URL || 'http://localhost:3002'
};