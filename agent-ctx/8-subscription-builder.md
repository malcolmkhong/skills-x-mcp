# Task 8: Subscription Plan Management System

## Agent: subscription-builder

## Summary
Built the complete subscription plan management system with service layer and 3 API routes.

## Files Created
1. `/src/lib/subscriptions.ts` — Subscription service layer (8 functions + PLAN_FEATURES constant + 7 TypeScript interfaces)
2. `/src/app/api/plans/route.ts` — GET endpoint for listing all available plans (public)
3. `/src/app/api/plans/current/route.ts` — GET endpoint for user's current plan & usage (auth required)
4. `/src/app/api/plans/upgrade/route.ts` — POST endpoint for plan upgrade/downgrade (auth required)

## Files Modified
1. `/src/lib/seed.ts` — Updated plan values to match spec (Pro $30/mo, 5K knowledge; Ultra $100/mo, 50 keys, 50K knowledge; etc.) + upsert logic
2. `/src/middleware.ts` — Added EXACT_PUBLIC_ROUTES for /api/plans public access

## Key Design Decisions
- User.plan field uses simplified names (free, pro, ultra, enterprise) while SubscriptionPlan uses granular names (pro_monthly, pro_yearly)
- `userPlanToSubscriptionPlan()` maps between the two (pro → pro_monthly by default)
- Unlimited limits stored as -1 in DB, handled with Infinity internally and -1 in responses
- Plans listing is public (so users can see pricing before auth), but current plan and upgrades require auth
- No Stripe integration yet — plan changes update User.plan directly in DB with a 30-day currentPeriodEnd for non-free plans
- checkUserLimit counts actual DB records for each limit type (usage events for apiRequests, active API keys, knowledge units, workspace members, workspaces)

## Verification
- Lint passes with no errors
- Database re-seeded with updated plan values
- GET /api/plans returns full plan list with features, comparison matrix
- GET /api/plans/current and POST /api/plans/upgrade require authentication (return 401 unauthenticated)
