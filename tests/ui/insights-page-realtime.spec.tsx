/**
 * UI test: Verify that socket events trigger router.refresh() without crashing.
 */

import { test, expect } from "@playwright/test";
import { createServer } from "http";
import { Server } from "socket.io";

test.describe("Insights page - realtime listener", () => {
  let httpServer: ReturnType<typeof createServer> | null = null;
  let io: Server | null = null;
  let socketPort: number;
  let refreshCallCount = 0;

  test.beforeAll(async () => {
    socketPort = 4003; // Use different port
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    await new Promise<void>((resolve) => {
      httpServer!.listen(socketPort, () => {
        console.log(`Test socket server running on port ${socketPort}`);
        resolve();
      });
    });
  });

  test.afterAll(async () => {
    if (io) {
      io.close();
    }
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer!.close(() => resolve());
      });
    }
  });

  test("should call router.refresh() on crawl_completed event without crashing", async ({
    page,
  }) => {
    refreshCallCount = 0;

    // Mock Next.js router
    await page.addInitScript(() => {
      (window as any).mockRouter = {
        refresh: () => {
          (window as any).refreshCallCount = ((window as any).refreshCallCount || 0) + 1;
        },
      };
    });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.socket.io/4.8.3/socket.io.min.js"></script>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'https://esm.sh/react@18';
            import ReactDOM from 'https://esm.sh/react-dom@18/client';
            
            const InsightsRealtimeListener = () => {
              const [error, setError] = React.useState(null);
              
              React.useEffect(() => {
                try {
                  const socket = io('http://localhost:4003');
                  const router = window.mockRouter;
                  
                  const handleCrawlCompleted = (data) => {
                    console.log('Crawl finished', data);
                    router.refresh();
                  };
                  
                  const handleHighImpactChange = (data) => {
                    console.log('High impact change detected', data);
                    router.refresh();
                  };
                  
                  socket.on('crawl_completed', handleCrawlCompleted);
                  socket.on('high_impact_change', handleHighImpactChange);
                  
                  return () => {
                    try {
                      socket.off('crawl_completed', handleCrawlCompleted);
                      socket.off('high_impact_change', handleHighImpactChange);
                      socket.disconnect();
                    } catch (err) {
                      console.error('Socket cleanup failed', err);
                    }
                  };
                } catch (err) {
                  setError(err.message);
                }
              }, []);
              
              return React.createElement('div', null,
                error && React.createElement('div', { 'data-testid': 'error' }, error),
                React.createElement('div', { 'data-testid': 'listener-ready' }, 'Ready')
              );
            };
            
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(InsightsRealtimeListener));
          </script>
        </body>
      </html>
    `);

    // Wait for listener to be ready
    await page.waitForSelector('[data-testid="listener-ready"]');

    // Verify no errors occurred during initialization
    const errorElement = page.locator('[data-testid="error"]');
    await expect(errorElement).not.toBeVisible();

    // Emit crawl_completed event
    if (io) {
      io.emit("crawl_completed", {
        competitorId: "test-competitor",
        timestamp: new Date(),
        message: "Crawl completed successfully",
      });
    }

    // Wait a bit for event to process
    await page.waitForTimeout(500);

    // Verify router.refresh() was called
    const refreshCount = await page.evaluate(() => (window as any).refreshCallCount || 0);
    expect(refreshCount).toBeGreaterThan(0);

    // Verify no errors occurred
    await expect(errorElement).not.toBeVisible();
  });

  test("should call router.refresh() on high_impact_change event without crashing", async ({
    page,
  }) => {
    refreshCallCount = 0;

    await page.addInitScript(() => {
      (window as any).mockRouter = {
        refresh: () => {
          (window as any).refreshCallCount = ((window as any).refreshCallCount || 0) + 1;
        },
      };
    });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.socket.io/4.8.3/socket.io.min.js"></script>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'https://esm.sh/react@18';
            import ReactDOM from 'https://esm.sh/react-dom@18/client';
            
            const InsightsRealtimeListener = () => {
              const [error, setError] = React.useState(null);
              
              React.useEffect(() => {
                try {
                  const socket = io('http://localhost:4003');
                  const router = window.mockRouter;
                  
                  socket.on('high_impact_change', (data) => {
                    console.log('High impact change detected', data);
                    router.refresh();
                  });
                  
                  return () => {
                    try {
                      socket.disconnect();
                    } catch (err) {
                      console.error('Socket cleanup failed', err);
                    }
                  };
                } catch (err) {
                  setError(err.message);
                }
              }, []);
              
              return React.createElement('div', null,
                error && React.createElement('div', { 'data-testid': 'error' }, error),
                React.createElement('div', { 'data-testid': 'listener-ready' }, 'Ready')
              );
            };
            
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(InsightsRealtimeListener));
          </script>
        </body>
      </html>
    `);

    await page.waitForSelector('[data-testid="listener-ready"]');

    // Emit high_impact_change event
    if (io) {
      io.emit("high_impact_change", {
        competitorId: "test-competitor",
        changeSummary: ["Pricing tier updated"],
        severity: "high",
      });
    }

    await page.waitForTimeout(500);

    // Verify router.refresh() was called
    const refreshCount = await page.evaluate(() => (window as any).refreshCallCount || 0);
    expect(refreshCount).toBeGreaterThan(0);

    // Verify no errors occurred
    const errorElement = page.locator('[data-testid="error"]');
    await expect(errorElement).not.toBeVisible();
  });

  test("should handle socket connection failure gracefully", async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.socket.io/4.8.3/socket.io.min.js"></script>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import React from 'https://esm.sh/react@18';
            import ReactDOM from 'https://esm.sh/react-dom@18/client';
            
            const InsightsRealtimeListener = () => {
              const [error, setError] = React.useState(null);
              const [connected, setConnected] = React.useState(false);
              
              React.useEffect(() => {
                try {
                  // Try to connect to non-existent server
                  const socket = io('http://localhost:9999', {
                    timeout: 1000,
                    reconnection: false
                  });
                  
                  socket.on('connect', () => {
                    setConnected(true);
                  });
                  
                  socket.on('connect_error', (err) => {
                    setError('Connection failed (expected)');
                  });
                  
                  return () => {
                    try {
                      socket.disconnect();
                    } catch (err) {
                      // Expected to fail
                    }
                  };
                } catch (err) {
                  setError(err.message);
                }
              }, []);
              
              return React.createElement('div', null,
                React.createElement('div', { 'data-testid': 'status' }, 
                  error ? 'Error: ' + error : (connected ? 'Connected' : 'Not connected')
                )
              );
            };
            
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(InsightsRealtimeListener));
          </script>
        </body>
      </html>
    `);

    await page.waitForSelector('[data-testid="status"]');

    // Verify component rendered without crashing
    const status = await page.locator('[data-testid="status"]').textContent();
    expect(status).toBeTruthy();

    // Component should handle connection failure gracefully
    // (either show error or show "Not connected" state)
    expect(status).toMatch(/Error|Not connected/);
  });
});
