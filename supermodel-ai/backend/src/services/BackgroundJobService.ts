import { EventEmitter } from 'events';
import { logger } from '../config/logger';
import { BackgroundJob } from '../types';

export class BackgroundJobService extends EventEmitter {
  private jobs: Map<string, BackgroundJob> = new Map();
  private isInitialized: boolean = false;
  private jobProcessor: NodeJS.Timeout | null = null;

  constructor() {
    super();
    logger.info('BackgroundJobService created');
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
    this.startJobProcessor();
    logger.info('BackgroundJobService initialized');
  }

  private startJobProcessor(): void {
    // Process jobs every 5 seconds
    this.jobProcessor = setInterval(() => {
      this.processJobs();
    }, 5000);
  }

  private async processJobs(): Promise<void> {
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .slice(0, 5); // Process max 5 jobs at a time

    for (const job of pendingJobs) {
      try {
        await this.processJob(job);
      } catch (error) {
        logger.error(`Error processing job ${job.id}:`, error);
      }
    }
  }

  private async processJob(job: BackgroundJob): Promise<void> {
    job.status = 'processing';
    job.processedAt = new Date();
    
    try {
      // Simulate job processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      job.status = 'completed';
      job.completedAt = new Date();
      
      this.emit('job_completed', job);
      logger.info(`Job ${job.id} completed successfully`);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.attempts++;
      
      if (job.attempts < job.maxAttempts) {
        job.status = 'pending';
        logger.warn(`Job ${job.id} failed, retrying (${job.attempts}/${job.maxAttempts})`);
      } else {
        this.emit('job_failed', job);
        logger.error(`Job ${job.id} failed permanently after ${job.attempts} attempts`);
      }
    }
  }

  addJob(type: string, data: any): string {
    const job: BackgroundJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.emit('job_added', job);
    
    logger.info(`Added background job: ${job.id} (${type})`);
    return job.id;
  }

  getJob(id: string): BackgroundJob | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): BackgroundJob[] {
    return Array.from(this.jobs.values());
  }

  getJobsByStatus(status: BackgroundJob['status']): BackgroundJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Job cancelled';
      this.emit('job_cancelled', job);
      return true;
    }
    return false;
  }

  clearCompletedJobs(): number {
    const completedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'completed' || job.status === 'failed');
    
    completedJobs.forEach(job => {
      this.jobs.delete(job.id);
    });
    
    logger.info(`Cleared ${completedJobs.length} completed jobs`);
    return completedJobs.length;
  }

  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(job => job.status === 'pending').length,
      processing: jobs.filter(job => job.status === 'processing').length,
      completed: jobs.filter(job => job.status === 'completed').length,
      failed: jobs.filter(job => job.status === 'failed').length,
    };
  }

  async close(): Promise<void> {
    if (this.jobProcessor) {
      clearInterval(this.jobProcessor);
      this.jobProcessor = null;
    }
    
    this.isInitialized = false;
    logger.info('BackgroundJobService closed');
  }
}