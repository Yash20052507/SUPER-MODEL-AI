import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import skillPackRoutes from './routes/skillPacks';
import aiRoutes from './routes/ai';
import marketplaceRoutes from './routes/marketplace';
import userRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';

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
app.use(morgan('combined'));

// Serve static files
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    message: 'SuperModel AI Backend is running!'
  });
});

// API Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SuperModel AI Backend',
    version: '1.0.0',
    description: 'A modular, self-evolving AI system with dynamic skill pack loading',
    endpoints: {
      health: 'GET /health',
      auth: {
        base: '/api/auth',
        endpoints: [
          'GET /api/auth/me - Authentication info and demo credentials',
          'POST /api/auth/login - Login (demo@supermodel.ai / demo123)',
          'POST /api/auth/register - Register new user',
          'POST /api/auth/logout - Logout user'
        ]
      },
      ai: {
        base: '/api/ai',
        endpoints: [
          'GET /api/ai - AI capabilities and demo requests',
          'POST /api/ai/process - Process AI request with skill pack loading',
          'GET /api/ai/session/:id - Get session information',
          'GET /api/ai/skill-packs - List loaded skill packs',
          'GET /api/ai/stats - AI controller statistics'
        ]
      },
      skillPacks: {
        base: '/api/skill-packs',
        endpoints: [
          'GET /api/skill-packs - List all skill packs',
          'GET /api/skill-packs/:id - Get specific skill pack',
          'POST /api/skill-packs - Create new skill pack',
          'GET /api/skill-packs/meta/stats - Skill pack statistics'
        ]
      },
      marketplace: {
        base: '/api/marketplace',
        endpoints: [
          'GET /api/marketplace - Marketplace overview',
          'GET /api/marketplace/packs - Browse marketplace',
          'POST /api/marketplace/packs/:id/install - Install skill pack'
        ]
      },
      users: {
        base: '/api/users',
        endpoints: [
          'GET /api/users/profile - User profile',
          'GET /api/users/stats - User statistics'
        ]
      },
      analytics: {
        base: '/api/analytics',
        endpoints: [
          'GET /api/analytics/overview - System overview',
          'GET /api/analytics/performance - Performance metrics'
        ]
      }
    },
    demoCredentials: {
      user: { email: 'demo@supermodel.ai', password: 'demo123' },
      admin: { email: 'admin@supermodel.ai', password: 'admin123' }
    },
    features: [
      'Dynamic skill pack loading',
      'Multi-model AI support',
      'Intelligent resource management',
      'Session-based context preservation',
      'Cost optimization through targeted loading',
      'Real-time WebSocket communication',
      'Comprehensive analytics and monitoring'
    ]
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/skill-packs', skillPackRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
      availableRoutes: [
        'GET /',
        'GET /health',
        'GET /api/auth/me',
        'GET /api/ai',
        'GET /api/skill-packs',
        'GET /api/marketplace',
        'GET /api/users',
        'GET /api/analytics'
      ]
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error occurred:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// Initialize WebSocket
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.emit('welcome', {
    message: 'Connected to SuperModel AI',
    features: ['Real-time AI processing', 'Live skill pack updates', 'Session synchronization']
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 SuperModel AI Backend running on port ${PORT}`);
  console.log(`\n🌐 DEMO PREVIEW:`);
  console.log(`   Interactive Demo: http://localhost:${PORT}/`);
  console.log(`   API Documentation: http://localhost:${PORT}/`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`\n🤖 CORE ENDPOINTS:`);
  console.log(`   AI Controller: http://localhost:${PORT}/api/ai`);
  console.log(`   Skill Packs: http://localhost:${PORT}/api/skill-packs`);
  console.log(`   Marketplace: http://localhost:${PORT}/api/marketplace`);
  console.log(`   Users: http://localhost:${PORT}/api/users`);
  console.log(`   Analytics: http://localhost:${PORT}/api/analytics`);
  console.log(`   Authentication: http://localhost:${PORT}/api/auth/me`);
  console.log(`\n🎯 Ready to demonstrate SuperModel AI capabilities!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;