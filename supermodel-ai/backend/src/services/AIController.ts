import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  AIProcessRequest, 
  AIProcessResponse, 
  AISession, 
  SkillPack, 
  SessionContext, 
  SessionMessage,
  VectorSearchResult
} from '../types';
import { SkillPackService } from './SkillPackService';
import { VectorStoreService } from './VectorStoreService';
import { CacheService } from './CacheService';
import { OpenAIService } from './OpenAIService';
import { AnthropicService } from './AnthropicService';
import { XAIService } from './XAIService';
import { logger } from '../config/logger';

export class AIController extends EventEmitter {
  private skillPackService: SkillPackService;
  private vectorStoreService: VectorStoreService;
  private cacheService: CacheService;
  private openAIService: OpenAIService;
  private anthropicService: AnthropicService;
  private xaiService: XAIService;
  private activeSessions: Map<string, AISession> = new Map();
  private loadedSkillPacks: Map<string, SkillPack> = new Map();
  private readonly maxConcurrentSessions: number;
  private readonly sessionTimeout: number;

  constructor(
    skillPackService: SkillPackService,
    vectorStoreService: VectorStoreService,
    cacheService: CacheService
  ) {
    super();
    
    this.skillPackService = skillPackService;
    this.vectorStoreService = vectorStoreService;
    this.cacheService = cacheService;
    this.maxConcurrentSessions = parseInt(process.env.MAX_CONCURRENT_TASKS || '10');
    this.sessionTimeout = parseInt(process.env.TASK_TIMEOUT_MS || '300000');
    
    // Initialize AI services
    this.openAIService = new OpenAIService();
    this.anthropicService = new AnthropicService();
    this.xaiService = new XAIService();
    
    // Start session cleanup timer
    this.startSessionCleanup();
    
    logger.info('AIController initialized');
  }

  /**
   * Process a user request with dynamic skill pack loading
   */
  async processRequest(request: AIProcessRequest, userId: string): Promise<AIProcessResponse> {
    const startTime = Date.now();
    
    try {
      // Get or create session
      const session = await this.getOrCreateSession(request.sessionId, userId);
      
      // Analyze request to determine required skill packs
      const requiredSkillPacks = await this.analyzeRequest(request.message, request.skillPackHints);
      
      // Load required skill packs
      const loadedPacks = await this.loadSkillPacks(requiredSkillPacks, session.id);
      
      // Update session context
      session.context.activeSkillPacks = loadedPacks.map(pack => pack.id);
      session.context.currentTask = request.message;
      
      // Generate AI response
      const response = await this.generateResponse(request, session, loadedPacks);
      
      // Update session with new message
      await this.updateSession(session, {
        role: 'user',
        content: request.message,
        timestamp: new Date(),
      });
      
      await this.updateSession(session, {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: response.metadata,
      });
      
      // Cache result for performance
      await this.cacheResponse(request, response);
      
      // Emit event for analytics
      this.emit('request_processed', {
        sessionId: session.id,
        userId,
        skillPacksUsed: response.skillPacksUsed,
        processingTime: response.metadata.processingTime,
        tokens: response.metadata.tokens,
        cost: response.metadata.cost,
      });
      
      return response;
      
    } catch (error) {
      logger.error('Error processing AI request:', error);
      
      const errorResponse: AIProcessResponse = {
        sessionId: request.sessionId || uuidv4(),
        response: 'I apologize, but I encountered an error processing your request. Please try again.',
        skillPacksUsed: [],
        metadata: {
          processingTime: Date.now() - startTime,
          tokens: 0,
          cost: 0,
          confidence: 0,
        },
      };
      
      return errorResponse;
    }
  }

  /**
   * Analyze request to determine required skill packs
   */
  private async analyzeRequest(message: string, hints?: string[]): Promise<string[]> {
    try {
      // Check cache first
      const cacheKey = `skill_analysis_${Buffer.from(message).toString('base64')}`;
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        return cachedResult as string[];
      }
      
      // Use vector similarity search to find relevant skill packs
      const searchResults = await this.vectorStoreService.searchSimilar(message, {
        topK: 10,
        threshold: 0.7,
      });
      
      // Extract skill pack IDs from search results
      const skillPackIds = new Set<string>();
      
      searchResults.forEach(result => {
        if (result.metadata.skillPackId) {
          skillPackIds.add(result.metadata.skillPackId);
        }
      });
      
      // Add skill packs from hints
      if (hints) {
        hints.forEach(hint => {
          const normalizedHint = hint.toLowerCase().trim();
          // Search for skill packs by name or tag
          // This would be implemented based on your skill pack naming convention
          skillPackIds.add(normalizedHint);
        });
      }
      
      // Convert to array and apply business logic
      const result = Array.from(skillPackIds).slice(0, 5); // Limit to top 5 skill packs
      
      // Cache result
      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      
      return result;
      
    } catch (error) {
      logger.error('Error analyzing request:', error);
      return []; // Return empty array if analysis fails
    }
  }

  /**
   * Load required skill packs for a session
   */
  private async loadSkillPacks(skillPackIds: string[], sessionId: string): Promise<SkillPack[]> {
    const loadedPacks: SkillPack[] = [];
    
    for (const skillPackId of skillPackIds) {
      try {
        // Check if already loaded
        if (this.loadedSkillPacks.has(skillPackId)) {
          loadedPacks.push(this.loadedSkillPacks.get(skillPackId)!);
          continue;
        }
        
        // Load skill pack
        const skillPack = await this.skillPackService.getSkillPack(skillPackId);
        
        if (skillPack) {
          this.loadedSkillPacks.set(skillPackId, skillPack);
          loadedPacks.push(skillPack);
          
          // Update usage metrics
          await this.skillPackService.updateUsageMetrics(skillPackId);
          
          logger.info(`Loaded skill pack: ${skillPack.name} for session ${sessionId}`);
        }
        
      } catch (error) {
        logger.error(`Error loading skill pack ${skillPackId}:`, error);
      }
    }
    
    return loadedPacks;
  }

  /**
   * Generate AI response using loaded skill packs
   */
  private async generateResponse(
    request: AIProcessRequest,
    session: AISession,
    skillPacks: SkillPack[]
  ): Promise<AIProcessResponse> {
    const startTime = Date.now();
    
    try {
      // Build context from skill packs
      const context = this.buildContext(request, session, skillPacks);
      
      // Choose AI service based on requirements
      const aiService = this.selectAIService(request, skillPacks);
      
      // Generate response
      const response = await aiService.generateResponse(context, request.options);
      
      const processingTime = Date.now() - startTime;
      
      return {
        sessionId: session.id,
        response: response.content,
        skillPacksUsed: skillPacks.map(pack => pack.id),
        metadata: {
          processingTime,
          tokens: response.tokens,
          cost: response.cost,
          confidence: response.confidence,
        },
        suggestions: response.suggestions,
      };
      
    } catch (error) {
      logger.error('Error generating AI response:', error);
      throw error;
    }
  }

  /**
   * Build context from skill packs and session history
   */
  private buildContext(
    request: AIProcessRequest,
    session: AISession,
    skillPacks: SkillPack[]
  ): string {
    let context = '';
    
    // Add system prompt
    context += 'You are SuperModel AI, a modular AI assistant that uses specialized skill packs to provide focused, efficient responses.\n\n';
    
    // Add skill pack instructions
    skillPacks.forEach(pack => {
      context += `=== ${pack.name} Skill Pack ===\n`;
      context += `${pack.content.instructions}\n\n`;
      
      // Add relevant examples
      if (pack.content.examples && pack.content.examples.length > 0) {
        context += 'Examples:\n';
        pack.content.examples.slice(0, 3).forEach(example => {
          context += `Q: ${example.input}\nA: ${example.output}\n\n`;
        });
      }
    });
    
    // Add session context
    if (session.context.sessionVariables) {
      context += 'Session Context:\n';
      Object.entries(session.context.sessionVariables).forEach(([key, value]) => {
        context += `${key}: ${value}\n`;
      });
      context += '\n';
    }
    
    // Add recent conversation history
    if (session.messages && session.messages.length > 0) {
      context += 'Recent Conversation:\n';
      session.messages.slice(-10).forEach(message => {
        context += `${message.role}: ${message.content}\n`;
      });
      context += '\n';
    }
    
    // Add current request
    context += `Current Request: ${request.message}\n\n`;
    context += 'Please provide a helpful, focused response using the loaded skill packs. Be concise and actionable.';
    
    return context;
  }

  /**
   * Select appropriate AI service based on requirements
   */
  private selectAIService(request: AIProcessRequest, skillPacks: SkillPack[]): any {
    // Default to OpenAI for now
    // In the future, this could be more sophisticated based on:
    // - Skill pack requirements
    // - User preferences
    // - Cost optimization
    // - Performance requirements
    
    const preferredModel = process.env.PREFERRED_AI_MODEL || 'openai';
    
    switch (preferredModel) {
      case 'anthropic':
        return this.anthropicService;
      case 'xai':
        return this.xaiService;
      default:
        return this.openAIService;
    }
  }

  /**
   * Get or create session
   */
  private async getOrCreateSession(sessionId: string | undefined, userId: string): Promise<AISession> {
    if (sessionId && this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }
    
    const newSessionId = sessionId || uuidv4();
    const newSession: AISession = {
      id: newSessionId,
      userId,
      title: 'New Session',
      status: 'active',
      loadedSkillPacks: [],
      context: {
        currentTask: '',
        activeSkillPacks: [],
        userPreferences: {},
        sessionVariables: {},
        cachedResults: {},
      },
      messages: [],
      metadata: {
        totalTokens: 0,
        totalCost: 0,
        avgResponseTime: 0,
        skillPacksUsed: [],
        performance: {
          successfulRequests: 0,
          failedRequests: 0,
          totalRequests: 0,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AISession;
    
    this.activeSessions.set(newSessionId, newSession);
    
    return newSession;
  }

  /**
   * Update session with new message
   */
  private async updateSession(session: AISession, message: Partial<SessionMessage>): Promise<void> {
    const fullMessage: SessionMessage = {
      id: uuidv4(),
      role: message.role || 'user',
      content: message.content || '',
      timestamp: message.timestamp || new Date(),
      metadata: message.metadata,
    };
    
    session.messages.push(fullMessage);
    session.updatedAt = new Date();
    
    // Update session metadata
    if (message.metadata) {
      session.metadata.totalTokens += message.metadata.tokens || 0;
      session.metadata.totalCost += message.metadata.cost || 0;
      session.metadata.performance.totalRequests++;
    }
  }

  /**
   * Cache response for performance
   */
  private async cacheResponse(request: AIProcessRequest, response: AIProcessResponse): Promise<void> {
    try {
      const cacheKey = `ai_response_${Buffer.from(request.message).toString('base64')}`;
      await this.cacheService.set(cacheKey, response, 1800); // Cache for 30 minutes
    } catch (error) {
      logger.error('Error caching response:', error);
    }
  }

  /**
   * Start session cleanup timer
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [sessionId, session] of this.activeSessions) {
        const lastActivity = session.updatedAt.getTime();
        
        if (now - lastActivity > this.sessionTimeout) {
          this.cleanupSession(sessionId);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Cleanup inactive session
   */
  private cleanupSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      // Offload skill packs if not used by other sessions
      session.context.activeSkillPacks.forEach(skillPackId => {
        const stillInUse = Array.from(this.activeSessions.values())
          .some(s => s.id !== sessionId && s.context.activeSkillPacks.includes(skillPackId));
        
        if (!stillInUse) {
          this.loadedSkillPacks.delete(skillPackId);
          logger.info(`Offloaded skill pack: ${skillPackId}`);
        }
      });
      
      this.activeSessions.delete(sessionId);
      logger.info(`Cleaned up session: ${sessionId}`);
    }
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): AISession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get loaded skill packs
   */
  getLoadedSkillPacks(): SkillPack[] {
    return Array.from(this.loadedSkillPacks.values());
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }
}