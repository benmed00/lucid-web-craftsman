import React from 'react';

/**
 * Input Responsiveness Optimizer
 * Specifically targets Max Potential FID by ensuring no task runs longer than 50ms
 */

interface YieldOptions {
  timeout?: number;
  priority?: 'background' | 'user-blocking' | 'user-visible';
}

class InputResponsivenessOptimizer {
  private taskStartTime = 0;
  private readonly MAX_TASK_TIME = 45; // Stay well under 50ms threshold
  private isYielding = false;

  /**
   * Check if we should yield to allow input processing
   */
  shouldYield(): boolean {
    if (this.isYielding) return false;

    const elapsed = performance.now() - this.taskStartTime;
    return elapsed >= this.MAX_TASK_TIME;
  }

  /**
   * Start tracking a task's execution time
   */
  startTask(): void {
    this.taskStartTime = performance.now();
  }

  /**
   * Yield control back to browser with optimal scheduling
   */
  async yieldToMain(options: YieldOptions = {}): Promise<void> {
    if (this.isYielding) return;

    this.isYielding = true;

    return new Promise<void>((resolve) => {
      // Use scheduler.postTask if available (Chrome 94+)
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        const priority = options.priority || 'user-visible';
        (window as any).scheduler.postTask(
          () => {
            this.isYielding = false;
            this.startTask();
            resolve();
          },
          { priority }
        );
        return;
      }

      // Use MessageChannel for fastest yielding
      if (typeof MessageChannel !== 'undefined') {
        const channel = new MessageChannel();
        channel.port2.onmessage = () => {
          this.isYielding = false;
          this.startTask();
          resolve();
        };
        channel.port1.postMessage(null);
        return;
      }

      // Fallback to requestAnimationFrame
      requestAnimationFrame(() => {
        this.isYielding = false;
        this.startTask();
        resolve();
      });
    });
  }

  /**
   * Process array in chunks with yielding to prevent long tasks
   */
  async processArrayInChunks<T, R>(
    array: T[],
    processor: (item: T, index: number) => R,
    chunkSize: number = 10
  ): Promise<R[]> {
    const results: R[] = [];

    this.startTask();

    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);

      // Process chunk
      const chunkResults = chunk.map((item, index) =>
        processor(item, i + index)
      );
      results.push(...chunkResults);

      // Yield if we've been running too long or have more work
      if (this.shouldYield() && i + chunkSize < array.length) {
        await this.yieldToMain({ priority: 'user-visible' });
      }
    }

    return results;
  }

  /**
   * Execute function with automatic yielding
   */
  async executeWithYielding<T>(
    fn: () => T | Promise<T>,
    options: YieldOptions = {}
  ): Promise<T> {
    this.startTask();

    // If it's an async function, we can't control yielding inside it
    if (fn.constructor.name === 'AsyncFunction') {
      return await fn();
    }

    // For sync functions, wrap execution
    const result = fn();

    // Yield after execution if it took too long
    if (this.shouldYield()) {
      await this.yieldToMain(options);
    }

    return result;
  }

  /**
   * Defer execution until browser is idle
   */
  scheduleWhenIdle<T>(
    fn: () => T,
    options: { timeout?: number } = {}
  ): Promise<T> {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(fn()), {
          timeout: options.timeout || 5000,
        });
      } else {
        // Fallback: use timeout with yielding
        setTimeout(async () => {
          await this.yieldToMain({ priority: 'background' });
          resolve(fn());
        }, 0);
      }
    });
  }

  /**
   * Optimize React component rendering to prevent long tasks
   */
  createOptimizedRenderer<P extends object>(
    Component: React.ComponentType<P>
  ): React.ComponentType<P> {
    const OptimizedComponent = React.memo((props: P) => {
      const [renderReady, setRenderReady] = React.useState(false);

      React.useEffect(() => {
        // Defer initial render to prevent blocking input
        this.scheduleWhenIdle(() => {
          setRenderReady(true);
        });
      }, []);

      if (!renderReady) {
        // Return minimal placeholder to prevent layout shift
        return React.createElement('div', {
          style: { minHeight: '20px' },
          'aria-label': 'Loading content',
        });
      }

      return React.createElement(Component, props);
    });

    return OptimizedComponent as React.ComponentType<P>;
  }
}

// Global instance for FID optimization
export const inputResponsivenessOptimizer = new InputResponsivenessOptimizer();

/**
 * React hook for FID-optimized operations
 */
export const useInputResponsiveness = () => {
  const processArrayInChunks =
    inputResponsivenessOptimizer.processArrayInChunks.bind(
      inputResponsivenessOptimizer
    );
  const executeWithYielding =
    inputResponsivenessOptimizer.executeWithYielding.bind(
      inputResponsivenessOptimizer
    );
  const scheduleWhenIdle = inputResponsivenessOptimizer.scheduleWhenIdle.bind(
    inputResponsivenessOptimizer
  );
  const yieldToMain = inputResponsivenessOptimizer.yieldToMain.bind(
    inputResponsivenessOptimizer
  );

  return {
    processArrayInChunks,
    executeWithYielding,
    scheduleWhenIdle,
    yieldToMain,
  };
};

/**
 * Higher-order component for FID optimization
 */
export const withInputResponsiveness = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return inputResponsivenessOptimizer.createOptimizedRenderer(Component);
};

export default InputResponsivenessOptimizer;
