import mongoose from 'mongoose';
import { createConnection } from 'typeorm';
import { createClient } from 'redis';
import { logger } from './logger';

// MongoDB connection
export async function connectMongoDB(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/supermodel_ai';
    
    await mongoose.connect(mongoUri);
    
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

// PostgreSQL connection
export async function connectPostgreSQL(): Promise<void> {
  try {
    const connection = await createConnection({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/../models/*.ts'],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    logger.info('PostgreSQL connected successfully');
  } catch (error) {
    logger.error('PostgreSQL connection failed:', error);
    throw error;
  }
}

// Redis connection
export async function connectRedis(): Promise<void> {
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
    });
    
    await redisClient.connect();
    
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

// Connect all databases
export async function connectDatabases(): Promise<void> {
  await Promise.all([
    connectMongoDB(),
    connectPostgreSQL(),
    connectRedis(),
  ]);
  
  logger.info('All databases connected successfully');
}

// Graceful shutdown
export async function closeDatabases(): Promise<void> {
  try {
    await mongoose.connection.close();
    // Note: TypeORM and Redis connections would be closed here as well
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
}