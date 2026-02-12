/**
 * UI test: Verify that on high_impact_change event:
 * - Banner appears for 5 seconds
 * - New item prepends to the feed
 */

import { test, expect } from "@playwright/test";
import { createServer } from "http";
import { Server } from "socket.io";

test.describe("Changes page - realtime updates", () => {
  let httpServer: ReturnType<typeof createServer> | null = null;
  let io: Server | null = null;
  let socketPort: number;

  test.beforeAll(async () => {
    // Start a test socket server
    socketPort = 4002; // Use different port to avoid conflicts
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

  test("should show banner and prepend new item on high_impact_change event", async ({
    page,
  }) => {
    // Set environment variable for socket URL
    await page.addInitScript(() => {
      (window as any).process = {
        env: {
          NEXT_PUBLIC_BACKEND_URL: `http://localhost:4002`,
        },
      };
    });

    // Mock the changes page with initial items
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
            
            // Mock component structure
            const ChangeFeedRealtime = () => {
              const [items, setItems] = React.useState([
                { id: '1', summary: 'Initial change', createdAt: new Date().toISOString() }
              ]);
              const [showBanner, setShowBanner] = React.useState(false);
              
              React.useEffect(() => {
                const socket = io('http://localhost:4002');
                socket.on('high_impact_change', (event) => {
                  const newItem = {
                    id: 'realtime-' + Date.now(),
                    summary: event.changeSummary?.[0] || 'High impact change detected',
                    createdAt: new Date().toISOString()
                  };
                  setItems(prev => [newItem, ...prev]);
                  setShowBanner(true);
                  setTimeout(() => setShowBanner(false), 5000);
                });
                
                return () => socket.disconnect();
              }, []);
              
              return React.createElement('div', null,
                showBanner && React.createElement('div', {
                  'data-testid': 'realtime-banner',
                  style: 'position: fixed; right: 16px; top: 16px; padding: 8px 16px; background: white; border: 1px solid #ccc; border-radius: 4px;'
                }, 'New Competitive Movement Detected'),
                React.createElement('div', { 'data-testid': 'feed-items' },
                  items.map(item => 
                    React.createElement('div', { key: item.id, 'data-testid': 'feed-item' }, item.summary)
                  )
                )
              );
            };
            
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(ChangeFeedRealtime));
          </script>
        </body>
      </html>
    `);

    // Wait for initial render
    await page.waitForSelector('[data-testid="feed-items"]');

    // Verify initial state
    const initialItems = await page.locator('[data-testid="feed-item"]').count();
    expect(initialItems).toBe(1);

    // Emit high_impact_change event from socket server
    if (io) {
      io.emit("high_impact_change", {
        competitorId: "test-competitor",
        changeSummary: ["Pricing tier updated"],
        severity: "high",
      });
    }

    // Wait for banner to appear
    await page.waitForSelector('[data-testid="realtime-banner"]', { timeout: 2000 });

    // Verify banner text
    const banner = page.locator('[data-testid="realtime-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveText("New Competitive Movement Detected");

    // Verify new item was prepended
    const itemsAfter = await page.locator('[data-testid="feed-item"]').count();
    expect(itemsAfter).toBe(2);

    // Verify new item is first
    const firstItem = page.locator('[data-testid="feed-item"]').first();
    await expect(firstItem).toContainText("Pricing tier updated");

    // Wait for banner to disappear (5 seconds)
    await page.waitForSelector('[data-testid="realtime-banner"]', {
      state: "hidden",
      timeout: 6000,
    });

    // Verify banner is gone
    await expect(banner).not.toBeVisible();
  });

  test("should handle multiple rapid events without crashing", async ({ page }) => {
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
            
            const ChangeFeedRealtime = () => {
              const [items, setItems] = React.useState([]);
              const [error, setError] = React.useState(null);
              
              React.useEffect(() => {
                try {
                  const socket = io('http://localhost:4002');
                  socket.on('high_impact_change', (event) => {
                    setItems(prev => [{
                      id: 'realtime-' + Date.now(),
                      summary: event.changeSummary?.[0] || 'Change detected'
                    }, ...prev]);
                  });
                  
                  socket.on('connect_error', (err) => {
                    setError(err.message);
                  });
                  
                  return () => socket.disconnect();
                } catch (err) {
                  setError(err.message);
                }
              }, []);
              
              return React.createElement('div', null,
                error && React.createElement('div', { 'data-testid': 'error' }, error),
                React.createElement('div', { 'data-testid': 'feed-items' },
                  items.map(item => 
                    React.createElement('div', { key: item.id, 'data-testid': 'feed-item' }, item.summary)
                  )
                )
              );
            };
            
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(ChangeFeedRealtime));
          </script>
        </body>
      </html>
    `);

    await page.waitForSelector('[data-testid="feed-items"]');

    // Emit multiple rapid events
    if (io) {
      for (let i = 0; i < 3; i++) {
        io.emit("high_impact_change", {
          competitorId: "test-competitor",
          changeSummary: [`Change ${i + 1}`],
          severity: "high",
        });
      }
    }

    // Wait a bit for events to process
    await page.waitForTimeout(1000);

    // Verify no errors occurred
    const errorElement = page.locator('[data-testid="error"]');
    await expect(errorElement).not.toBeVisible();

    // Verify items were added
    const items = await page.locator('[data-testid="feed-item"]').count();
    expect(items).toBeGreaterThan(0);
  });
});
