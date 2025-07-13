import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { SkillPack, SkillPackContent, SkillPackMetadata } from '../types';
import { VectorStoreService } from './VectorStoreService';
import { CacheService } from './CacheService';
import { logger } from '../config/logger';

export class SkillPackService extends EventEmitter {
  private vectorStoreService: VectorStoreService;
  private cacheService: CacheService;
  private skillPacks: Map<string, SkillPack> = new Map();
  private skillPackStats: Map<string, SkillPackMetadata> = new Map();

  constructor(vectorStoreService: VectorStoreService, cacheService: CacheService) {
    super();
    this.vectorStoreService = vectorStoreService;
    this.cacheService = cacheService;
    
    // Initialize with default skill packs
    this.loadDefaultSkillPacks();
    
    logger.info('SkillPackService initialized');
  }

  /**
   * Load default skill packs
   */
  private async loadDefaultSkillPacks(): Promise<void> {
    const defaultSkillPacks = [
      {
        id: 'frontend',
        name: 'Frontend Development',
        description: 'React, Vue, Angular, HTML, CSS, JavaScript development',
        category: 'Development',
        tags: ['react', 'vue', 'angular', 'html', 'css', 'javascript'],
        content: {
          instructions: 'You are a frontend development expert. Help users with React, Vue, Angular, HTML, CSS, and JavaScript development. Provide clean, efficient, and modern code solutions.',
          examples: [
            {
              title: 'React Component',
              description: 'Create a functional React component',
              input: 'Create a button component with props',
              output: 'const Button = ({ onClick, children, variant = "primary" }) => {\n  return (\n    <button \n      className={`btn btn-${variant}`}\n      onClick={onClick}\n    >\n      {children}\n    </button>\n  );\n};',
            },
            {
              title: 'CSS Flexbox Layout',
              description: 'Create a responsive flexbox layout',
              input: 'Create a responsive card layout',
              output: '.card-container {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 1rem;\n  padding: 1rem;\n}\n\n.card {\n  flex: 1 1 300px;\n  min-width: 300px;\n  padding: 1rem;\n  border: 1px solid #ddd;\n  border-radius: 8px;\n}',
            },
          ],
          templates: [
            {
              name: 'React Page Component',
              description: 'Template for a React page component',
              template: 'import React from "react";\n\nconst {{ComponentName}} = () => {\n  return (\n    <div className="{{className}}">\n      <h1>{{title}}</h1>\n      {{content}}\n    </div>\n  );\n};\n\nexport default {{ComponentName}};',
              variables: [
                { name: 'ComponentName', type: 'string', description: 'Component name', required: true },
                { name: 'className', type: 'string', description: 'CSS class name', required: false, default: 'page' },
                { name: 'title', type: 'string', description: 'Page title', required: true },
                { name: 'content', type: 'string', description: 'Page content', required: false, default: '<p>Content goes here</p>' },
              ],
            },
          ],
          knowledge: [
            {
              type: 'documentation',
              title: 'React Best Practices',
              content: 'React best practices include using functional components, hooks, proper state management, and component composition.',
            },
            {
              type: 'documentation',
              title: 'CSS Modern Layouts',
              content: 'Modern CSS layouts use Flexbox and Grid for responsive design, with CSS custom properties for theming.',
            },
          ],
          dependencies: ['react', 'typescript'],
        },
      },
      {
        id: 'backend',
        name: 'Backend Development',
        description: 'Node.js, Express, APIs, databases, server-side development',
        category: 'Development',
        tags: ['node.js', 'express', 'api', 'database', 'server'],
        content: {
          instructions: 'You are a backend development expert. Help users with Node.js, Express, API development, databases, and server-side architecture.',
          examples: [
            {
              title: 'Express API Route',
              description: 'Create an Express API route',
              input: 'Create a RESTful API endpoint for users',
              output: 'app.get("/api/users", async (req, res) => {\n  try {\n    const users = await User.find();\n    res.json({ success: true, data: users });\n  } catch (error) {\n    res.status(500).json({ success: false, error: error.message });\n  }\n});',
            },
            {
              title: 'MongoDB Schema',
              description: 'Create a MongoDB schema with Mongoose',
              input: 'Create a user schema',
              output: 'const userSchema = new mongoose.Schema({\n  name: { type: String, required: true },\n  email: { type: String, required: true, unique: true },\n  password: { type: String, required: true },\n  createdAt: { type: Date, default: Date.now },\n});\n\nmodule.exports = mongoose.model("User", userSchema);',
            },
          ],
          templates: [
            {
              name: 'Express Router',
              description: 'Template for Express router',
              template: 'const express = require("express");\nconst router = express.Router();\n\n// GET {{resource}}\nrouter.get("/", async (req, res) => {\n  // Implementation\n});\n\n// POST {{resource}}\nrouter.post("/", async (req, res) => {\n  // Implementation\n});\n\nmodule.exports = router;',
              variables: [
                { name: 'resource', type: 'string', description: 'Resource name', required: true },
              ],
            },
          ],
          knowledge: [
            {
              type: 'documentation',
              title: 'RESTful API Design',
              content: 'RESTful APIs follow HTTP methods: GET (read), POST (create), PUT (update), DELETE (delete).',
            },
            {
              type: 'documentation',
              title: 'Database Best Practices',
              content: 'Database best practices include proper indexing, data validation, connection pooling, and transaction management.',
            },
          ],
          dependencies: ['express', 'mongoose', 'mongodb'],
        },
      },
      {
        id: 'ai-ml',
        name: 'AI & Machine Learning',
        description: 'Python, TensorFlow, PyTorch, data science, ML models',
        category: 'AI/ML',
        tags: ['python', 'tensorflow', 'pytorch', 'machine-learning', 'data-science'],
        content: {
          instructions: 'You are an AI and machine learning expert. Help users with Python, TensorFlow, PyTorch, data science, and ML model development.',
          examples: [
            {
              title: 'Neural Network with TensorFlow',
              description: 'Create a simple neural network',
              input: 'Create a neural network for classification',
              output: 'import tensorflow as tf\n\nmodel = tf.keras.Sequential([\n  tf.keras.layers.Dense(128, activation="relu", input_shape=(784,)),\n  tf.keras.layers.Dropout(0.2),\n  tf.keras.layers.Dense(10, activation="softmax")\n])\n\nmodel.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])',
            },
            {
              title: 'Data Preprocessing',
              description: 'Preprocess data for ML',
              input: 'Preprocess CSV data for training',
              output: 'import pandas as pd\nfrom sklearn.preprocessing import StandardScaler\n\ndf = pd.read_csv("data.csv")\ndf = df.dropna()\nX = df.drop("target", axis=1)\ny = df["target"]\n\nscaler = StandardScaler()\nX_scaled = scaler.fit_transform(X)',
            },
          ],
          templates: [
            {
              name: 'ML Training Pipeline',
              description: 'Template for ML training pipeline',
              template: 'import pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.{{algorithm}} import {{ModelClass}}\nfrom sklearn.metrics import {{metric}}\n\n# Load data\ndf = pd.read_csv("{{data_file}}")\nX = df.drop("{{target_column}}", axis=1)\ny = df["{{target_column}}"]\n\n# Split data\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n\n# Train model\nmodel = {{ModelClass}}()\nmodel.fit(X_train, y_train)\n\n# Evaluate\ny_pred = model.predict(X_test)\nprint(f"{{metric.title()}}: {{{metric}}(y_test, y_pred)}")',
              variables: [
                { name: 'algorithm', type: 'string', description: 'ML algorithm module', required: true },
                { name: 'ModelClass', type: 'string', description: 'Model class name', required: true },
                { name: 'metric', type: 'string', description: 'Evaluation metric', required: true },
                { name: 'data_file', type: 'string', description: 'Data file path', required: true },
                { name: 'target_column', type: 'string', description: 'Target column name', required: true },
              ],
            },
          ],
          knowledge: [
            {
              type: 'documentation',
              title: 'Machine Learning Pipeline',
              content: 'ML pipeline includes data preprocessing, feature engineering, model training, evaluation, and deployment.',
            },
            {
              type: 'documentation',
              title: 'Deep Learning Concepts',
              content: 'Deep learning uses neural networks with multiple layers to learn complex patterns in data.',
            },
          ],
          dependencies: ['tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy'],
        },
      },
    ];

    for (const skillPackData of defaultSkillPacks) {
      const skillPack: SkillPack = {
        ...skillPackData,
        version: '1.0.0',
        author: 'SuperModel AI Team',
        authorId: 'system',
        isPublic: true,
        isVerified: true,
        rating: 5.0,
        downloads: 0,
        size: JSON.stringify(skillPackData.content).length,
        metadata: {
          lastUsed: new Date(),
          usageCount: 0,
          performance: {
            avgResponseTime: 0,
            successRate: 100,
            errorRate: 0,
          },
          compatibility: {
            modelTypes: ['openai', 'anthropic', 'xai'],
            frameworks: ['langchain'],
            languages: ['javascript', 'typescript'],
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SkillPack;

      this.skillPacks.set(skillPack.id, skillPack);
      
      // Index skill pack content in vector store
      await this.vectorStoreService.indexSkillPackContent(skillPack.id, skillPack.content);
      
      logger.info(`Loaded default skill pack: ${skillPack.name}`);
    }
  }

  /**
   * Get a skill pack by ID
   */
  async getSkillPack(id: string): Promise<SkillPack | null> {
    try {
      // Check cache first
      const cacheKey = `skillpack_${id}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return cached as SkillPack;
      }
      
      // Get from memory
      const skillPack = this.skillPacks.get(id);
      
      if (skillPack) {
        // Cache the result
        await this.cacheService.set(cacheKey, skillPack, 3600); // Cache for 1 hour
        return skillPack;
      }
      
      return null;
    } catch (error) {
      logger.error(`Error getting skill pack ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all skill packs
   */
  async getAllSkillPacks(): Promise<SkillPack[]> {
    return Array.from(this.skillPacks.values());
  }

  /**
   * Search skill packs by query
   */
  async searchSkillPacks(query: string, category?: string): Promise<SkillPack[]> {
    const skillPacks = Array.from(this.skillPacks.values());
    
    return skillPacks.filter(pack => {
      const matchesQuery = 
        pack.name.toLowerCase().includes(query.toLowerCase()) ||
        pack.description.toLowerCase().includes(query.toLowerCase()) ||
        pack.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      const matchesCategory = !category || pack.category === category;
      
      return matchesQuery && matchesCategory;
    });
  }

  /**
   * Create a new skill pack
   */
  async createSkillPack(skillPackData: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    content: SkillPackContent;
    authorId: string;
    isPublic?: boolean;
  }): Promise<SkillPack> {
    const skillPack: SkillPack = {
      id: uuidv4(),
      ...skillPackData,
      version: '1.0.0',
      author: 'User',
      isPublic: skillPackData.isPublic ?? false,
      isVerified: false,
      rating: 0,
      downloads: 0,
      size: JSON.stringify(skillPackData.content).length,
      metadata: {
        lastUsed: new Date(),
        usageCount: 0,
        performance: {
          avgResponseTime: 0,
          successRate: 100,
          errorRate: 0,
        },
        compatibility: {
          modelTypes: ['openai', 'anthropic', 'xai'],
          frameworks: ['langchain'],
          languages: ['javascript', 'typescript'],
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SkillPack;

    this.skillPacks.set(skillPack.id, skillPack);
    
    // Index skill pack content in vector store
    await this.vectorStoreService.indexSkillPackContent(skillPack.id, skillPack.content);
    
    // Clear cache
    await this.cacheService.delete(`skillpack_${skillPack.id}`);
    
    this.emit('skillpack_created', skillPack);
    
    logger.info(`Created skill pack: ${skillPack.name}`);
    
    return skillPack;
  }

  /**
   * Update a skill pack
   */
  async updateSkillPack(id: string, updates: Partial<SkillPack>): Promise<SkillPack | null> {
    const skillPack = this.skillPacks.get(id);
    
    if (!skillPack) {
      return null;
    }
    
    const updatedSkillPack = {
      ...skillPack,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.skillPacks.set(id, updatedSkillPack);
    
    // Re-index if content changed
    if (updates.content) {
      await this.vectorStoreService.indexSkillPackContent(id, updates.content);
    }
    
    // Clear cache
    await this.cacheService.delete(`skillpack_${id}`);
    
    this.emit('skillpack_updated', updatedSkillPack);
    
    logger.info(`Updated skill pack: ${updatedSkillPack.name}`);
    
    return updatedSkillPack;
  }

  /**
   * Delete a skill pack
   */
  async deleteSkillPack(id: string): Promise<boolean> {
    const skillPack = this.skillPacks.get(id);
    
    if (!skillPack) {
      return false;
    }
    
    this.skillPacks.delete(id);
    
    // Remove from vector store
    await this.vectorStoreService.deleteVectorsBySkillPack(id);
    
    // Clear cache
    await this.cacheService.delete(`skillpack_${id}`);
    
    this.emit('skillpack_deleted', id);
    
    logger.info(`Deleted skill pack: ${skillPack.name}`);
    
    return true;
  }

  /**
   * Update usage metrics for a skill pack
   */
  async updateUsageMetrics(id: string, responseTime?: number, success?: boolean): Promise<void> {
    const skillPack = this.skillPacks.get(id);
    
    if (!skillPack) {
      return;
    }
    
    skillPack.metadata.usageCount++;
    skillPack.metadata.lastUsed = new Date();
    
    if (responseTime) {
      const currentAvg = skillPack.metadata.performance.avgResponseTime;
      const count = skillPack.metadata.usageCount;
      skillPack.metadata.performance.avgResponseTime = 
        (currentAvg * (count - 1) + responseTime) / count;
    }
    
    if (success !== undefined) {
      const performance = skillPack.metadata.performance;
      if (success) {
        performance.successfulRequests = (performance.successfulRequests || 0) + 1;
      } else {
        performance.failedRequests = (performance.failedRequests || 0) + 1;
      }
      
      const totalRequests = (performance.successfulRequests || 0) + (performance.failedRequests || 0);
      performance.successRate = ((performance.successfulRequests || 0) / totalRequests) * 100;
      performance.errorRate = ((performance.failedRequests || 0) / totalRequests) * 100;
    }
    
    // Update in cache
    await this.cacheService.set(`skillpack_${id}`, skillPack, 3600);
    
    this.emit('skillpack_metrics_updated', { id, metrics: skillPack.metadata });
  }

  /**
   * Get skill pack statistics
   */
  getSkillPackStats(): {
    totalSkillPacks: number;
    categories: Record<string, number>;
    mostUsed: SkillPack[];
    averageRating: number;
  } {
    const skillPacks = Array.from(this.skillPacks.values());
    
    const categories: Record<string, number> = {};
    let totalRating = 0;
    
    skillPacks.forEach(pack => {
      categories[pack.category] = (categories[pack.category] || 0) + 1;
      totalRating += pack.rating;
    });
    
    const mostUsed = skillPacks
      .sort((a, b) => b.metadata.usageCount - a.metadata.usageCount)
      .slice(0, 5);
    
    return {
      totalSkillPacks: skillPacks.length,
      categories,
      mostUsed,
      averageRating: totalRating / skillPacks.length,
    };
  }

  /**
   * Get skill pack by category
   */
  async getSkillPacksByCategory(category: string): Promise<SkillPack[]> {
    const skillPacks = Array.from(this.skillPacks.values());
    return skillPacks.filter(pack => pack.category === category);
  }

  /**
   * Get popular skill packs
   */
  async getPopularSkillPacks(limit: number = 10): Promise<SkillPack[]> {
    const skillPacks = Array.from(this.skillPacks.values());
    return skillPacks
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }
}