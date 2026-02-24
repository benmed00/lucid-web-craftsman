/**
 * Web Worker for heavy computations to reduce main-thread work
 * Handles data processing, image optimization, and complex calculations
 */

// Types for worker messages
interface WorkerMessage {
  type: string;
  payload: any;
  id: string;
}

interface WorkerResponse {
  type: string;
  result: any;
  id: string;
  error?: string;
}

class MainThreadOptimizer {
  private worker: Worker | null = null;
  private workerInitialized = false;
  private pendingTasks = new Map<
    string,
    { resolve: Function; reject: Function }
  >();
  private taskCounter = 0;

  constructor() {
    // Defer worker creation to avoid blocking main thread during module load
  }

  private initializeWorker() {
    try {
      // Create worker only when needed to reduce initial load
      const workerCode = `
        // Web Worker code for heavy computations
        let taskQueue = [];
        let isProcessing = false;

        // Process tasks in batches to avoid blocking
        function processTasks() {
          if (isProcessing || taskQueue.length === 0) return;
          
          isProcessing = true;
          const batchSize = 5;
          const batch = taskQueue.splice(0, batchSize);
          
          batch.forEach(task => {
            try {
              let result;
              
              switch (task.type) {
                case 'OPTIMIZE_IMAGE_DATA':
                  result = optimizeImageData(task.payload);
                  break;
                case 'PROCESS_PRODUCT_DATA':
                  result = processProductData(task.payload);
                  break;
                case 'CALCULATE_LAYOUT':
                  result = calculateLayout(task.payload);
                  break;
                case 'COMPRESS_DATA':
                  result = compressData(task.payload);
                  break;
                default:
                  throw new Error('Unknown task type: ' + task.type);
              }
              
              self.postMessage({
                type: 'TASK_COMPLETE',
                result: result,
                id: task.id
              });
            } catch (error) {
              self.postMessage({
                type: 'TASK_ERROR',
                error: error.message,
                id: task.id
              });
            }
          });
          
          isProcessing = false;
          
          // Continue processing if there are more tasks
          if (taskQueue.length > 0) {
            setTimeout(processTasks, 10);
          }
        }

        // Optimize image data calculations
        function optimizeImageData(data) {
          const { width, height, quality } = data;
          
          // Simulate heavy image processing
          let result = {
            optimizedSize: Math.floor(width * height * (quality / 100) * 0.8),
            recommendedFormat: quality > 80 ? 'webp' : 'jpeg',
            compressionRatio: (100 - quality) / 100
          };
          
          return result;
        }

        // Process product data efficiently
        function processProductData(products) {
          return products.map(product => ({
            ...product,
            searchableText: (product.name + ' ' + product.description).toLowerCase(),
            priceRange: product.price < 50 ? 'low' : product.price < 100 ? 'medium' : 'high',
            availability: product.stock > 0 ? 'available' : 'out-of-stock'
          }));
        }

        // Calculate layout efficiently
        function calculateLayout(layoutData) {
          const { containerWidth, items } = layoutData;
          const itemsPerRow = Math.floor(containerWidth / 300); // Assuming 300px per item
          
          return {
            itemsPerRow,
            rows: Math.ceil(items.length / itemsPerRow),
            itemWidth: Math.floor(containerWidth / itemsPerRow) - 20 // 20px for margins
          };
        }

        // Compress data for storage
        function compressData(data) {
          // Simple compression simulation
          const jsonString = JSON.stringify(data);
          return {
            original: jsonString.length,
            compressed: Math.floor(jsonString.length * 0.7),
            ratio: 0.3
          };
        }

        // Handle incoming messages
        self.addEventListener('message', function(e) {
          const task = e.data;
          taskQueue.push(task);
          processTasks();
        });
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.addEventListener(
        'message',
        this.handleWorkerMessage.bind(this)
      );
      this.worker.addEventListener('error', this.handleWorkerError.bind(this));
    } catch (error) {
      console.warn('Web Worker not supported or failed to initialize:', error);
    }
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
    const { type, result, id, error } = event.data;
    const task = this.pendingTasks.get(id);

    if (task) {
      this.pendingTasks.delete(id);

      if (type === 'TASK_COMPLETE') {
        task.resolve(result);
      } else if (type === 'TASK_ERROR') {
        task.reject(new Error(error));
      }
    }
  }

  private handleWorkerError(error: ErrorEvent) {
    console.error('Worker error:', error);
    // Fallback to main thread processing if worker fails
  }

  /**
   * Execute heavy task in web worker to keep main thread free
   */
  async executeInWorker<T>(type: string, payload: any): Promise<T> {
    // Lazy-init the worker on first use
    if (!this.workerInitialized) {
      this.workerInitialized = true;
      this.initializeWorker();
    }
    if (!this.worker) {
      // Fallback to main thread if worker not available
      return this.executeOnMainThread(type, payload);
    }

    const id = `task_${++this.taskCounter}`;

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, { resolve, reject });

      this.worker!.postMessage({
        type,
        payload,
        id,
      });

      // Timeout to prevent hanging
      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          reject(new Error('Worker task timeout'));
        }
      }, 10000);
    });
  }

  private executeOnMainThread(type: string, payload: any): any {
    // Fallback implementations for main thread
    switch (type) {
      case 'OPTIMIZE_IMAGE_DATA':
        return {
          optimizedSize: Math.floor(payload.width * payload.height * 0.8),
          recommendedFormat: 'webp',
          compressionRatio: 0.2,
        };
      case 'PROCESS_PRODUCT_DATA':
        return payload.map((product: any) => ({
          ...product,
          searchableText: (
            product.name +
            ' ' +
            product.description
          ).toLowerCase(),
        }));
      default:
        return payload;
    }
  }

  /**
   * Batch multiple tasks to reduce worker overhead
   */
  async executeBatch(
    tasks: Array<{ type: string; payload: any }>
  ): Promise<any[]> {
    const promises = tasks.map((task) =>
      this.executeInWorker(task.type, task.payload)
    );

    return Promise.all(promises);
  }

  /**
   * Cleanup worker resources
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingTasks.clear();
  }
}

// Global instance
export const mainThreadOptimizer = new MainThreadOptimizer();

/**
 * Hook for using main thread optimizer in React components
 */
export const useMainThreadOptimizer = () => {
  const executeInWorker =
    mainThreadOptimizer.executeInWorker.bind(mainThreadOptimizer);
  const executeBatch =
    mainThreadOptimizer.executeBatch.bind(mainThreadOptimizer);

  return { executeInWorker, executeBatch };
};

export default MainThreadOptimizer;
