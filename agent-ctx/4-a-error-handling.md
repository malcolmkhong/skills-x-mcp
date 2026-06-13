# Task 4-a: Fix Error Handling in analytics.ts

## Summary
Wrapped all 6 exported functions in `/home/z/my-project/src/lib/analytics.ts` with try/catch blocks following the specified pattern.

## Changes Made
Each exported function now has its entire body wrapped in try/catch with:
- `console.error('[functionName]', error)` for logging
- `throw new Error(`Failed to functionName: ${error instanceof Error ? error.message : 'Unknown error'}`)` for re-throwing

## Functions Modified
1. **`trackEvent`** (void/sync-like) — wrapped function body in try/catch; existing `.catch()` on the async DB call preserved
2. **`getDashboardStats`** — entire body including `Promise.all` and subsequent `db.knowledge.findMany` wrapped
3. **`getMCPStats`** — entire body including `db.usageEvent.findMany` wrapped
4. **`getKnowledgeAnalytics`** — entire body including `db.knowledge.findMany`, `Promise.all`, and all processing wrapped
5. **`getTokenSavings`** — entire body including `Promise.all` wrapped
6. **`getUserGrowth`** — entire body including `Promise.all` wrapped

## What Was NOT Changed
- Function signatures and return types
- Business logic
- Imports and exports
- Type definitions and helper functions (not exported)
