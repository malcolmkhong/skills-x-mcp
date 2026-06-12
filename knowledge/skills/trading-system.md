---
title: Trading System Implementation
category: skills
description: Detailed guide for building a real-time player-to-player trading system with escrow, validation, and anti-fraud measures
keywords: trading, escrow, marketplace, real-time, validation
---

# Trading System Implementation

A trading system enables players to exchange virtual items, currency, and resources in a secure and fair manner. This document details the architecture and implementation of a real-time peer-to-peer trading system with server-side escrow, atomic transaction processing, and comprehensive anti-fraud protections. The system supports both direct trades between two players and a global marketplace for listing and browsing offers.

## System Architecture

The trading system operates as a dedicated microservice with the following components:

- **Trade Gateway**: A WebSocket-based entry point that manages real-time trade sessions between players. Each trade session has a unique ID and a defined lifecycle: initiated, proposed, confirmed, executing, completed, or cancelled.
- **Escrow Service**: Holds items and currency in a neutral server-side account during the trade. Items are removed from the player's inventory and placed in escrow before the trade is finalized, ensuring neither party can back out after confirmation.
- **Validation Engine**: Verifies trade eligibility including item ownership, trade locks, account restrictions, and inventory capacity. Runs synchronously before any escrow operation.
- **Settlement Engine**: Performs the atomic swap of escrowed items between players. Uses database transactions with row-level locking to guarantee consistency.
- **Audit Logger**: Records every trade event with full context for dispute resolution and fraud analysis.

## Trade Lifecycle

A standard trade follows this sequence:

1. **Initiation**: Player A invites Player B to trade. The gateway creates a new trade session and assigns it an ID.
2. **Proposal**: Both players add items and currency to their side of the trade. Changes are broadcast in real-time to both parties via WebSocket.
3. **Lock-in**: Each player confirms their side of the trade. Once confirmed, that player cannot modify their offer. Both players must confirm before proceeding.
4. **Escrow Transfer**: The system moves all offered items from both players' inventories into the escrow account. If any transfer fails (e.g., item no longer exists), the entire trade is rolled back.
5. **Settlement**: Items in escrow are distributed to the receiving players atomically.
6. **Completion**: Both players receive their new items and a trade receipt. The session is closed and archived.

## Database Schema

The core tables are:

- `trade_sessions`: id, player_a_id, player_b_id, status, created_at, completed_at
- `trade_offers`: id, session_id, player_id, item_id, quantity, currency_amount, confirmed
- `escrow_entries`: id, session_id, player_id, item_id, quantity, state (pending, held, released, returned)
- `trade_audit_log`: id, session_id, event_type, player_id, details_json, timestamp

All mutations to these tables occur within serializable database transactions to prevent race conditions such as double-spending an item across simultaneous trades.

## Marketplace Integration

The global marketplace extends the trading system with persistent buy/sell listings:

- **Listings**: Players create listings specifying an item and a requested price. Listings are active until fulfilled or expired (default 7 days).
- **Search and Filter**: Listings are indexed by item type, rarity, price, and seller. Full-text search supports item names and descriptions.
- **Instant Buy**: A buyer purchases a listing, which triggers an atomic escrow-and-settle flow identical to a direct trade but without the proposal step.
- **Bidding**: Optional auction-style listings where players place bids over a defined period. The highest bid at close triggers settlement.

## Anti-Fraud Measures

- **Rate Limiting**: Players are limited to 50 trades per hour and 10 concurrent trade sessions to prevent automated farming.
- **Value Disparity Detection**: Trades where the value ratio between sides exceeds 10:1 are flagged for review. Value is estimated from marketplace historical prices.
- **New Account Restrictions**: Accounts under 24 hours old or with fewer than 5 hours of playtime cannot initiate trades with high-value items.
- **Trade Bans**: Moderators can issue trade bans at the account level, preventing all trade and marketplace activity.
- **Duplicate Item Detection**: The system checks for item duplication exploits by verifying item provenance chains before escrow acceptance.

## Error Handling

- If a player disconnects during a trade, the session remains open for 60 seconds. If the player does not reconnect, the trade is cancelled and all escrowed items are returned.
- If settlement fails due to inventory full, items are held in a temporary overflow slot with a 24-hour claim window.
- All errors during the escrow phase trigger a full rollback to ensure no items are lost or duplicated.
