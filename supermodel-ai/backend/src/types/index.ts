import { Request, Response } from 'express';
import { Document } from 'mongoose';

// Extended Request interface with user information
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// User types
export interface User extends Document {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'enterprise';
  skillPacks: string[];
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
    expiresAt: Date;
  };
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Skill Pack types
export interface SkillPack extends Document {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  author: string;
  authorId: string;
  isPublic: boolean;
  isVerified: boolean;
  rating: number;
  downloads: number;
  size: number;
  content: SkillPackContent;
  metadata: SkillPackMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillPackContent {
  instructions: string;
  examples: SkillPackExample[];
  templates: SkillPackTemplate[];
  knowledge: SkillPackKnowledge[];
  dependencies: string[];
}

export interface SkillPackExample {
  title: string;
  description: string;
  input: string;
  output: string;
  code?: string;
}

export interface SkillPackTemplate {
  name: string;
  description: string;
  template: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

export interface SkillPackKnowledge {
  type: 'text' | 'code' | 'documentation' | 'api';
  title: string;
  content: string;
  source?: string;
  language?: string;
}

export interface SkillPackMetadata {
  lastUsed: Date;
  usageCount: number;
  performance: {
    avgResponseTime: number;
    successRate: number;
    errorRate: number;
  };
  compatibility: {
    modelTypes: string[];
    frameworks: string[];
    languages: string[];
  };
}

// AI Session types
export interface AISession extends Document {
  id: string;
  userId: string;
  title: string;
  status: 'active' | 'completed' | 'error';
  loadedSkillPacks: string[];
  context: SessionContext;
  messages: SessionMessage[];
  metadata: SessionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionContext {
  currentTask: string;
  activeSkillPacks: string[];
  userPreferences: Record<string, any>;
  sessionVariables: Record<string, any>;
  cachedResults: Record<string, any>;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    skillPacksUsed: string[];
    processingTime: number;
    tokens: number;
    cost: number;
  };
}

export interface SessionMetadata {
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  skillPacksUsed: string[];
  performance: {
    successfulRequests: number;
    failedRequests: number;
    totalRequests: number;
  };
}

// AI Controller types
export interface AIProcessRequest {
  sessionId?: string;
  message: string;
  context?: Record<string, any>;
  skillPackHints?: string[];
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}

export interface AIProcessResponse {
  sessionId: string;
  response: string;
  skillPacksUsed: string[];
  metadata: {
    processingTime: number;
    tokens: number;
    cost: number;
    confidence: number;
  };
  suggestions?: string[];
}

// Vector Store types
export interface VectorEmbedding {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  content: string;
  skillPackId: string;
  type: 'instruction' | 'example' | 'template' | 'knowledge';
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  content: string;
  skillPackId: string;
}

// Marketplace types
export interface MarketplaceItem {
  skillPack: SkillPack;
  pricing: {
    type: 'free' | 'one-time' | 'subscription';
    price: number;
    currency: string;
  };
  reviews: Review[];
  stats: {
    totalDownloads: number;
    avgRating: number;
    totalReviews: number;
  };
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

// Analytics types
export interface AnalyticsData {
  userId: string;
  event: string;
  timestamp: Date;
  data: Record<string, any>;
  sessionId?: string;
}

// Error types
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

// Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Cache types
export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
}

// Background Job types
export interface BackgroundJob {
  id: string;
  type: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// WebSocket types
export interface SocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
}

// Configuration types
export interface AppConfig {
  server: {
    port: number;
    host: string;
    environment: string;
  };
  database: {
    mongodb: string;
    postgresql: string;
    redis: string;
  };
  ai: {
    openai: {
      apiKey: string;
      model: string;
    };
    anthropic: {
      apiKey: string;
      model: string;
    };
    xai: {
      apiKey: string;
      model: string;
    };
  };
  vectorStore: {
    pinecone: {
      apiKey: string;
      environment: string;
      indexName: string;
    };
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  features: {
    skillPackMarketplace: boolean;
    realTimeUpdates: boolean;
    backgroundJobs: boolean;
    analytics: boolean;
  };
}