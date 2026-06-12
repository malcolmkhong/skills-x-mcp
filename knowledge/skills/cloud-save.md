---
title: Cloud Save Implementation
category: skills
description: Comprehensive guide for implementing cloud save functionality with conflict resolution, offline support, and data synchronization across devices
keywords: cloud-save, synchronization, conflict-resolution, offline, persistence
---

# Cloud Save Implementation

Cloud save is a critical feature for modern applications that need to persist user progress and settings across multiple devices and sessions. This document covers the architecture, implementation patterns, and best practices for building a robust cloud save system that handles network failures, concurrent edits, and data migration gracefully.

## Architecture Overview

The cloud save system is built on a three-tier architecture consisting of a local persistence layer, a sync engine, and a remote storage backend. The local layer uses IndexedDB or SQLite for browser-based and native applications respectively, ensuring that users can continue working offline. The sync engine manages the bidirectional flow of data between local and remote stores, handling conflict detection and resolution. The remote backend stores authoritative copies of all save data in a distributed key-value store with strong consistency guarantees.

Key design principles include optimistic local writes with background sync, per-entity version vectors for conflict detection, and a last-write-wins strategy with pluggable merge functions for conflict resolution. Each save entity is tagged with a monotonically increasing version number and a device identifier, enabling the system to reconstruct the chronological order of edits even when devices were offline.

## Data Model

Each save entry is structured as follows:

```
SaveEntry {
  userId: string
  saveKey: string          // e.g., "profile", "gameState", "settings"
  data: JSON               // Arbitrary serializable payload
  version: number          // Monotonic version counter
  deviceId: string         // Origin device identifier
  timestamp: ISO8601       // Server-assigned timestamp
  checksum: SHA256         // Integrity hash of the data payload
}
```

The `saveKey` namespace allows multiple independent save slots per user. The `checksum` field is verified on both upload and download to detect data corruption in transit. The `version` field is incremented atomically on the server side using a compare-and-swap operation to prevent lost updates.

## Conflict Resolution

When two devices modify the same save key offline, a conflict arises upon sync. The system implements a three-step resolution process:

1. **Detection**: The server compares the incoming version against the stored version. If the incoming version is not exactly one greater than the stored version, a conflict is flagged.

2. **Automatic Merge**: For well-structured data types (lists, sets, maps), the system applies type-specific merge strategies. For example, list appends are merged by interleaving entries by timestamp, and map updates are merged field-by-field.

3. **Manual Resolution**: When automatic merge is not possible, the client receives both versions and presents a resolution UI. The user chooses which version to keep or manually merges the data. The resolved version is then uploaded with a new version number.

## Offline Support

The local persistence layer queues all write operations in a durable outbox. When network connectivity is restored, the outbox is flushed to the server in order. Reads during offline periods always serve from the local store. The system uses the Network Information API and service worker lifecycle events to detect connectivity changes and trigger sync operations proactively.

## Error Handling and Retry

Failed sync operations are retried with exponential backoff starting at 1 second, capped at 5 minutes, with jitter to prevent thundering herd problems. After 10 consecutive failures, the system enters a degraded mode where it continues serving local data but notifies the user that cloud sync is unavailable. Transient errors (network timeout, 503) are retried automatically, while permanent errors (401, 403) trigger a re-authentication flow.

## Performance Considerations

- **Delta encoding**: Only changed fields are transmitted over the network, reducing bandwidth usage by up to 80% for large save payloads.
- **Compression**: Save data is compressed with gzip before transmission, with a 1 KB threshold to avoid overhead on small payloads.
- **Batching**: Multiple save operations within a 5-second window are batched into a single upload request.
- **Prefetching**: The client prefetches save data on app launch using a priority queue based on access frequency heuristics.
