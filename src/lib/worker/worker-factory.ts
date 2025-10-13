// lib/src/workers/worker-factory.ts
export class WorkerFactory {
	static createCodeRunnerWorker(): Worker {
		const workerCode = `
      // Complete worker implementation
      self.addEventListener('message', (event) => {
        const { id, code, functionName, args } = event.data;
        
        try {
          const startTime = Date.now();
          const logs = [];
          
          // Capture console outputs
          const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
          };
          
          console.log = (...args) => {
            logs.push({
              type: 'log',
              message: args.join(' '),
              timestamp: Date.now()
            });
          };
          
          console.error = (...args) => {
            logs.push({
              type: 'error', 
              message: args.join(' '),
              timestamp: Date.now()
            });
          };
          
          console.warn = (...args) => {
            logs.push({
              type: 'warn',
              message: args.join(' '), 
              timestamp: Date.now()
            });
          };
          
          // Execute the code
          const func = new Function('args', code);
          const result = func(args);
          
          // Restore console
          Object.assign(console, originalConsole);
          
          self.postMessage({
            id,
            success: true,
            result,
            logs,
            executionTime: Date.now() - startTime
          });
          
        } catch (error) {
          self.postMessage({
            id,
            success: false,
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack
            },
            logs,
            executionTime: Date.now() - startTime
          });
        }
      });
    `;

		const blob = new Blob([workerCode], { type: "application/javascript" });
		return new Worker(URL.createObjectURL(blob));
	}
}
