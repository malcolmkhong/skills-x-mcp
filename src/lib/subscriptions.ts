import { db } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlanName = "free" | "pro" | "ultra" | "enterprise";
export type SubscriptionPlanName = "free" | "pro_monthly" | "pro_yearly" | "ultra" | "enterprise";
export type LimitType = "apiRequests" | "apiKeys" | "knowledgeUnits" | "teamMembers" | "workspaces";

export interface PlanFeatures {
  [key: string]: string[];
}

export interface UserPlanDetails {
  planName: string;
  subscriptionPlan: SubscriptionPlanName;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  limits: {
    apiRequestsPerMonth: number;
    apiKeysLimit: number;
    knowledgeUnitsLimit: number;
    teamMembersLimit: number;
    workspacesLimit: number;
  };
  features: string[];
  isPopular: boolean;
  currentPeriodEnd: Date | null;
}

export interface PlanUsage {
  apiRequests: { used: number; limit: number };
  apiKeys: { used: number; limit: number };
  knowledgeUnits: { used: number; limit: number };
  teamMembers: { used: number; limit: number };
  workspaces: { used: number; limit: number };
}

export interface PlanWithFeatures {
  id: string;
  name: SubscriptionPlanName;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  apiRequestsPerMonth: number;
  apiKeysLimit: number;
  knowledgeUnitsLimit: number;
  teamMembersLimit: number;
  workspacesLimit: number;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  limitType: LimitType;
}

// ─── Plan Features Constant ─────────────────────────────────────────────────

export const PLAN_FEATURES: PlanFeatures = {
  free: [
    "1,000 API requests/month",
    "1 API key",
    "100 knowledge units",
    "Basic hybrid search",
    "Community support",
  ],
  pro: [
    "50,000 API requests/month",
    "5 API keys",
    "5,000 knowledge units",
    "Advanced hybrid search + intent matching",
    "MCP server access",
    "Priority support",
    "5 team members",
    "3 workspaces",
  ],
  ultra: [
    "500,000 API requests/month",
    "50 API keys",
    "50,000 knowledge units",
    "Advanced hybrid search + intent matching",
    "MCP server access",
    "Custom knowledge schemas",
    "Analytics dashboard",
    "Dedicated support",
    "25 team members",
    "10 workspaces",
  ],
  enterprise: [
    "Unlimited API requests",
    "Unlimited API keys",
    "Unlimited knowledge units",
    "All search features",
    "MCP server access",
    "Custom knowledge schemas",
    "Advanced analytics",
    "SSO/SAML",
    "Custom integrations",
    "Dedicated account manager",
    "SLA guarantee",
  ],
};

// ─── Plan Mapping ────────────────────────────────────────────────────────────

/**
 * Map user plan field to subscription plan name.
 * User.plan is simplified (free, pro, ultra, enterprise) while
 * SubscriptionPlan has pro_monthly and pro_yearly variants.
 */
function userPlanToSubscriptionPlan(planName: string): SubscriptionPlanName {
  switch (planName) {
    case "pro":
      return "pro_monthly";
    case "free":
    case "ultra":
    case "enterprise":
      return planName as SubscriptionPlanName;
    default:
      return "free";
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function parseFeatures(featuresJson: string): string[] {
  try {
    const parsed = JSON.parse(featuresJson);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not valid JSON, return empty array
  }
  return [];
}

function formatPlan(plan: {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  apiRequestsPerMonth: number;
  apiKeysLimit: number;
  knowledgeUnitsLimit: number;
  teamMembersLimit: number;
  workspacesLimit: number;
  features: string;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
}): PlanWithFeatures {
  return {
    id: plan.id,
    name: plan.name as SubscriptionPlanName,
    displayName: plan.displayName,
    description: plan.description,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    apiRequestsPerMonth: plan.apiRequestsPerMonth,
    apiKeysLimit: plan.apiKeysLimit,
    knowledgeUnitsLimit: plan.knowledgeUnitsLimit,
    teamMembersLimit: plan.teamMembersLimit,
    workspacesLimit: plan.workspacesLimit,
    features: parseFeatures(plan.features),
    isPopular: plan.isPopular,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Get all active subscription plans, ordered by sortOrder.
 */
export async function getPlans(): Promise<PlanWithFeatures[]> {
  try {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return plans.map(formatPlan);
  } catch (error) {
    console.error('[getPlans]', error)
    throw new Error(`Failed to getPlans: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get a specific subscription plan by name.
 */
export async function getPlanByName(name: string): Promise<PlanWithFeatures | null> {
  try {
    const plan = await db.subscriptionPlan.findUnique({
      where: { name },
    });

    if (!plan) return null;

    return formatPlan(plan);
  } catch (error) {
    console.error('[getPlanByName]', error)
    throw new Error(`Failed to getPlanByName: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get the user's current plan details including limits and features.
 */
export async function getUserPlan(userId: string): Promise<UserPlanDetails | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        currentPeriodEnd: true,
      },
    });

    if (!user) return null;

    const subscriptionPlanName = userPlanToSubscriptionPlan(user.plan);
    const plan = await db.subscriptionPlan.findUnique({
      where: { name: subscriptionPlanName },
    });

    if (!plan) {
      // Fallback to free plan if the user's plan doesn't exist
      const freePlan = await db.subscriptionPlan.findUnique({
        where: { name: "free" },
      });

      if (!freePlan) return null;

      return {
        planName: "free",
        subscriptionPlan: "free",
        displayName: freePlan.displayName,
        description: freePlan.description,
        price: freePlan.price,
        currency: freePlan.currency,
        interval: freePlan.interval,
        limits: {
          apiRequestsPerMonth: freePlan.apiRequestsPerMonth,
          apiKeysLimit: freePlan.apiKeysLimit,
          knowledgeUnitsLimit: freePlan.knowledgeUnitsLimit,
          teamMembersLimit: freePlan.teamMembersLimit,
          workspacesLimit: freePlan.workspacesLimit,
        },
        features: parseFeatures(freePlan.features),
        isPopular: freePlan.isPopular,
        currentPeriodEnd: user.currentPeriodEnd,
      };
    }

    return {
      planName: user.plan,
      subscriptionPlan: subscriptionPlanName,
      displayName: plan.displayName,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      limits: {
        apiRequestsPerMonth: plan.apiRequestsPerMonth,
        apiKeysLimit: plan.apiKeysLimit,
        knowledgeUnitsLimit: plan.knowledgeUnitsLimit,
        teamMembersLimit: plan.teamMembersLimit,
        workspacesLimit: plan.workspacesLimit,
      },
      features: parseFeatures(plan.features),
      isPopular: plan.isPopular,
      currentPeriodEnd: user.currentPeriodEnd,
    };
  } catch (error) {
    console.error('[getUserPlan]', error)
    throw new Error(`Failed to getUserPlan: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get the limits for a specific plan.
 * Returns the SubscriptionPlan record directly.
 */
export async function getPlanLimits(planName: string): Promise<PlanWithFeatures | null> {
  try {
    const subscriptionPlanName = userPlanToSubscriptionPlan(planName);
    return await getPlanByName(subscriptionPlanName);
  } catch (error) {
    console.error('[getPlanLimits]', error)
    throw new Error(`Failed to getPlanLimits: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if user has reached a plan limit.
 * Returns whether the action is allowed, along with usage details.
 */
export async function checkUserLimit(
  userId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        remaining: 0,
        limitType,
      };
    }

    const subscriptionPlanName = userPlanToSubscriptionPlan(user.plan);
    const plan = await db.subscriptionPlan.findUnique({
      where: { name: subscriptionPlanName },
    });

    if (!plan) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        remaining: 0,
        limitType,
      };
    }

    let used = 0;
    let limit = 0;

    switch (limitType) {
      case "apiRequests": {
        limit = plan.apiRequestsPerMonth;
        // Count this month's usage events
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        used = await db.usageEvent.count({
          where: {
            userId,
            createdAt: { gte: startOfMonth },
          },
        });
        break;
      }

      case "apiKeys": {
        limit = plan.apiKeysLimit;
        used = await db.apiKey.count({
          where: {
            userId,
            isRevoked: false,
          },
        });
        break;
      }

      case "knowledgeUnits": {
        limit = plan.knowledgeUnitsLimit;
        // Count knowledge units across user's workspaces
        const userWorkspaces = await db.workspaceMember.findMany({
          where: { userId },
          select: { workspaceId: true },
        });
        const workspaceIds = userWorkspaces.map((w) => w.workspaceId);

        if (workspaceIds.length > 0) {
          used = await db.knowledge.count({
            where: {
              workspaceId: { in: workspaceIds },
              isActive: true,
            },
          });
        }
        break;
      }

      case "teamMembers": {
        limit = plan.teamMembersLimit;
        // Count the total members across all workspaces the user is in
        const userWorkspaceIds = await db.workspaceMember.findMany({
          where: { userId },
          select: { workspaceId: true },
        });
        const wsIds = userWorkspaceIds.map((w) => w.workspaceId);

        if (wsIds.length > 0) {
          // Get the workspace with the most members (the user's primary workspace)
          const memberCounts = await db.workspaceMember.groupBy({
            by: ["workspaceId"],
            where: { workspaceId: { in: wsIds } },
            _count: { id: true },
          });
          // Use the max member count as the "used" amount
          used = Math.max(0, ...memberCounts.map((m) => m._count.id));
        }
        break;
      }

      case "workspaces": {
        limit = plan.workspacesLimit;
        used = await db.workspaceMember.count({
          where: { userId },
        });
        break;
      }
    }

    // -1 means unlimited
    const isUnlimited = limit === -1;
    const remaining = isUnlimited ? Infinity : Math.max(0, limit - used);
    const allowed = isUnlimited || used < limit;

    return {
      allowed,
      used,
      limit: isUnlimited ? -1 : limit,
      remaining: isUnlimited ? -1 : remaining,
      limitType,
    };
  } catch (error) {
    console.error('[checkUserLimit]', error)
    throw new Error(`Failed to checkUserLimit: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get current usage vs limits for a user across all limit types.
 */
export async function getUserUsage(userId: string): Promise<PlanUsage> {
  try {
    const [apiRequests, apiKeys, knowledgeUnits, teamMembers, workspaces] = await Promise.all([
      checkUserLimit(userId, "apiRequests"),
      checkUserLimit(userId, "apiKeys"),
      checkUserLimit(userId, "knowledgeUnits"),
      checkUserLimit(userId, "teamMembers"),
      checkUserLimit(userId, "workspaces"),
    ]);

    return {
      apiRequests: { used: apiRequests.used, limit: apiRequests.limit },
      apiKeys: { used: apiKeys.used, limit: apiKeys.limit },
      knowledgeUnits: { used: knowledgeUnits.used, limit: knowledgeUnits.limit },
      teamMembers: { used: teamMembers.used, limit: teamMembers.limit },
      workspaces: { used: workspaces.used, limit: workspaces.limit },
    };
  } catch (error) {
    console.error('[getUserUsage]', error)
    throw new Error(`Failed to getUserUsage: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Upgrade a user's plan.
 * Simplified — no Stripe integration yet, just updates the user's plan field.
 */
export async function upgradeUserPlan(
  userId: string,
  planName: string
): Promise<UserPlanDetails | null> {
  try {
    // Validate plan name (simplified plan field)
    const validPlans: PlanName[] = ["free", "pro", "ultra", "enterprise"];
    if (!validPlans.includes(planName as PlanName)) {
      throw new Error(`Invalid plan name: ${planName}. Valid plans: ${validPlans.join(", ")}`);
    }

    // Verify the subscription plan exists
    const subscriptionPlanName = userPlanToSubscriptionPlan(planName);
    const plan = await db.subscriptionPlan.findUnique({
      where: { name: subscriptionPlanName },
    });

    if (!plan) {
      throw new Error(`Subscription plan not found: ${subscriptionPlanName}`);
    }

    if (!plan.isActive) {
      throw new Error(`Subscription plan is not available: ${subscriptionPlanName}`);
    }

    // Update the user's plan
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        plan: planName,
        currentPeriodEnd: planName === "free"
          ? null
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    return await getUserPlan(updatedUser.id);
  } catch (error) {
    console.error('[upgradeUserPlan]', error)
    throw new Error(`Failed to upgradeUserPlan: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Downgrade a user's plan.
 * Simplified — no Stripe integration yet, just updates the user's plan field.
 * In production, this would schedule the downgrade for the end of the billing period.
 */
export async function downgradeUserPlan(
  userId: string,
  planName: string
): Promise<UserPlanDetails | null> {
  try {
    // Validate plan name
    const validPlans: PlanName[] = ["free", "pro", "ultra", "enterprise"];
    if (!validPlans.includes(planName as PlanName)) {
      throw new Error(`Invalid plan name: ${planName}. Valid plans: ${validPlans.join(", ")}`);
    }

    // Get current plan to verify it's actually a downgrade
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) return null;

    const planOrder: Record<string, number> = {
      free: 0,
      pro: 1,
      ultra: 2,
      enterprise: 3,
    };

    const currentLevel = planOrder[user.plan] ?? 0;
    const targetLevel = planOrder[planName] ?? 0;

    if (targetLevel >= currentLevel) {
      throw new Error(
        `Cannot downgrade from ${user.plan} to ${planName}. Target plan must be lower tier. Use upgradeUserPlan instead.`
      );
    }

    // Verify the subscription plan exists
    const subscriptionPlanName = userPlanToSubscriptionPlan(planName);
    const plan = await db.subscriptionPlan.findUnique({
      where: { name: subscriptionPlanName },
    });

    if (!plan) {
      throw new Error(`Subscription plan not found: ${subscriptionPlanName}`);
    }

    // Update the user's plan
    // In production: schedule for end of billing period, not immediate
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        plan: planName,
        currentPeriodEnd: planName === "free" ? null : user.currentPeriodEnd,
      },
    });

    return await getUserPlan(updatedUser.id);
  } catch (error) {
    console.error('[downgradeUserPlan]', error)
    throw new Error(`Failed to downgradeUserPlan: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
