const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pool settings for high performance
      maxPoolSize: 50, // Maximum 50 concurrent connections
      minPoolSize: 10, // Keep 10 connections always ready
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
      socketTimeoutMS: 45000, // Close sockets after 45s
      
      // Write concern for better performance
      w: 1, // Wait for acknowledgment from 1 server
      journal: false, // Don't wait for journal (faster, slightly less safe)
      
      // Additional optimizations
      maxIdleTimeMS: 10000, // Close idle connections after 10s
      compressors: 'zlib', // Compress data
    });
    
    console.log('✅ MongoDB Connected Successfully with optimized settings!');
    console.log(`📊 Connection Pool: Min=${mongoose.connection.maxPoolSize}, Max=${mongoose.connection.maxPoolSize}`);
    
    // Monitor connection pool
    mongoose.connection.on('connected', () => {
      console.log('🔗 MongoDB connected');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;