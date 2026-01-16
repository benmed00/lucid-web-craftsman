import React from 'react';

/**
 * Task Scheduler for breaking up long-running tasks to improve TBT
 * Helps break tasks into smaller chunks to avoid blocking the main thread
 */

// Type for experimental scheduler API
interface SchedulerAPI {
  postTask: (callback: () => void, options?: { priority: string }) => void;
}

// Extend Window for scheduler API
declare global {
  interface Window {
    scheduler?: SchedulerAPI;
  }
}

class TaskScheduler {
  private taskQueue: Array<() => void> = [];
  private isRunning = false;
  private frameDeadline = 3; // Reduced to 3ms to prevent FID issues (well under 50ms)

  /**
   * Schedule a task to run in the next available time slot
   */
  schedule(task: () => void): void {
    this.taskQueue.push(task);
    if (!this.isRunning) {
      this.runTasks();
    }
  }

  /**
   * Schedule multiple tasks as a batch
   */
  scheduleBatch(tasks: Array<() => void>): void {
    this.taskQueue.push(...tasks);
    if (!this.isRunning) {
      this.runTasks();
    }
  }

  /**
   * Break a large task into smaller chunks
   */
  scheduleChunked<T>(
    items: T[],
    processor: (item: T) => void,
    chunkSize: number = 10
  ): Promise<void> {
    return new Promise((resolve) => {
      const chunks = this.chunkArray(items, chunkSize);
      let currentChunk = 0;

      const processNextChunk = () => {
        if (currentChunk >= chunks.length) {
          resolve();
          return;
        }

        const chunk = chunks[currentChunk++];
        this.schedule(() => {
          chunk.forEach(processor);
          processNextChunk();
        });
      };

      processNextChunk();
    });
  }

  private runTasks(): void {
    this.isRunning = true;
    
    const runTasksInFrame = () => {
      const startTime = performance.now();
      let tasksExecuted = 0;
      const maxTasksPerFrame = 3; // Limit tasks per frame for better FID
      
      while (
        this.taskQueue.length > 0 && 
        performance.now() - startTime < this.frameDeadline &&
        tasksExecuted < maxTasksPerFrame
      ) {
        const task = this.taskQueue.shift();
        if (task) {
          try {
            task();
            tasksExecuted++;
          } catch (error) {
            console.error('Task execution error:', error);
          }
        }
      }

      if (this.taskQueue.length > 0) {
        // Use scheduler.postTask if available for better FID
        if (window.scheduler?.postTask) {
          window.scheduler.postTask(runTasksInFrame, {
            priority: 'user-visible',
          });
        } else if (typeof MessageChannel !== 'undefined') {
          const channel = new MessageChannel();
          channel.port2.onmessage = () => runTasksInFrame();
          channel.port1.postMessage(null);
        } else {
          requestAnimationFrame(runTasksInFrame);
        }
      } else {
        this.isRunning = false;
      }
    };

    runTasksInFrame();
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Yield control back to the browser if we've been running too long
   */
  static async yieldToMain(): Promise<void> {
    return new Promise(resolve => {
      if (typeof MessageChannel !== 'undefined') {
        const channel = new MessageChannel();
        channel.port2.onmessage = () => resolve();
        channel.port1.postMessage(null);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }
}

// Global task scheduler instance
export const taskScheduler = new TaskScheduler();

/**
 * React hook for scheduling tasks without blocking the main thread
 */
export const useTaskScheduler = () => {
  return {
    schedule: taskScheduler.schedule.bind(taskScheduler),
    scheduleBatch: taskScheduler.scheduleBatch.bind(taskScheduler),
    scheduleChunked: taskScheduler.scheduleChunked.bind(taskScheduler),
    yieldToMain: TaskScheduler.yieldToMain,
  };
};

/**
 * Higher-order component to defer component mounting
 */
export function withDeferredMount<P extends object>(
  Component: React.ComponentType<P>,
  delay: number = 0
) {
  return function DeferredComponent(props: P) {
    const [shouldMount, setShouldMount] = React.useState(false);

    React.useEffect(() => {
      const timeoutId = setTimeout(() => {
        taskScheduler.schedule(() => setShouldMount(true));
      }, delay);

      return () => clearTimeout(timeoutId);
    }, []);

    if (!shouldMount) {
      return null;
    }

    return React.createElement(Component, props);
  };
}

export default TaskScheduler;