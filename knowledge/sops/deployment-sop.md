---
title: Deployment Standard Operating Procedure
category: sops
description: Step-by-step standard operating procedure for deploying services to production environments with rollback procedures and verification checks
keywords: deployment, release, rollback, production, verification
---

# Deployment Standard Operating Procedure

This document defines the standard operating procedure for deploying application services to production environments. All deployments must follow this procedure to ensure consistency, traceability, and the ability to rapidly roll back in case of failure. Deviations from this SOP require written approval from the engineering lead and must be documented in the incident tracker.

## Pre-Deployment Checklist

Before initiating any production deployment, the following conditions must be met:

1. **Code Review**: All changes have been reviewed and approved by at least one team member other than the author. Critical path changes require two approvals.
2. **Testing**: All automated tests pass in the CI pipeline, including unit tests, integration tests, and end-to-end tests. Test coverage for the changed modules must not decrease.
3. **Staging Validation**: The build has been deployed to the staging environment and validated by the QA team. Staging must mirror production configuration including environment variables, feature flags, and database schema.
4. **Database Migrations**: All pending migrations have been reviewed for backward compatibility. Destructive migrations (column drops, table renames) must be split into a two-phase deployment as described in the Migration section below.
5. **Feature Flags**: New features are wrapped in feature flags that default to disabled. This allows deployment without user-facing changes and enables gradual rollout.
6. **Monitoring Readiness**: Dashboards and alert thresholds have been updated to reflect any new metrics or changed service level indicators.
7. **Rollback Plan**: A documented rollback plan exists, including the specific git commit hash to roll back to and any manual steps required.

## Deployment Process

### Step 1: Create Release Tag

Create an annotated git tag from the main branch:

```bash
git tag -a v1.4.2 -m "Release v1.4.2: Add trading system and cloud save"
git push origin v1.4.2
```

The tag triggers the CI/CD pipeline to build the production artifact and publish it to the container registry.

### Step 2: Notify Stakeholders

Post a deployment notification to the #deployments Slack channel at least 30 minutes before the planned deployment window. Include the release version, expected duration, affected services, and the rollback commit hash.

### Step 3: Enable Maintenance Mode

If the deployment requires downtime (e.g., database schema changes), enable maintenance mode via the feature flag service. This serves a static holding page to users while the deployment proceeds.

### Step 4: Execute Database Migrations

Run migrations in the following order:

1. **Non-destructive migrations** (add columns, add tables, add indexes): Apply these before deploying the new code. The current production code must be compatible with these changes.
2. **Deploy new code**: The new code can now use the new schema.
3. **Destructive migrations** (drop columns, drop tables): Apply these in a subsequent deployment after confirming the old code no longer references the removed schema elements. Never combine destructive migrations with code deployment in the same release.

### Step 5: Deploy to Production

Use the blue-green deployment strategy:

1. Deploy the new version to the inactive (green) environment.
2. Run automated smoke tests against the green environment.
3. Switch the load balancer to route traffic to the green environment.
4. Monitor error rates, latency, and key business metrics for 15 minutes.
5. If all metrics are healthy, the deployment is complete. The previous (blue) environment remains available for rollback.

### Step 6: Post-Deployment Verification

After the deployment is live, perform the following checks:

- Verify health check endpoints return 200 on all service instances.
- Confirm error rates are within baseline (less than 0.1% increase).
- Check that key user flows (login, core gameplay, save, trade) are functional.
- Review application logs for new warning or error patterns.
- Verify that scheduled jobs and background workers are processing normally.

### Step 7: Close Deployment

Post a completion notification to the #deployments channel. Update the release log in the project wiki with the version, deployment timestamp, and any notes.

## Rollback Procedure

If the post-deployment verification fails:

1. Switch the load balancer back to the blue (previous) environment.
2. Verify the previous version is serving traffic correctly.
3. If a database migration was applied, assess whether a migration rollback is needed. Non-destructive migrations are generally safe to leave in place. Destructive migrations require a restore from backup or a compensating migration.
4. Notify the team in the #incidents channel and create a post-mortem ticket.
5. Do not attempt a re-deploy until the root cause is identified and fixed.

## Emergency Deployment

For critical security patches or service-restoring hotfixes:

1. The 30-minute notification window is waived. Notify the #incidents channel immediately.
2. A single reviewer approval is sufficient for the PR.
3. The staging validation step may be abbreviated to smoke tests only with QA lead approval.
4. All other steps in this SOP remain mandatory, including the rollback plan.

## Deployment Windows

Regular deployments occur during the following windows:

- **Primary**: Tuesday and Thursday, 10:00-12:00 UTC
- **Secondary**: Monday and Wednesday, 14:00-16:00 UTC
- **Emergency**: Any time with incident commander approval

No deployments on Fridays, weekends, or the day before a major event without VP-level approval.
