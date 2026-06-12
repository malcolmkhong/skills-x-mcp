---
title: Virtual Economy Design
category: economy
description: Design document for the virtual economy covering currency systems, faucets, sinks, inflation control, and economic balance mechanics
keywords: economy, currency, inflation, balance, virtual-goods
---

# Virtual Economy Design

This document defines the virtual economy for IndustryX, covering the currency system, economic flow mechanics, inflation control measures, and the balancing framework that ensures long-term economic health. A well-designed virtual economy is essential for player engagement, retention, and the sustainability of monetization. The economy must feel rewarding without generating unsustainable inflation or deflation.

## Currency System

### Primary Currency: Gold

Gold is the standard in-game currency earned through gameplay activities. It is used for most everyday transactions:

- **Acquisition (Faucets)**: Quest rewards, enemy drops, item sales to vendors, daily login bonuses, achievement rewards.
- **Expenditure (Sinks)**: Equipment upgrades, consumable purchases, fast travel fees, crafting material purchases, housing rent.
- **Design Principle**: Gold should be abundant enough that players do not feel gated from basic activities, but scarce enough that meaningful purchases require deliberate saving and prioritization.

### Premium Currency: Gems

Gems are the monetization currency, primarily acquired through real-money purchase. They provide access to cosmetic items, convenience features, and time-saving mechanics:

- **Acquisition**: In-app purchase, seasonal battle pass tiers, rare in-game events (limited quantities).
- **Expenditure**: Cosmetic skins, emotes, battle pass upgrades, inventory expansion, accelerated timers.
- **Design Principle**: Gems must never provide a competitive advantage. All Gem purchases are either cosmetic or convenience-oriented. This is a hard design constraint to maintain competitive fairness.

### Secondary Currency: Reputation Tokens

Reputation Tokens are earned through faction-specific activities and spent on faction-exclusive items:

- **Acquisition**: Faction quests, territory control contributions, faction PvP events.
- **Expenditure**: Faction-specific equipment, mounts, titles, and crafting recipes.
- **Design Principle**: Reputation Tokens create parallel economic tracks that encourage diverse gameplay. Players cannot convert between currencies, ensuring each activity type has intrinsic value.

## Economic Flow Model

The economy operates as a closed-loop system with monitored inflows and outflows:

```
[Gameplay Activities] --(faucets)--> [Player Wallet] --(sinks)--> [System Removal]
       |                                  |
       |                          (player-to-player)
       |                                  |
       v                                  v
[Content Consumption]              [Marketplace Trades]
```

### Faucet Rates

Faucet rates are calibrated to provide a target average income per hour of active gameplay:

| Activity | Gold/Hour | Notes |
|----------|-----------|-------|
| Main Quest | 500-800 | Front-loaded, decreases as story completes |
| Side Quests | 300-500 | Repeatable with diminishing returns |
| Dungeon Runs | 400-600 | Scales with difficulty |
| Crafting & Gathering | 200-400 | Market-dependent, variable |
| PvP Matches | 200-350 | Fixed rewards regardless of outcome |
| Daily Login | 50-150 | Increases with consecutive days |

The average player earns approximately 400 Gold per hour of active play. A "dedicated" player (20+ hours/week) should accumulate enough Gold to afford a top-tier equipment upgrade every 2-3 weeks.

### Sink Design

Sinks are categorized as mandatory, optional, and luxury:

- **Mandatory Sinks** (40% of total sink volume): Equipment repairs, fast travel, basic consumables. These ensure a baseline outflow regardless of player behavior.
- **Optional Sinks** (45% of total sink volume): Equipment upgrades, crafting, housing customization. These provide meaningful progression choices.
- **Luxury Sinks** (15% of total sink volume): Rare cosmetic items from vendors, prestige housing, social features. These remove excess Gold from the economy without gating gameplay.

## Inflation Control

### Dynamic Sink Adjustment

The economy service monitors the total Gold supply and its velocity (turnover rate). When the Gold supply grows faster than the target rate (2% per month), the system activates dynamic sink multipliers:

- Vendor prices increase by up to 20% during high-inflation periods.
- Repair costs scale with the average player wealth percentile.
- Luxury item prices have a built-in inflation index that adjusts weekly.

### Faucet Throttling

When the Gold supply exceeds the target threshold:

- Quest rewards are reduced by up to 15% through a dynamic modifier.
- Drop rates for high-value items are temporarily decreased.
- Daily login bonuses are replaced with reputation tokens instead of Gold.

These adjustments are transparent to players. The UI always shows the base reward values, and the modifiers are applied server-side.

### Currency Caps

- Player wallets are soft-capped at 10x the median player wealth. Above this cap, faucet rewards are reduced by 50% and sink costs are increased by 25%.
- This prevents hyper-accumulation by a small number of players while not hard-limiting their progress.
- The cap is recalculated weekly based on live economic data.

## Marketplace Economics

The player-driven marketplace uses a tax-based sink:

- **Transaction Tax**: 5% of the sale price is removed from the economy on every marketplace transaction. This is the largest single sink in the economy.
- **Listing Fee**: A small flat fee (10 Gold) is charged to create a listing, preventing listing spam.
- **Price Floors**: Minimum listing prices prevent item devaluation below vendor sell prices.
- **Price Ceilings**: For critical items, maximum listing prices prevent price gouging during scarcity events.

## Economic Monitoring

The analytics team tracks the following KPIs weekly:

- **M2 (Total Currency Supply)**: The total amount of Gold in circulation. Target growth: 1-3% per month.
- **Velocity**: The rate at which Gold changes hands. Healthy range: 2-5 transactions per Gold per week.
- **Gini Coefficient**: A measure of wealth inequality. Target: 0.4-0.6. Above 0.7 indicates excessive concentration.
- **Faucet-to-Sink Ratio**: Target: 0.95-1.05. Below 0.95 is deflationary (players feel poor); above 1.05 is inflationary (currency loses value).
- **Player Purchasing Power**: The average number of items a player can afford after one hour of gameplay. Target: stable or slowly increasing.
