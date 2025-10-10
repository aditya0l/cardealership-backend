// Mock queue service without Redis dependency for now
// This provides the same interface but processes jobs synchronously

interface Job {
  id: string;
  data: any;
  progress?: number;
  opts?: any;
  timestamp?: number;
  attemptsMade?: number;
  finishedOn?: number;
  processedOn?: number;
  returnvalue?: any;
  failedReason?: string;
  stacktrace?: string[];
  
  // Mock methods for Bull job compatibility
  remove?: () => Promise<void>;
}

class MockQueue {
  private name: string;
  private processors: Array<(job: Job) => Promise<any>> = [];
  private eventHandlers: Record<string, Array<(...args: any[]) => void>> = {};
  private jobId = 0;
  private jobs: Map<string, Job> = new Map();

  constructor(name: string, options?: any) {
    this.name = name;
    this.eventHandlers = {
      completed: [],
      failed: [],
      stalled: []
    };
  }

  async add(data: any, options?: any): Promise<Job> {
    const job: Job = {
      id: (++this.jobId).toString(),
      data,
      progress: 0,
      opts: options || {},
      timestamp: Date.now(),
      attemptsMade: 0,
      remove: async () => {
        this.jobs.delete(job.id);
      },
      updateProgress: async (progressValue: number) => {
        job.progress = progressValue;
        console.log(`📊 Job ${job.id} progress: ${progressValue}%`);
        return Promise.resolve();
      }
    } as any;
    
    this.jobs.set(job.id, job);

    // Process job immediately (synchronous processing)
    try {
      for (const processor of this.processors) {
        job.processedOn = Date.now();
        const result = await processor(job);
        job.finishedOn = Date.now();
        job.returnvalue = result;
        this.emit('completed', job, result);
        return job;
      }
    } catch (error) {
      job.finishedOn = Date.now();
      job.failedReason = (error as Error).message;
      job.stacktrace = (error as Error).stack?.split('\n') || [];
      this.emit('failed', job, error);
      throw error;
    }
    
    return job;
  }

  process(concurrency: number, processor?: (job: Job) => Promise<any>): void;
  process(processor: (job: Job) => Promise<any>): void;
  process(arg1: number | ((job: Job) => Promise<any>), arg2?: (job: Job) => Promise<any>): void {
    const processor = typeof arg1 === 'function' ? arg1 : arg2;
    if (processor) {
      this.processors.push(processor);
    }
  }

  on(event: string, handler: (...args: any[]) => void) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  // Mock methods for Bull queue compatibility
  async getJob(id: string): Promise<Job | null> {
    return this.jobs.get(id) || null;
  }

  async getWaiting(): Promise<Job[]> {
    return []; // No waiting jobs in sync processing
  }

  async getActive(): Promise<Job[]> {
    return []; // No active jobs in sync processing
  }

  async getCompleted(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  async getFailed(): Promise<Job[]> {
    return []; // Implement if needed
  }

  async getDelayed(): Promise<Job[]> {
    return []; // No delayed jobs in sync processing
  }

  private emit(event: string, ...args: any[]) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(...args));
    }
  }
}

// Create mock queue for booking imports
export const bookingImportQueue = new MockQueue('booking import');

// Queue job interfaces
export interface BookingImportJobData {
  importId: string;
  filePath: string;
  adminId: string;
  importSettings: {
    columnMapping: Record<string, string>;
    skipFirstRow: boolean;
    dealerId?: string;
    defaultAdvisorId?: string;
  };
}

// Mock health check - always returns true since we're not using Redis
export const checkRedisConnection = async (): Promise<boolean> => {
  return true;
};

// Queue monitoring
bookingImportQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

bookingImportQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

bookingImportQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} stalled`);
});

export default bookingImportQueue;
