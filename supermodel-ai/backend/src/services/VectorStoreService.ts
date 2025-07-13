import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { logger } from '../config/logger';
import { VectorEmbedding, VectorSearchResult } from '../types';

interface SearchOptions {
  topK?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export class VectorStoreService {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName: string;
  private isInitialized: boolean = false;

  constructor() {
    this.indexName = process.env.PINECONE_INDEX_NAME || 'supermodel-ai-skillpacks';
    
    try {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
      });
      
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });
      
      this.initialize();
    } catch (error) {
      logger.error('Error initializing VectorStoreService:', error);
    }
  }

  private async initialize(): Promise<void> {
    try {
      // Check if index exists, create if not
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(index => index.name === this.indexName);
      
      if (!indexExists) {
        await this.createIndex();
      }
      
      this.isInitialized = true;
      logger.info('VectorStoreService initialized successfully');
    } catch (error) {
      logger.error('Error initializing VectorStoreService:', error);
    }
  }

  private async createIndex(): Promise<void> {
    try {
      await this.pinecone.createIndex({
        name: this.indexName,
        dimension: 1536, // OpenAI text-embedding-ada-002 dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      
      logger.info(`Created Pinecone index: ${this.indexName}`);
    } catch (error) {
      logger.error('Error creating Pinecone index:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  async searchSimilar(
    query: string,
    options: SearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('VectorStoreService not initialized');
    }

    try {
      const { topK = 5, threshold = 0.7, filter } = options;
      
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
      
      const index = this.pinecone.Index(this.indexName);
      
      const searchResult = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
      });
      
      // Filter results by threshold and convert to VectorSearchResult
      const results: VectorSearchResult[] = [];
      
      if (searchResult.matches) {
        for (const match of searchResult.matches) {
          if (match.score && match.score >= threshold) {
            results.push({
              id: match.id,
              score: match.score,
              metadata: match.metadata || {},
              content: String(match.metadata?.content || ''),
              skillPackId: String(match.metadata?.skillPackId || ''),
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error searching similar vectors:', error);
      throw error;
    }
  }

  async indexSkillPackContent(skillPackId: string, content: {
    instructions: string;
    examples: Array<{ input: string; output: string; }>;
    templates: Array<{ name: string; template: string; }>;
    knowledge: Array<{ title: string; content: string; }>;
  }): Promise<void> {
    try {
      const embeddings: VectorEmbedding[] = [];
      
      // Index instructions
      if (content.instructions) {
        const instructionVector = await this.generateEmbedding(content.instructions);
        embeddings.push({
          id: `${skillPackId}_instructions`,
          vector: instructionVector,
          metadata: {
            title: 'Instructions',
            category: 'instructions',
          },
          content: content.instructions,
          skillPackId,
          type: 'instruction',
        });
      }
      
      // Index examples
      for (let i = 0; i < content.examples.length; i++) {
        const example = content.examples[i];
        const exampleText = `Input: ${example.input}\nOutput: ${example.output}`;
        const exampleVector = await this.generateEmbedding(exampleText);
        
        embeddings.push({
          id: `${skillPackId}_example_${i}`,
          vector: exampleVector,
          metadata: {
            title: `Example ${i + 1}`,
            category: 'examples',
            input: example.input,
            output: example.output,
          },
          content: exampleText,
          skillPackId,
          type: 'example',
        });
      }
      
      // Index templates
      for (let i = 0; i < content.templates.length; i++) {
        const template = content.templates[i];
        const templateText = `Template: ${template.name}\n${template.template}`;
        const templateVector = await this.generateEmbedding(templateText);
        
        embeddings.push({
          id: `${skillPackId}_template_${i}`,
          vector: templateVector,
          metadata: {
            title: template.name,
            category: 'templates',
            templateName: template.name,
          },
          content: templateText,
          skillPackId,
          type: 'template',
        });
      }
      
      // Index knowledge
      for (let i = 0; i < content.knowledge.length; i++) {
        const knowledge = content.knowledge[i];
        const knowledgeText = `${knowledge.title}\n${knowledge.content}`;
        const knowledgeVector = await this.generateEmbedding(knowledgeText);
        
        embeddings.push({
          id: `${skillPackId}_knowledge_${i}`,
          vector: knowledgeVector,
          metadata: {
            title: knowledge.title,
            category: 'knowledge',
          },
          content: knowledgeText,
          skillPackId,
          type: 'knowledge',
        });
      }
      
      // Upsert all embeddings
      await this.upsertVectors(embeddings);
      
      logger.info(`Indexed ${embeddings.length} vectors for skill pack: ${skillPackId}`);
    } catch (error) {
      logger.error('Error indexing skill pack content:', error);
      throw error;
    }
  }

  async upsertVectors(embeddings: VectorEmbedding[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('VectorStoreService not initialized');
    }

    try {
      const index = this.pinecone.Index(this.indexName);
      
      const vectors = embeddings.map(embedding => ({
        id: embedding.id,
        values: embedding.vector,
        metadata: {
          ...embedding.metadata,
          content: embedding.content,
          skillPackId: embedding.skillPackId,
          type: embedding.type,
        },
      }));
      
      // Batch upsert in chunks of 100
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(batch);
      }
      
      logger.info(`Upserted ${embeddings.length} vectors`);
    } catch (error) {
      logger.error('Error upserting vectors:', error);
      throw error;
    }
  }

  async deleteVectorsBySkillPack(skillPackId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('VectorStoreService not initialized');
    }

    try {
      const index = this.pinecone.Index(this.indexName);
      await index.deleteMany({
        filter: {
          skillPackId: { $eq: skillPackId },
        },
      });
      
      logger.info(`Deleted all vectors for skill pack: ${skillPackId}`);
    } catch (error) {
      logger.error('Error deleting vectors by skill pack:', error);
      throw error;
    }
  }

  async getIndexStats(): Promise<{
    totalVectors: number;
    dimension: number;
    indexFullness: number;
  }> {
    if (!this.isInitialized) {
      throw new Error('VectorStoreService not initialized');
    }

    try {
      const index = this.pinecone.Index(this.indexName);
      const stats = await index.describeIndexStats();
      
      return {
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension || 0,
        indexFullness: stats.indexFullness || 0,
      };
    } catch (error) {
      logger.error('Error getting index stats:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Pinecone doesn't require explicit closing
    this.isInitialized = false;
    logger.info('VectorStoreService closed');
  }
}