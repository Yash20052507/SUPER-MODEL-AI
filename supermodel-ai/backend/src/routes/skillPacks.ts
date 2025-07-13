import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { skillPackRateLimit } from '../middleware/rateLimiter';
import { APIResponse } from '../types';

const router = Router();

// Mock skill packs database
const mockSkillPacks = [
  {
    id: 'frontend',
    name: 'Frontend Development',
    description: 'React, Vue, Angular, HTML, CSS, JavaScript development expertise',
    category: 'Development',
    tags: ['react', 'vue', 'angular', 'html', 'css', 'javascript', 'typescript'],
    version: '1.0.0',
    author: 'SuperModel AI Team',
    authorId: 'system',
    isPublic: true,
    isVerified: true,
    rating: 4.8,
    downloads: 1250,
    size: 2048,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    content: {
      instructions: 'Expert in modern frontend development with React, Vue, Angular, and web technologies.',
      examples: [
        {
          title: 'React Component',
          description: 'Functional component with hooks',
          input: 'Create a button component',
          output: 'const Button = ({ onClick, children }) => <button onClick={onClick}>{children}</button>',
        },
        {
          title: 'CSS Grid Layout',
          description: 'Responsive grid layout',
          input: 'Create a card grid',
          output: '.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }',
        },
      ],
      templates: [
        {
          name: 'React Component Template',
          description: 'Basic React functional component',
          template: 'const {{ComponentName}} = (props) => {\n  return (\n    <div>\n      {{content}}\n    </div>\n  );\n};\n\nexport default {{ComponentName}};',
          variables: [
            { name: 'ComponentName', type: 'string', description: 'Component name', required: true },
            { name: 'content', type: 'string', description: 'Component content', required: false, default: 'Hello World' },
          ],
        },
      ],
      knowledge: [
        {
          type: 'documentation',
          title: 'React Best Practices',
          content: 'Use functional components, hooks, and proper state management.',
        },
        {
          type: 'documentation',
          title: 'Modern CSS',
          content: 'Utilize Flexbox, Grid, and CSS custom properties for modern layouts.',
        },
      ],
      dependencies: ['react', 'typescript'],
    },
    metadata: {
      lastUsed: new Date(),
      usageCount: 245,
      performance: {
        avgResponseTime: 1200,
        successRate: 97.5,
        errorRate: 2.5,
      },
      compatibility: {
        modelTypes: ['openai', 'anthropic'],
        frameworks: ['react', 'vue', 'angular'],
        languages: ['javascript', 'typescript'],
      },
    },
  },
  {
    id: 'backend',
    name: 'Backend Development',
    description: 'Node.js, Express, APIs, databases, and server-side development',
    category: 'Development',
    tags: ['nodejs', 'express', 'api', 'database', 'mongodb', 'postgresql'],
    version: '1.0.0',
    author: 'SuperModel AI Team',
    authorId: 'system',
    isPublic: true,
    isVerified: true,
    rating: 4.7,
    downloads: 1150,
    size: 2560,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    content: {
      instructions: 'Expert in backend development with Node.js, Express, databases, and API design.',
      examples: [
        {
          title: 'Express Route',
          description: 'RESTful API endpoint',
          input: 'Create a user API endpoint',
          output: 'app.get("/api/users", async (req, res) => {\n  const users = await User.find();\n  res.json(users);\n});',
        },
      ],
      templates: [],
      knowledge: [
        {
          type: 'documentation',
          title: 'RESTful API Design',
          content: 'Follow REST principles with proper HTTP methods and status codes.',
        },
      ],
      dependencies: ['express', 'mongoose'],
    },
    metadata: {
      lastUsed: new Date(),
      usageCount: 198,
      performance: {
        avgResponseTime: 1350,
        successRate: 96.2,
        errorRate: 3.8,
      },
      compatibility: {
        modelTypes: ['openai', 'anthropic'],
        frameworks: ['express', 'fastify'],
        languages: ['javascript', 'typescript'],
      },
    },
  },
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    description: 'Python, TensorFlow, PyTorch, data science, and ML model development',
    category: 'AI/ML',
    tags: ['python', 'tensorflow', 'pytorch', 'machine-learning', 'data-science', 'numpy', 'pandas'],
    version: '1.0.0',
    author: 'SuperModel AI Team',
    authorId: 'system',
    isPublic: true,
    isVerified: true,
    rating: 4.9,
    downloads: 890,
    size: 3200,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    content: {
      instructions: 'Expert in AI/ML with Python, TensorFlow, PyTorch, and data science workflows.',
      examples: [
        {
          title: 'Neural Network',
          description: 'Simple neural network with Keras',
          input: 'Create a basic neural network',
          output: 'model = tf.keras.Sequential([\n  tf.keras.layers.Dense(128, activation="relu"),\n  tf.keras.layers.Dense(10, activation="softmax")\n])',
        },
      ],
      templates: [],
      knowledge: [
        {
          type: 'documentation',
          title: 'Deep Learning Basics',
          content: 'Neural networks learn patterns through backpropagation and gradient descent.',
        },
      ],
      dependencies: ['tensorflow', 'pytorch', 'numpy', 'pandas'],
    },
    metadata: {
      lastUsed: new Date(),
      usageCount: 156,
      performance: {
        avgResponseTime: 1800,
        successRate: 94.8,
        errorRate: 5.2,
      },
      compatibility: {
        modelTypes: ['openai', 'anthropic'],
        frameworks: ['tensorflow', 'pytorch'],
        languages: ['python'],
      },
    },
  },
];

// GET /api/skill-packs - List all skill packs
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { category, search, limit = '10', offset = '0' } = req.query;
  
  let filteredPacks = [...mockSkillPacks];
  
  // Filter by category
  if (category && typeof category === 'string') {
    filteredPacks = filteredPacks.filter(pack => 
      pack.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Search functionality
  if (search && typeof search === 'string') {
    const searchTerm = search.toLowerCase();
    filteredPacks = filteredPacks.filter(pack =>
      pack.name.toLowerCase().includes(searchTerm) ||
      pack.description.toLowerCase().includes(searchTerm) ||
      pack.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
  
  // Pagination
  const limitNum = parseInt(limit as string) || 10;
  const offsetNum = parseInt(offset as string) || 0;
  const paginatedPacks = filteredPacks.slice(offsetNum, offsetNum + limitNum);
  
  res.json({
    success: true,
    data: {
      skillPacks: paginatedPacks,
      total: filteredPacks.length,
      limit: limitNum,
      offset: offsetNum,
    },
    pagination: {
      page: Math.floor(offsetNum / limitNum) + 1,
      limit: limitNum,
      total: filteredPacks.length,
      totalPages: Math.ceil(filteredPacks.length / limitNum),
    },
  } as APIResponse);
}));

// GET /api/skill-packs/:id - Get specific skill pack
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const skillPack = mockSkillPacks.find(pack => pack.id === id);
  
  if (!skillPack) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'SKILL_PACK_NOT_FOUND',
        message: 'Skill pack not found',
      },
    } as APIResponse);
  }
  
  res.json({
    success: true,
    data: skillPack,
  } as APIResponse);
}));

// POST /api/skill-packs - Create new skill pack
router.post('/', skillPackRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { name, description, category, tags, content } = req.body;
  
  if (!name || !description || !category || !content) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name, description, category, and content are required',
      },
    } as APIResponse);
  }
  
  const newSkillPack = {
    id: `custom_${Date.now()}`,
    name,
    description,
    category,
    tags: tags || [],
    version: '1.0.0',
    author: 'User',
    authorId: 'user_demo', // In real app, get from JWT
    isPublic: false,
    isVerified: false,
    rating: 0,
    downloads: 0,
    size: JSON.stringify(content).length,
    createdAt: new Date(),
    updatedAt: new Date(),
    content,
    metadata: {
      lastUsed: new Date(),
      usageCount: 0,
      performance: {
        avgResponseTime: 0,
        successRate: 100,
        errorRate: 0,
      },
      compatibility: {
        modelTypes: ['openai'],
        frameworks: [],
        languages: ['javascript'],
      },
    },
  };
  
  mockSkillPacks.push(newSkillPack);
  
  res.status(201).json({
    success: true,
    data: newSkillPack,
  } as APIResponse);
}));

// PUT /api/skill-packs/:id - Update skill pack
router.put('/:id', skillPackRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  
  const skillPackIndex = mockSkillPacks.findIndex(pack => pack.id === id);
  
  if (skillPackIndex === -1) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'SKILL_PACK_NOT_FOUND',
        message: 'Skill pack not found',
      },
    } as APIResponse);
  }
  
  // Update the skill pack
  mockSkillPacks[skillPackIndex] = {
    ...mockSkillPacks[skillPackIndex],
    ...updates,
    updatedAt: new Date(),
  };
  
  res.json({
    success: true,
    data: mockSkillPacks[skillPackIndex],
  } as APIResponse);
}));

// DELETE /api/skill-packs/:id - Delete skill pack
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const skillPackIndex = mockSkillPacks.findIndex(pack => pack.id === id);
  
  if (skillPackIndex === -1) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'SKILL_PACK_NOT_FOUND',
        message: 'Skill pack not found',
      },
    } as APIResponse);
  }
  
  // Check if it's a system skill pack
  if (mockSkillPacks[skillPackIndex].authorId === 'system') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Cannot delete system skill packs',
      },
    } as APIResponse);
  }
  
  mockSkillPacks.splice(skillPackIndex, 1);
  
  res.json({
    success: true,
    data: {
      message: 'Skill pack deleted successfully',
    },
  } as APIResponse);
}));

// GET /api/skill-packs/categories - Get all categories
router.get('/meta/categories', asyncHandler(async (req: Request, res: Response) => {
  const categories = [...new Set(mockSkillPacks.map(pack => pack.category))];
  
  const categoryStats = categories.map(category => ({
    name: category,
    count: mockSkillPacks.filter(pack => pack.category === category).length,
    avgRating: mockSkillPacks
      .filter(pack => pack.category === category)
      .reduce((sum, pack) => sum + pack.rating, 0) / 
      mockSkillPacks.filter(pack => pack.category === category).length,
  }));
  
  res.json({
    success: true,
    data: {
      categories: categoryStats,
      total: categories.length,
    },
  } as APIResponse);
}));

// GET /api/skill-packs/stats - Get skill pack statistics
router.get('/meta/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = {
    totalSkillPacks: mockSkillPacks.length,
    publicSkillPacks: mockSkillPacks.filter(pack => pack.isPublic).length,
    verifiedSkillPacks: mockSkillPacks.filter(pack => pack.isVerified).length,
    totalDownloads: mockSkillPacks.reduce((sum, pack) => sum + pack.downloads, 0),
    avgRating: mockSkillPacks.reduce((sum, pack) => sum + pack.rating, 0) / mockSkillPacks.length,
    categories: [...new Set(mockSkillPacks.map(pack => pack.category))],
    popularTags: getPopularTags(),
    recentlyCreated: mockSkillPacks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(pack => ({ id: pack.id, name: pack.name, createdAt: pack.createdAt })),
  };
  
  res.json({
    success: true,
    data: stats,
  } as APIResponse);
}));

// Helper function to get popular tags
function getPopularTags(): Array<{ tag: string; count: number }> {
  const tagCounts: Record<string, number> = {};
  
  mockSkillPacks.forEach(pack => {
    pack.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export default router;