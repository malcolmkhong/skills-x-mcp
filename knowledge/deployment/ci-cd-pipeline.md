---
title: CI/CD Pipeline Setup
category: deployment
description: Comprehensive guide for setting up the CI/CD pipeline including build stages, testing strategies, deployment automation, and quality gates
keywords: CI/CD, pipeline, automation, testing, deployment
---

# CI/CD Pipeline Setup

This document defines the Continuous Integration and Continuous Delivery pipeline for IndustryX. The pipeline automates the build, test, security scan, and deployment processes, ensuring that every code change is validated, integrated, and delivered safely. The pipeline is designed to provide fast feedback to developers (under 10 minutes for CI), enforce quality gates, and enable safe deployments to production with minimal manual intervention.

## Pipeline Architecture

The CI/CD pipeline is implemented using GitHub Actions with self-hosted runners for build jobs and cloud-hosted runners for lightweight operations. The pipeline is organized into the following stages:

```
[Code Push] --> [CI Stage] --> [Artifact Stage] --> [CD Stage] --> [Production]
                    |                |                   |
              Build & Test      Container Build      Deploy & Verify
              Lint & Security   Publish & Tag        Monitor & Rollback
```

### Trigger Conditions

| Event | Pipeline | Stages |
|-------|----------|--------|
| Push to feature branch | CI only | Build, Test, Lint |
| Pull Request to main | CI + Preview | Build, Test, Lint, Preview Deploy |
| Merge to main | Full Pipeline | Build, Test, Lint, Artifact, Deploy to Staging |
| Git tag (v*) | Release Pipeline | Build, Test, Lint, Artifact, Deploy to Production |
| Manual trigger | Full Pipeline | All stages with manual approval gates |

## CI Stage

### Build

Each service is built independently using its language-specific build tool:

- **TypeScript/Node.js**: `bun install && bun run build` with TypeScript strict mode and incremental compilation.
- **Go**: `go build -trimpath -ldflags="-s -w"` with module verification.
- **Rust**: `cargo build --release` with dependency caching.

Build artifacts are cached using GitHub Actions cache with a key derived from the lockfile hash. Cache hits reduce build times by 60-70%.

### Lint and Format

- **ESLint**: TypeScript and JavaScript files are linted with the project's shared ESLint configuration. Warnings are treated as errors in CI.
- **Prettier**: Format check runs on all supported file types. Unformatted code fails the pipeline.
- **Go Vet / Clippy**: Go and Rust services run their respective static analysis tools with warning-as-error flags.
- **Actionlint**: GitHub Actions workflow files are validated to prevent misconfigured pipelines.

Lint results are posted as inline PR comments using reviewdog, making it easy for developers to identify and fix issues.

### Unit Tests

- **Test Runner**: Vitest for TypeScript, `go test` for Go, `cargo test` for Rust.
- **Coverage**: Minimum coverage thresholds are enforced per service (80% for critical services, 70% for others). Coverage reports are uploaded to Codecov.
- **Parallelism**: Tests are split across multiple runners using a timing-based partitioning strategy. Each runner receives an approximately equal share of test time.
- **Timeout**: Individual test timeout is 30 seconds. Test suites exceeding 5 minutes are flagged for optimization.

### Integration Tests

Integration tests run against ephemeral environments created using Docker Compose:

1. A Docker Compose file defines the service under test and its dependencies (databases, caches, message queues).
2. The pipeline starts the Compose stack, waits for health checks to pass, and runs the integration test suite.
3. After tests complete, the stack is torn down and resources are cleaned up.

Integration tests are tagged separately from unit tests (`@integration`) and run only on PRs and merges to main to reduce CI time on feature branches.

### Security Scanning

- **SAST (Static Application Security Testing)**: CodeQL scans run on every PR. Findings are categorized by severity and blocking for critical and high-severity issues.
- **Dependency Scanning**: Dependabot and Snyk monitor dependencies for known vulnerabilities. Critical CVEs block the pipeline; medium and low CVEs generate advisory tickets.
- **Secret Detection**: Gitleaks scans the repository for accidentally committed secrets (API keys, passwords, tokens). Detected secrets trigger an immediate pipeline failure and a security incident.
- **Container Scanning**: Built container images are scanned with Trivy for OS and library vulnerabilities before being published to the registry.

## Artifact Stage

### Container Build

Each service has a multi-stage Dockerfile optimized for minimal image size:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Key practices:
- Multi-stage builds separate build dependencies from runtime dependencies, reducing image size by 60-80%.
- Images are built for `linux/amd64` and `linux/arm64` using Docker buildx for cross-platform compatibility.
- Build timestamps and git commit hashes are embedded as image labels for traceability.

### Publish

- Built images are tagged with the git SHA (short), the branch name, and the semantic version (for release builds).
- Images are pushed to the GitHub Container Registry (ghcr.io) with the organization namespace.
- Image signing is performed using Cosign with the pipeline's keyless signing identity. Signed images are verified before deployment.

### Release Notes

For tagged releases, the pipeline auto-generates release notes by:
1. Collecting all merged PRs since the last release tag.
2. Categorizing PRs by label: `feature`, `bugfix`, `security`, `chore`.
3. Generating a markdown release note document using a template.
4. Creating a GitHub Release with the generated notes and attached build artifacts.

## CD Stage

### Staging Deployment

Every merge to main automatically deploys to the staging environment:

1. The pipeline updates the Kubernetes deployment manifest with the new image tag.
2. ArgoCD detects the manifest change and syncs the staging namespace.
3. The deployment uses a rolling update strategy with a max unavailable of 25% and a max surge of 25%.
4. Post-deploy smoke tests verify critical endpoints return expected responses.
5. Integration test results from the CI stage are cross-referenced to confirm no regressions.

### Production Deployment

Production deployments are triggered by git tags and require manual approval:

1. The pipeline presents a deployment summary including: version, changes since last release, test results, security scan results, and rollback instructions.
2. An authorized approver (team lead or release manager) reviews and approves the deployment in the GitHub Actions UI.
3. The deployment proceeds using the blue-green strategy as defined in the Deployment SOP.
4. Post-deployment verification runs automatically: health checks, smoke tests, and metric baseline comparison.
5. If verification passes, the deployment is marked successful. If it fails, the pipeline triggers an automatic rollback to the previous version.

### Canary Deployments

For high-risk changes, canary deployments are available:

1. The new version is deployed to 5% of production instances.
2. Error rates, latency, and key business metrics are compared against the baseline for 30 minutes.
3. If metrics are within acceptable thresholds, traffic is gradually increased to 25%, 50%, and 100% with 15-minute observation windows at each step.
4. At any point, if metrics degrade, the canary is automatically rolled back.

## Quality Gates

The pipeline enforces the following quality gates. A failure at any gate blocks progression to the next stage:

| Gate | Criteria | Blocking |
|------|----------|----------|
| Build | Compilation succeeds with zero errors | Yes |
| Lint | Zero lint errors, zero format violations | Yes |
| Unit Tests | 100% pass rate, coverage above threshold | Yes |
| Integration Tests | 100% pass rate | Yes |
| SAST | Zero critical or high findings | Yes |
| Dependency Scan | Zero critical CVEs | Yes |
| Container Scan | Zero critical CVEs in base image | Yes |
| Smoke Tests | All endpoints return expected status codes | Yes (post-deploy) |
| Metric Baseline | Error rate increase < 0.1%, p99 latency increase < 10% | Yes (production) |

## Monitoring and Alerts

- **Pipeline Health Dashboard**: Grafana dashboard tracks pipeline success rate, median duration, and flaky test rates.
- **Failure Alerts**: Pipeline failures on the main branch trigger immediate Slack notifications to the owning team.
- **Flaky Test Quarantine**: Tests that fail intermittently (>5% flake rate) are quarantined and tracked in a dedicated issue. Quarantined tests do not block the pipeline but must be fixed within one sprint.
- **Pipeline Metrics**: Monthly reporting on pipeline performance including mean time to feedback, deployment frequency, change failure rate, and mean time to recovery.
