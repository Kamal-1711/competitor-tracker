# Socket.io Integration Tests

This directory contains tests for the Socket.io realtime functionality.

## Test Structure

- **`integration/`** - Backend/API integration tests (using Vitest)
- **`ui/`** - Frontend UI tests (using Playwright)

## Running Tests

### Integration Tests

```bash
npm run test:integration
```

These tests verify:
- API crawl route returns expected JSON when socket server is down
- Change detection persists successfully when socket emit throws

### UI Tests

```bash
npm run test:ui
```

These tests verify:
- Changes page shows banner and prepends item on `high_impact_change` event
- Insights page calls `router.refresh()` on socket events without crashing

### All Tests

```bash
npm test
```

## Test Details

### Integration Tests

**`api-crawl-socket-failure.test.ts`**
- Verifies crawl API response structure when socket initialization fails
- Ensures socket failures don't break core crawl functionality

**`change-detection-socket-failure.test.ts`**
- Verifies change persistence succeeds when socket emit throws
- Ensures socket failures don't break change detection

### UI Tests

**`changes-page-realtime.spec.tsx`**
- Tests banner appearance on `high_impact_change` event
- Verifies new items are prepended to feed
- Tests banner auto-hide after 5 seconds
- Tests handling of rapid events

**`insights-page-realtime.spec.tsx`**
- Tests `router.refresh()` is called on socket events
- Verifies no crashes occur during event handling
- Tests graceful handling of connection failures

## Prerequisites

- Node.js 18+
- Socket.io server running (for UI tests)
- Next.js dev server (for UI tests)

## Environment Variables

For UI tests, ensure:
- `NEXT_PUBLIC_BACKEND_URL` is set to your socket server URL
- Socket server is running on the configured port

## Notes

- Integration tests use mocks to simulate socket failures
- UI tests require a running socket server (started automatically in test setup)
- Tests are designed to be isolated and not depend on external services
