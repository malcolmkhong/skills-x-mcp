---
title: Event-Driven Architecture
category: architecture
description: Architecture document for event-driven systems covering event design, routing, processing patterns, and consistency guarantees
keywords: event-driven, Kafka, CQRS, event-sourcing, async
---

# Event-Driven Architecture

This document defines the event-driven architecture patterns used across IndustryX services. Event-driven architecture enables loose coupling between services, supports eventual consistency, and provides a scalable foundation for features that require real-time reactivity and historical auditability. This document covers event design principles, the event backbone infrastructure, processing patterns, and the consistency guarantees provided by the system.

## Event Design Principles

Events are the primary integration mechanism between services. Well-designed events are critical to system reliability and evolvability. All events must adhere to the following principles:

1. **Facts, Not Commands**: Events represent facts that have already happened (e.g., `trade.completed`) rather than commands to perform actions (e.g., `complete.trade`). This prevents coupling between the event producer and consumer's internal logic.

2. **Self-Contained**: Each event carries all the data needed by consumers to process it, without requiring a callback to the source service. This includes the entity ID, the relevant state changes, and sufficient context. For example, a `user.level.changed` event includes both the old and new level, not just the user ID.

3. **Immutable**: Events are never modified after publication. If a correction is needed, a new compensating event is published. This ensures that all consumers see a consistent history regardless of when they process events.

4. **Versioned**: Event schemas include a version number. Schema evolution follows backward-compatible rules: new fields are optional with defaults, and existing fields are never removed or renamed. Breaking changes require a new event type.

5. **Timestamped**: Every event includes both a producer timestamp (when the event occurred) and a processing timestamp (when the event was ingested). This enables accurate temporal reasoning and debugging.

## Event Backbone

Apache Kafka serves as the event backbone with the following topology:

- **Clusters**: A 5-broker Kafka cluster with 3-node ZooKeeper ensemble in production. Each broker runs on a dedicated instance with NVMe storage.
- **Topics**: Organized by domain and entity: `<domain>.<entity>.<event-type>`. Examples: `inventory.item.acquired`, `trade.session.completed`, `user.profile.updated`.
- **Partitions**: Each topic has a partition count based on throughput requirements (default: 6 partitions for standard topics, 24 for high-throughput topics like analytics). Partitioning key is typically `userId` to guarantee ordering per user.
- **Replication**: Factor of 3 for all topics. Min ISR of 2 ensures durability even during broker failures.
- **Retention**: 7 days for standard topics, 30 days for audit topics, indefinite for event-sourced aggregates.

## Processing Patterns

### Event Notification

The simplest pattern: a service publishes an event to notify other services that something happened. Consumers react to the event independently, with no expectation of a response. Example: the notification service consumes `trade.completed` events to send push notifications to both traders.

### Event-Carried State Transfer

When a consumer needs data from another service but cannot call its API synchronously, the producer includes the relevant state in the event. The consumer maintains a local materialized view. Example: the trading service includes item metadata in `trade.completed` events so the analytics service can generate reports without calling the inventory service.

### CQRS (Command Query Responsibility Segregation)

Write and read operations are handled by separate models:

- **Command Side**: Processes write operations, validates business rules, and persists changes. Emits events representing the state changes.
- **Query Side**: Consumes events and builds optimized read models. Serves queries from these materialized views with low latency.

The command side is the source of truth; the query side is eventually consistent. This separation allows each side to scale independently and use different storage technologies (e.g., PostgreSQL for writes, Elasticsearch for reads).

### Event Sourcing

For services requiring a complete audit trail or the ability to reconstruct state at any point in time, event sourcing stores the full sequence of events rather than just the current state:

- **Event Store**: A Kafka topic with infinite retention serves as the event store. Each event is appended and never modified.
- **Aggregates**: The current state of an entity (aggregate) is derived by replaying its events from the beginning. Snapshots are taken every 100 events to reduce replay time.
- **Projections**: Multiple projections can consume the same event stream to build different views of the data. For example, the same trade events can be projected into a user trade history view and a market analytics view.
- **Time Travel**: By replaying events up to a specific timestamp, the system can reconstruct the state of any aggregate at any point in time. This is invaluable for debugging and compliance.

### Saga Orchestration

For complex multi-step workflows, a saga orchestrator manages the sequence of events and compensating actions:

- The orchestrator maintains a state machine for each saga instance, tracking which steps have completed and which are pending.
- Each step in the saga emits an event upon completion, which the orchestrator consumes to advance the state machine.
- If a step fails, the orchestrator triggers compensating actions for all previously completed steps in reverse order.
- Saga state is persisted durably so that the orchestrator can recover from crashes and resume the saga.

## Consistency Guarantees

The system provides the following consistency guarantees:

- **Within a Service**: Strong consistency via database transactions. A service's API always returns the most recent state.
- **Within an Event Partition**: Events are delivered in order per partition key. Consumers see events in the same sequence the producer published them.
- **Across Services**: Eventual consistency. After a producer emits an event, consumers will see the effect within a bounded time. The 99th percentile convergence time is under 5 seconds under normal load.
- **Exactly-Once Processing**: Kafka transactions and consumer idempotency keys ensure that events are processed exactly once, even in the presence of consumer restarts or Kafka broker failures.

## Dead Letter Queue

Events that fail processing after 3 attempts are routed to a dead letter queue (DLQ) topic: `<domain>.<entity>.<event-type>.dlq`. The DLQ is monitored by a dedicated alerting system. Operations engineers triage DLQ entries daily, fix the underlying issue, and replay the events from the DLQ.

## Schema Registry

All event schemas are registered in the Confluent Schema Registry with compatibility enforcement:

- **BACKWARD** compatibility is required for all new schema versions. This means consumers using the old schema can read data written with the new schema.
- Schema changes are reviewed as part of the PR process. The CI pipeline validates that the proposed schema change is compatible with the current production schema.
- Schema IDs are embedded in each Kafka message, enabling consumers to deserialize payloads using the correct schema version.
