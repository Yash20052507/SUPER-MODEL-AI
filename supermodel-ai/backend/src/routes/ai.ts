import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { aiRateLimit } from '../middleware/rateLimiter';
import { AuthenticatedRequest, APIResponse } from '../types';

const router = Router();

// GET /api/ai - Show AI capabilities
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'SuperModel AI Controller is operational',
      capabilities: [
        'Dynamic skill pack loading',
        'Multi-model AI support (OpenAI, Anthropic, XAI)',
        'Intelligent resource management',
        'Session-based context preservation',
        'Cost optimization through targeted loading'
      ],
      endpoints: [
        'POST /api/ai/process - Process AI request with skill pack loading',
        'GET /api/ai/session/:id - Get session information',
        'POST /api/ai/session/:id/context - Update session context',
        'GET /api/ai/skill-packs - List loaded skill packs',
        'GET /api/ai/stats - Get AI controller statistics'
      ],
      demoRequests: [
        {
          description: 'Frontend Development Request',
          example: {
            message: 'Create a React component for a user profile card',
            skillPackHints: ['frontend']
          }
        },
        {
          description: 'Backend Development Request',
          example: {
            message: 'Design a RESTful API for user authentication',
            skillPackHints: ['backend']
          }
        },
        {
          description: 'AI/ML Request',
          example: {
            message: 'Create a neural network for image classification',
            skillPackHints: ['ai-ml']
          }
        }
      ]
    },
  } as APIResponse);
}));

// POST /api/ai/process - Process AI request
router.post('/process', aiRateLimit, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { message, sessionId, skillPackHints, options } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Message is required',
      },
    } as APIResponse);
  }

  // Mock AI processing response (in production, this would use the AIController)
  const response = {
    sessionId: sessionId || `session_${Date.now()}`,
    response: generateMockAIResponse(message, skillPackHints),
    skillPacksUsed: determineSkillPacks(message, skillPackHints),
    metadata: {
      processingTime: Math.random() * 1000 + 500, // 500-1500ms
      tokens: Math.floor(Math.random() * 200) + 50, // 50-250 tokens
      cost: Math.random() * 0.01 + 0.001, // $0.001-$0.011
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
    },
    suggestions: [
      'Try asking for more specific requirements',
      'Consider mentioning the target framework or technology',
      'Ask for examples or use cases'
    ]
  };

  res.json({
    success: true,
    data: response,
  } as APIResponse);
}));

// GET /api/ai/session/:id - Get session information
router.get('/session/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Mock session data
  const sessionData = {
    id,
    status: 'active',
    createdAt: new Date(),
    lastActivity: new Date(),
    messageCount: Math.floor(Math.random() * 10) + 1,
    skillPacksLoaded: ['frontend', 'backend'],
    totalTokens: Math.floor(Math.random() * 1000) + 100,
    totalCost: Math.random() * 0.1 + 0.01,
  };

  res.json({
    success: true,
    data: sessionData,
  } as APIResponse);
}));

// GET /api/ai/skill-packs - List available skill packs
router.get('/skill-packs', asyncHandler(async (req: Request, res: Response) => {
  const skillPacks = [
    {
      id: 'frontend',
      name: 'Frontend Development',
      description: 'React, Vue, Angular, HTML, CSS, JavaScript',
      category: 'Development',
      isLoaded: true,
      usageCount: 156,
      avgResponseTime: 1200,
    },
    {
      id: 'backend',
      name: 'Backend Development',
      description: 'Node.js, Express, APIs, databases',
      category: 'Development',
      isLoaded: true,
      usageCount: 142,
      avgResponseTime: 1350,
    },
    {
      id: 'ai-ml',
      name: 'AI & Machine Learning',
      description: 'Python, TensorFlow, PyTorch, data science',
      category: 'AI/ML',
      isLoaded: false,
      usageCount: 89,
      avgResponseTime: 1800,
    }
  ];

  res.json({
    success: true,
    data: {
      skillPacks,
      totalLoaded: skillPacks.filter(sp => sp.isLoaded).length,
      totalAvailable: skillPacks.length,
    },
  } as APIResponse);
}));

// GET /api/ai/stats - Get AI controller statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = {
    activeSessions: Math.floor(Math.random() * 50) + 10,
    totalRequests: Math.floor(Math.random() * 10000) + 1000,
    avgResponseTime: Math.floor(Math.random() * 500) + 800,
    skillPacksLoaded: 3,
    totalSkillPacks: 5,
    costSavings: {
      percentage: Math.floor(Math.random() * 20) + 70, // 70-90%
      totalSaved: Math.random() * 100 + 50, // $50-$150
    },
    performance: {
      successRate: Math.random() * 10 + 90, // 90-100%
      errorRate: Math.random() * 5, // 0-5%
      avgConfidence: Math.random() * 15 + 85, // 85-100%
    }
  };

  res.json({
    success: true,
    data: stats,
  } as APIResponse);
}));

// Helper functions
function generateMockAIResponse(message: string, skillPackHints?: string[]): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('react') || lowerMessage.includes('component') || lowerMessage.includes('frontend')) {
    return `Here's a React component for your request:

\`\`\`jsx
import React from 'react';
import './UserProfileCard.css';

const UserProfileCard = ({ user }) => {
  return (
    <div className="profile-card">
      <div className="profile-header">
        <img 
          src={user.avatar || '/default-avatar.png'} 
          alt={user.name}
          className="profile-avatar"
        />
        <h2 className="profile-name">{user.name}</h2>
        <p className="profile-title">{user.title}</p>
      </div>
      
      <div className="profile-body">
        <div className="profile-stats">
          <div className="stat">
            <span className="stat-value">{user.projects || 0}</span>
            <span className="stat-label">Projects</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.followers || 0}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>
        
        <p className="profile-bio">{user.bio}</p>
        
        <button className="profile-action-btn">
          Follow
        </button>
      </div>
    </div>
  );
};

export default UserProfileCard;
\`\`\`

This component uses modern React patterns and includes proper styling structure. The design is responsive and follows current UI/UX best practices.`;
  }
  
  if (lowerMessage.includes('api') || lowerMessage.includes('backend') || lowerMessage.includes('express')) {
    return `Here's a RESTful API design for user authentication:

\`\`\`javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// POST /auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name
    });
    
    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
\`\`\`

This API follows REST principles with proper validation, security, and error handling.`;
  }
  
  if (lowerMessage.includes('neural') || lowerMessage.includes('ai') || lowerMessage.includes('machine learning')) {
    return `Here's a neural network for image classification using TensorFlow:

\`\`\`python
import tensorflow as tf
from tensorflow.keras import layers, models
import numpy as np

def create_image_classifier(num_classes=10, input_shape=(224, 224, 3)):
    """
    Create a CNN for image classification
    """
    model = models.Sequential([
        # Convolutional layers
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=input_shape),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        
        # Dense layers
        layers.Flatten(),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(num_classes, activation='softmax')
    ])
    
    # Compile model
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

# Create and train the model
model = create_image_classifier(num_classes=10)

# Model summary
model.summary()

# Training (example)
# model.fit(train_images, train_labels, 
#          validation_data=(test_images, test_labels),
#          epochs=10, batch_size=32)
\`\`\`

This CNN architecture is suitable for image classification tasks with good performance on datasets like CIFAR-10.`;
  }
  
  return `Thank you for your request! I've analyzed your message and determined the relevant skill packs to help provide the best response. 

Your request: "${message}"

Based on the context, I can help you with:
- Code implementation and best practices
- Architecture design and patterns  
- Performance optimization
- Security considerations
- Testing strategies

Would you like me to provide more specific guidance or examples for your use case?`;
}

function determineSkillPacks(message: string, hints?: string[]): string[] {
  const skillPacks: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  if (hints) {
    skillPacks.push(...hints);
  }
  
  if (lowerMessage.includes('react') || lowerMessage.includes('vue') || lowerMessage.includes('angular') || 
      lowerMessage.includes('html') || lowerMessage.includes('css') || lowerMessage.includes('frontend')) {
    if (!skillPacks.includes('frontend')) skillPacks.push('frontend');
  }
  
  if (lowerMessage.includes('api') || lowerMessage.includes('express') || lowerMessage.includes('node') || 
      lowerMessage.includes('backend') || lowerMessage.includes('database')) {
    if (!skillPacks.includes('backend')) skillPacks.push('backend');
  }
  
  if (lowerMessage.includes('neural') || lowerMessage.includes('tensorflow') || lowerMessage.includes('pytorch') || 
      lowerMessage.includes('machine learning') || lowerMessage.includes('ai')) {
    if (!skillPacks.includes('ai-ml')) skillPacks.push('ai-ml');
  }
  
  return skillPacks.length > 0 ? skillPacks : ['general'];
}

export default router;