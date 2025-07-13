import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, generateRefreshToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { authRateLimit } from '../middleware/rateLimiter';
import { APIResponse } from '../types';

const router = Router();

// Mock user database (in production, this would be from MongoDB/PostgreSQL)
const mockUsers = new Map([
  ['demo@supermodel.ai', {
    id: 'user_demo',
    email: 'demo@supermodel.ai',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewvP5.6lkj5Z.gvK', // password: "demo123"
    firstName: 'Demo',
    lastName: 'User',
    role: 'user',
    createdAt: new Date(),
  }],
  ['admin@supermodel.ai', {
    id: 'user_admin',
    email: 'admin@supermodel.ai',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewvP5.6lkj5Z.gvK', // password: "admin123"
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    createdAt: new Date(),
  }]
]);

// POST /api/auth/login
router.post('/login', authRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    } as APIResponse);
  }

  const user = mockUsers.get(email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    } as APIResponse);
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    } as APIResponse);
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
      refreshToken,
    },
  } as APIResponse);
}));

// POST /api/auth/register
router.post('/register', authRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'All fields are required',
      },
    } as APIResponse);
  }

  if (mockUsers.has(email.toLowerCase())) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'USER_EXISTS',
        message: 'User with this email already exists',
      },
    } as APIResponse);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = {
    id: `user_${Date.now()}`,
    email: email.toLowerCase(),
    password: hashedPassword,
    firstName,
    lastName,
    role: 'user' as const,
    createdAt: new Date(),
  };

  mockUsers.set(email.toLowerCase(), newUser);

  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
      },
      token,
    },
  } as APIResponse);
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  // In a real implementation, you would invalidate the token
  res.json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  } as APIResponse);
}));

// GET /api/auth/me
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'Authentication endpoint is working',
      endpoints: [
        'POST /api/auth/login - Login with demo@supermodel.ai / demo123',
        'POST /api/auth/register - Register new user',
        'POST /api/auth/logout - Logout user',
      ],
      demoCredentials: {
        user: { email: 'demo@supermodel.ai', password: 'demo123' },
        admin: { email: 'admin@supermodel.ai', password: 'admin123' },
      },
    },
  } as APIResponse);
}));

export default router;