---
title: Authentication Security Rules
category: security
description: Security rules and best practices for authentication systems including password policies, token management, multi-factor authentication, and session handling
keywords: authentication, security, JWT, MFA, session-management
---

# Authentication Security Rules

This document defines the mandatory security rules for the authentication system. All authentication flows, token management, session handling, and account recovery mechanisms must comply with these rules. Non-compliance is a blocking security finding and must be remediated before production deployment.

## Password Policies

### Storage

- Passwords must be hashed using Argon2id with the following parameters: memory cost 65536 KiB, time cost 3 iterations, parallelism 4. These parameters are calibrated for the production hardware and will be updated as hardware capabilities evolve.
- Passwords must never be stored in plaintext, reversible encryption, or weak hash functions (MD5, SHA-1, SHA-256 without salt).
- A unique salt of at least 16 bytes must be generated per password using a cryptographically secure random number generator.
- Password hashes and salts must be stored in a dedicated table with restricted access. Application logs, error traces, and debug output must never include password hashes.

### Complexity Requirements

- Minimum length: 12 characters.
- Must include at least three of the following four categories: uppercase letters, lowercase letters, digits, special characters.
- Must not match any entry in the top 100,000 most common passwords (checked against the HaveIBeenPwned corpus).
- Must not contain the username, email prefix, or any substring of 4+ consecutive characters from the display name.

### Rotation and History

- Passwords expire every 90 days. Users are notified 14 days before expiration.
- Users cannot reuse any of their last 12 passwords.
- After 3 failed login attempts, the account is temporarily locked for 15 minutes. The lockout duration doubles on each subsequent lockout (15 min, 30 min, 60 min, etc.).
- After 10 failed attempts within 24 hours, the account is locked until the user resets their password via email verification.

## Token Management

### JWT Configuration

- Access tokens are short-lived JWTs with a 15-minute expiration.
- Refresh tokens are opaque random strings with a 7-day expiration, stored in the database and revocable.
- JWT signing uses RS256 (RSA with SHA-256). The signing key pair is rotated every 30 days. Old keys remain valid for verification for an additional 24 hours after rotation to allow in-flight tokens to expire naturally.
- JWTs must include the following claims: `sub` (user ID), `iat` (issued at), `exp` (expiration), `jti` (unique token ID for revocation), `sid` (session ID).
- JWTs must NOT include sensitive user data (email, roles) in the payload. Such data is fetched from the user service when needed.

### Refresh Token Flow

- Refresh tokens are single-use. When a refresh token is exchanged for a new access token, a new refresh token is also issued, and the old one is invalidated.
- Refresh tokens are stored hashed in the database (SHA-256 of the token value). The raw token is only transmitted once to the client.
- If a refresh token is used after it has been invalidated (potential token theft), the entire session and all associated tokens are revoked. The user is notified via email and forced to re-authenticate.
- Refresh tokens are scoped to the device and IP range. A refresh token used from a significantly different IP triggers a verification step.

### Token Revocation

- A revocation list is maintained in Redis with TTL equal to the token's remaining lifetime.
- When a token is revoked (user logout, password change, security event), its `jti` is added to the revocation list.
- The API gateway checks the revocation list before accepting any access token. This adds approximately 1ms latency per request.

## Multi-Factor Authentication

### Supported Methods

- **TOTP (Time-based One-Time Password)**: Standard 6-digit codes using RFC 6238 with 30-second time steps. Supports authenticator apps (Google Authenticator, Authy, etc.).
- **SMS OTP**: 6-digit codes sent via SMS with a 5-minute expiration. Used as a fallback for users without authenticator apps. SMS is considered less secure than TOTP.
- **Email OTP**: 6-digit codes sent via email with a 10-minute expiration. Used for account recovery and as a secondary factor.

### MFA Enforcement

- MFA is optional for standard accounts but mandatory for accounts with administrative privileges or accounts that handle financial transactions.
- When MFA is enabled, users can register up to 3 devices for TOTP and 1 phone number for SMS.
- Backup recovery codes (8 codes, each 10 characters) are generated when MFA is enabled. Each code is single-use. Users are instructed to store these codes securely.

## Session Management

- A session is created upon successful authentication and tracked server-side in the database.
- Each user is limited to 5 concurrent sessions. When a 6th session is created, the oldest session is automatically terminated.
- Sessions are invalidated on: explicit logout, password change, MFA enrollment change, account lock, or security-triggered revocation.
- Session metadata includes: device fingerprint, IP address, user agent, creation timestamp, and last activity timestamp.
- Sessions idle for more than 30 minutes are automatically terminated. The maximum session duration is 24 hours regardless of activity.

## Account Recovery

- Password reset requires email verification. The reset link contains a single-use token with a 1-hour expiration.
- Account recovery for users who have lost MFA access requires: (1) email verification, (2) identity verification via a support ticket (government ID for high-value accounts), and (3) a 48-hour cooling period before MFA is removed.
- Recovery codes cannot be used to bypass MFA if the account is in a locked state due to suspicious activity.

## Security Monitoring

All authentication events are logged and monitored:

- Successful logins, failed login attempts, MFA challenges, password changes, session creations, and session terminations are logged with full context (IP, user agent, timestamp).
- Anomaly detection rules flag: logins from new countries, rapid sequential login attempts across accounts, token usage from mismatched IPs, and refresh token reuse.
- Flagged events trigger an immediate notification to the security team and may result in automatic session revocation if the risk score exceeds the configured threshold.
