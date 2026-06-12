---
title: Incident Response Standard Operating Procedure
category: sops
description: Comprehensive incident response procedure covering detection, triage, mitigation, resolution, and post-mortem for production incidents
keywords: incident, response, triage, mitigation, post-mortem
---

# Incident Response Standard Operating Procedure

This document establishes the standard operating procedure for responding to production incidents. An incident is defined as any event that degrades the availability, integrity, or performance of a production service below its defined service level objective (SLO). The goal of this SOP is to minimize the time to detection, the time to mitigation, and the time to full resolution while maintaining clear communication with stakeholders.

## Severity Levels

Incidents are classified into four severity levels based on user impact:

- **SEV1 (Critical)**: Complete service outage or data loss affecting more than 25% of users. All hands response required. Target time to mitigation: 30 minutes.
- **SEV2 (Major)**: Significant degradation affecting 10-25% of users or a core feature is unavailable. On-call engineer and team lead respond. Target time to mitigation: 2 hours.
- **SEV3 (Minor)**: Limited impact affecting fewer than 10% of users or a non-core feature is degraded. On-call engineer responds during business hours. Target time to mitigation: 8 hours.
- **SEV4 (Low)**: Cosmetic issues or performance degradation within SLO thresholds. Logged and addressed in the next sprint.

## Incident Lifecycle

### Phase 1: Detection

Incidents may be detected through:

- **Automated Alerts**: Monitoring systems (Prometheus, Grafana, Datadog) trigger alerts based on threshold breaches. Alerts are routed to PagerDuty and the on-call engineer is paged.
- **User Reports**: Customer support escalates reports of widespread issues. The support team uses a severity assessment matrix to determine initial classification.
- **Engineer Observation**: An engineer notices anomalous behavior during routine work and escalates it.

Upon detection, the responder creates an incident record in the incident tracker with the following fields: description, severity, affected services, detection source, and timestamp.

### Phase 2: Triage

The incident commander (IC) is assigned based on severity:

- SEV1: Engineering lead or designated IC
- SEV2: Team lead of the affected service
- SEV3/SEV4: On-call engineer

The IC is responsible for:

1. Confirming the incident is real and not a false alarm.
2. Assigning the initial severity level.
3. Opening a dedicated incident Slack channel (#inc-YYYYMMDD-brief-description).
4. Assembling the response team by paging relevant on-call engineers.
5. Initiating stakeholder communication.

### Phase 3: Investigation

The response team investigates the root cause using the following approach:

1. **Check recent deployments**: Review the deployment log for changes in the last 4 hours. If a recent deployment correlates with the incident onset, evaluate rollback.
2. **Review metrics and logs**: Examine error rates, latency distributions, CPU/memory utilization, and application logs around the incident start time.
3. **Trace distributed requests**: Use distributed tracing (Jaeger, Zipkin) to identify where requests are failing or slowing down.
4. **Check dependencies**: Verify the health of external dependencies (databases, caches, third-party APIs). A dependency outage may manifest as a cascading failure.
5. **Reproduce if possible**: Attempt to reproduce the issue in a staging environment to confirm the root cause hypothesis.

All findings are documented in the incident channel in real-time so that team members joining later can get up to speed quickly.

### Phase 4: Mitigation

Mitigation aims to restore service as quickly as possible, even if the root cause is not fully understood. Approved mitigation strategies include:

- **Rollback**: Revert to the previous deployment version. This is the fastest mitigation for deployment-related incidents.
- **Feature Flag Disable**: Turn off the problematic feature via the feature flag service without redeploying.
- **Traffic Rerouting**: Shift traffic away from the affected region or service instance.
- **Scaling**: Increase the number of service instances or resource allocation if the incident is caused by capacity exhaustion.
- **Circuit Breaker**: Trip a circuit breaker to shed load on a failing dependency and serve degraded responses.
- **Database Failover**: Promote a read replica if the primary database is unresponsive.

The IC authorizes the mitigation action and the responsible engineer executes it. Stakeholders are updated once mitigation is confirmed effective.

### Phase 5: Resolution

After mitigation, the team works toward a permanent fix:

1. Develop and test the fix in a development environment.
2. Deploy the fix to staging and validate.
3. Follow the standard deployment SOP to push the fix to production.
4. Remove any temporary mitigations (re-enable feature flags, reset circuit breakers, reduce scaled-up instances).
5. Monitor for 24 hours to confirm the fix is stable and no regressions have occurred.

### Phase 6: Post-Mortem

A blameless post-mortem is conducted within 48 hours of incident resolution for all SEV1 and SEV2 incidents, and within one week for SEV3. The post-mortem document includes:

- **Incident Summary**: Timeline of events from detection to resolution.
- **Root Cause Analysis**: The technical root cause and any contributing factors.
- **Impact Assessment**: Duration of impact, number of affected users, and any data loss.
- **What Went Well**: Effective aspects of the response.
- **What Could Be Improved**: Gaps in detection, communication, or mitigation.
- **Action Items**: Specific, assigned, and time-bound tasks to prevent recurrence. Examples include adding monitoring alerts, hardening the deployment pipeline, or implementing additional safeguards.

Action items are tracked in the project management system and reviewed weekly until completion.

## Communication Templates

### Stakeholder Update (Initial)

> We are investigating reports of [brief description]. The incident has been classified as SEV[1-4]. The response team is actively working on mitigation. Next update in [15/30/60] minutes.

### Stakeholder Update (Mitigated)

> The incident affecting [brief description] has been mitigated as of [timestamp]. Services are recovering. We are monitoring for stability and working on a permanent fix.

### Stakeholder Update (Resolved)

> The incident affecting [brief description] has been fully resolved as of [timestamp]. A post-mortem will be published within [48 hours/1 week].

## On-Call Expectations

- Primary on-call engineers must be reachable within 5 minutes and able to start investigation within 15 minutes.
- On-call rotations are weekly, with handoff at 09:00 UTC on Mondays.
- On-call engineers must have access to all production systems, monitoring dashboards, and the incident management tool.
- If the on-call engineer cannot resolve a SEV1 within 30 minutes, they escalate to the secondary on-call and the engineering lead.
