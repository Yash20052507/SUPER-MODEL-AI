import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { APIResponse } from '../types';

const router = Router();

// GET /api/users - List users (admin only)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'User Management API',
      endpoints: [
        'GET /api/users/profile - Get current user profile',
        'PUT /api/users/profile - Update user profile',
        'GET /api/users/stats - Get user statistics',
      ]
    },
  } as APIResponse);
}));

// GET /api/users/profile - Get current user profile
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  const mockProfile = {
    id: 'user_demo',
    email: 'demo@supermodel.ai',
    firstName: 'Demo',
    lastName: 'User',
    role: 'user',
    subscription: {
      plan: 'free',
      status: 'active',
      expiresAt: null,
    },
    preferences: {
      theme: 'light',
      notifications: true,
      language: 'en',
    },
    skillPacks: ['frontend', 'backend'],
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date(),
  };

  res.json({
    success: true,
    data: mockProfile,
  } as APIResponse);
}));

// GET /api/users/stats - Get user statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = {
    totalSessions: Math.floor(Math.random() * 50) + 10,
    totalRequests: Math.floor(Math.random() * 500) + 100,
    skillPacksUsed: 3,
    avgResponseTime: Math.floor(Math.random() * 1000) + 800,
    costSavings: Math.random() * 50 + 20,
    favoriteSkillPacks: ['frontend', 'backend'],
    recentActivity: [
      { action: 'Used Frontend skill pack', timestamp: new Date() },
      { action: 'Created new session', timestamp: new Date(Date.now() - 3600000) },
    ]
  };

  res.json({
    success: true,
    data: stats,
  } as APIResponse);
}));

export default router;