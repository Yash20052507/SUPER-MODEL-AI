import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { connectDatabases } from './config/database';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';

// Import routes
import authRoutes from './routes/auth';
import skillPackRoutes from './routes/skillPacks';
import aiRoutes from './routes/ai';
import marketplaceRoutes from './routes/marketplace';
import userRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';

// Import services
import { SkillPackService } from './services/SkillPackService';
import { AIController } from './services/AIController';
import { VectorStoreService } from './services/VectorStoreService';
import { CacheService } from './services/CacheService';
import { BackgroundJobService } from './services/BackgroundJobService';
import { SocketService } from './services/SocketService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression and logging
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Rate limiting
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/skill-packs', authMiddleware, skillPackRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/marketplace', authMiddleware, marketplaceRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing SuperModel AI services...');
    
    // Connect to databases
    await connectDatabases();
    
    // Initialize core services
    const cacheService = new CacheService();
    const vectorStoreService = new VectorStoreService();
    const skillPackService = new SkillPackService(vectorStoreService, cacheService);
    const aiController = new AIController(skillPackService, vectorStoreService, cacheService);
    const socketService = new SocketService(io);
    
    // Initialize background job service
    if (process.env.ENABLE_BACKGROUND_JOBS === 'true') {
      const backgroundJobService = new BackgroundJobService();
      await backgroundJobService.initialize();
    }
    
    // Make services globally available
    app.set('services', {
      skillPackService,
      aiController,
      vectorStoreService,
      cacheService,
      socketService,
    });
    
    logger.info('All services initialized successfully');
    
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      logger.info(`SuperModel AI Backend running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;