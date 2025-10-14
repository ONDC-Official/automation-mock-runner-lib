/**
 * Real browser testing setup using Playwright
 * This file demonstrates how to test the BrowserRunner in actual browsers
 *
 * To use this:
 * 1. npm install --save-dev @playwright/test playwright
 * 2. Create browser-test.spec.ts in a separate e2e directory
 * 3. Run: npx playwright test
 */

// This would be in e2e/browser-test.spec.ts
/*
import { test, expect } from '@playwright/test';

test.describe('MockRunner in Real Browser', () => {
  test('should work with BrowserRunner in Chrome', async ({ page }) => {
    // Serve your library bundle and create a test page
    await page.goto('/test-page.html');
    
    // Inject your library
    await page.addScriptTag({ 
      path: './dist/index.js' 
    });
    
    // Test BrowserRunner functionality
    const result = await page.evaluate(async () => {
      const { MockRunner } = window.MockRunnerLib;
      
      const config = {
        // Your test configuration
      };
      
      const runner = new MockRunner(config);
      return await runner.runGeneratePayload('test_action', {});
    });
    
    expect(result.success).toBe(true);
  });
});
*/

// Alternative: Create a simple HTML test page
const createTestPage = () => `
<!DOCTYPE html>
<html>
<head>
    <title>MockRunner Browser Test</title>
</head>
<body>
    <script src="./dist/bundle.js"></script>
    <script>
        async function testBrowserRunner() {
            try {
                const { MockRunner } = window.MockRunnerLib;
                
                const config = {
                    meta: {
                        domain: "ONDC:RET11",
                        version: "1.2.0",
                        flowId: "browser-test"
                    },
                    transaction_data: {
                        transaction_id: "test-id",
                        latest_timestamp: new Date().toISOString()
                    },
                    steps: [{
                        api: "search",
                        action_id: "test_search",
                        owner: "BAP",
                        responseFor: null,
                        unsolicited: false,
                        description: "Test search",
                        mock: {
                            generate: btoa(\`
                                async function generate(defaultPayload, sessionData) {
                                    defaultPayload.message = { test: 'browser' };
                                    return defaultPayload;
                                }
                            \`),
                            validate: btoa(\`
                                function validate(targetPayload, sessionData) {
                                    return { valid: true, code: 200, description: 'OK' };
                                }
                            \`),
                            requirements: btoa(\`
                                function meetsRequirements(sessionData) {
                                    return { valid: true, code: 200, description: 'OK' };
                                }
                            \`),
                            defaultPayload: {},
                            saveData: {},
                            inputs: {}
                        }
                    }],
                    transaction_history: [],
                    validationLib: "",
                    helperLib: ""
                };
                
                const runner = new MockRunner(config);
                const result = await runner.runGeneratePayload('test_search', {});
                
                console.log('Browser test result:', result);
                document.body.innerHTML = \`
                    <h1>MockRunner Browser Test</h1>
                    <h2>Result: \${result.success ? 'PASS' : 'FAIL'}</h2>
                    <pre>\${JSON.stringify(result, null, 2)}</pre>
                \`;
                
                return result;
            } catch (error) {
                console.error('Browser test failed:', error);
                document.body.innerHTML = \`
                    <h1>MockRunner Browser Test</h1>
                    <h2>Result: FAIL</h2>
                    <pre>Error: \${error.message}</pre>
                \`;
            }
        }
        
        window.addEventListener('load', testBrowserRunner);
    </script>
</body>
</html>
`;

export { createTestPage };
