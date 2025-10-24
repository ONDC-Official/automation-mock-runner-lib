// lib/src/workers/worker-factory.ts
export class WorkerFactory {
	static createCodeRunnerWorker(): Worker {
		const workerCode = `
      // Complete worker implementation for handling async functions properly
      self.addEventListener('message', async (event) => {
        const { id, code, functionName, args } = event.data;
        const startTime = performance.now();
        let logs = [];
          // Capture console outputs
          const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
          };
        try {
          console.log = (...logArgs) => {
            logs.push({
              type: 'log',
              message: logArgs.join(' '),
              timestamp: Date.now()
            });
            originalConsole.log(...logArgs);
          };
          
          console.error = (...logArgs) => {
            logs.push({
              type: 'error', 
              message: logArgs.join(' '),
              timestamp: Date.now()
            });
            originalConsole.error(...logArgs);
          };
          
          console.warn = (...logArgs) => {
            logs.push({
              type: 'warn',
              message: logArgs.join(' '), 
              timestamp: Date.now()
            });
            originalConsole.warn(...logArgs);
          };
          
          // Create a safe execution context
          const context = {
            console,
            Math,
            Date,
            JSON,
            String,
            Number,
            Boolean,
            Array,
            Object,
            Promise,
            setTimeout,
            clearTimeout,
            // Block dangerous globals
            eval: undefined,
            Function: undefined,
            require: undefined,
            process: undefined,
            global: undefined,
            globalThis: undefined
          };
          
          // Execute the function code to define the function
          const func = new Function(...Object.keys(context), code + '; return ' + functionName);
          const userFunction = func(...Object.values(context));
          
          if (typeof userFunction !== 'function') {
            throw new Error(\`\${functionName} is not a function\`);
          }
          
          // Execute the user function with proper arguments and handle async
          let result = userFunction(...args);
          
          // If result is a promise, await it
          if (result && typeof result.then === 'function') {
            result = await result;
          }
          
          // Restore console
          Object.assign(console, originalConsole);
          
          self.postMessage({
            id,
            success: true,
            result,
            logs,
            executionTime: performance.now() - startTime
          });
          
        } catch (error) {
          // Restore console in case of error
          if (typeof console !== 'undefined' && originalConsole) {
            Object.assign(console, originalConsole);
          }
          
          self.postMessage({
            id,
            success: false,
            error: {
              message: error.message || 'Unknown error',
              name: error.name || 'Error',
              stack: error.stack
            },
            logs,
            executionTime: performance.now() - startTime
          });
        }
      });
    `;

		const blob = new Blob([workerCode], { type: "application/javascript" });
		return new Worker(URL.createObjectURL(blob));
	}
}
