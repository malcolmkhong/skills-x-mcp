import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/auth-utils";

async function seed() {
  console.log("🌱 Starting database seeding...");

  const results = {
    user: null as string | null,
    workspace: null as string | null,
    plans: [] as string[],
    apiKey: null as { raw: string; prefix: string } | null,
  };

  // ─── 1. Create Demo User ──────────────────────────────────────────────
  const demoEmail = "demo@industryx.io";
  let demoUser = await db.user.findUnique({
    where: { email: demoEmail },
  });

  if (!demoUser) {
    demoUser = await db.user.create({
      data: {
        name: "Demo User",
        email: demoEmail,
        role: "admin",
        plan: "pro",
        bio: "Demo account for IndustryX Knowledge MCP Platform",
        company: "IndustryX",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
      },
    });
    results.user = demoUser.id;
    console.log(`  ✅ Created demo user: ${demoUser.email} (${demoUser.id})`);
  } else {
    results.user = demoUser.id;
    console.log(`  ℹ️  Demo user already exists: ${demoUser.email} (${demoUser.id})`);
  }

  // ─── 2. Create Personal Workspace ─────────────────────────────────────
  const workspaceSlug = "demo-personal";
  let workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        name: "Demo's Workspace",
        slug: workspaceSlug,
        description: "Personal workspace for the demo user",
        icon: "🏠",
        isPersonal: true,
        plan: "pro",
        members: {
          create: {
            userId: demoUser.id,
            role: "owner",
          },
        },
      },
    });
    results.workspace = workspace.id;
    console.log(`  ✅ Created personal workspace: ${workspace.slug} (${workspace.id})`);
  } else {
    results.workspace = workspace.id;
    console.log(`  ℹ️  Workspace already exists: ${workspace.slug} (${workspace.id})`);
  }

  // ─── 3. Create Subscription Plans ─────────────────────────────────────
  const plans = [
    {
      name: "free",
      displayName: "Free",
      description: "Get started with basic knowledge management",
      price: 0,
      interval: "month",
      apiRequestsPerMonth: 1000,
      apiKeysLimit: 1,
      knowledgeUnitsLimit: 100,
      teamMembersLimit: 1,
      workspacesLimit: 1,
      features: JSON.stringify([
        "1,000 API requests/month",
        "1 API key",
        "100 knowledge units",
        "Basic hybrid search",
        "Community support",
      ]),
      isPopular: false,
      sortOrder: 1,
    },
    {
      name: "pro_monthly",
      displayName: "Pro (Monthly)",
      description: "For professionals who need more power — launch price $21/mo for first 2 months",
      price: 30,
      interval: "month",
      apiRequestsPerMonth: 50000,
      apiKeysLimit: 5,
      knowledgeUnitsLimit: 5000,
      teamMembersLimit: 5,
      workspacesLimit: 3,
      features: JSON.stringify([
        "50,000 API requests/month",
        "5 API keys",
        "5,000 knowledge units",
        "Advanced hybrid search + intent matching",
        "MCP server access",
        "Priority support",
        "5 team members",
        "3 workspaces",
      ]),
      isPopular: true,
      sortOrder: 2,
    },
    {
      name: "pro_yearly",
      displayName: "Pro (Yearly)",
      description: "Best value for professionals — $15/mo billed annually",
      price: 180,
      interval: "year",
      apiRequestsPerMonth: 50000,
      apiKeysLimit: 5,
      knowledgeUnitsLimit: 5000,
      teamMembersLimit: 5,
      workspacesLimit: 3,
      features: JSON.stringify([
        "50,000 API requests/month",
        "5 API keys",
        "5,000 knowledge units",
        "Advanced hybrid search + intent matching",
        "MCP server access",
        "Priority support",
        "5 team members",
        "3 workspaces",
        "Save 50% vs monthly",
      ]),
      isPopular: false,
      sortOrder: 3,
    },
    {
      name: "ultra",
      displayName: "Ultra",
      description: "For power users and small teams — launch price",
      price: 100,
      interval: "month",
      apiRequestsPerMonth: 500000,
      apiKeysLimit: 50,
      knowledgeUnitsLimit: 50000,
      teamMembersLimit: 25,
      workspacesLimit: 10,
      features: JSON.stringify([
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
      ]),
      isPopular: false,
      sortOrder: 4,
    },
    {
      name: "enterprise",
      displayName: "Enterprise",
      description: "For organizations with advanced needs — custom pricing",
      price: 0,
      interval: "month",
      apiRequestsPerMonth: -1,
      apiKeysLimit: -1,
      knowledgeUnitsLimit: -1,
      teamMembersLimit: -1,
      workspacesLimit: -1,
      features: JSON.stringify([
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
      ]),
      isPopular: false,
      sortOrder: 5,
    },
  ];

  for (const plan of plans) {
    const existing = await db.subscriptionPlan.findUnique({
      where: { name: plan.name },
    });

    if (!existing) {
      await db.subscriptionPlan.create({ data: plan });
      results.plans.push(plan.name);
      console.log(`  ✅ Created plan: ${plan.name}`);
    } else {
      // Update existing plan with new values
      await db.subscriptionPlan.update({
        where: { name: plan.name },
        data: {
          displayName: plan.displayName,
          description: plan.description,
          price: plan.price,
          interval: plan.interval,
          apiRequestsPerMonth: plan.apiRequestsPerMonth,
          apiKeysLimit: plan.apiKeysLimit,
          knowledgeUnitsLimit: plan.knowledgeUnitsLimit,
          teamMembersLimit: plan.teamMembersLimit,
          workspacesLimit: plan.workspacesLimit,
          features: plan.features,
          isPopular: plan.isPopular,
          sortOrder: plan.sortOrder,
        },
      });
      results.plans.push(plan.name);
      console.log(`  ✏️  Updated plan: ${plan.name}`);
    }
  }

  // ─── 4. Create Default API Key ────────────────────────────────────────
  const existingKey = await db.apiKey.findFirst({
    where: {
      userId: demoUser.id,
      name: "Default Demo Key",
      isRevoked: false,
    },
  });

  if (!existingKey) {
    const { raw, prefix, hash } = generateApiKey();

    await db.apiKey.create({
      data: {
        name: "Default Demo Key",
        keyPrefix: prefix,
        keyHash: hash,
        userId: demoUser.id,
        workspaceId: workspace.id,
        permissions: "read_write",
        rateLimit: 100,
        monthlyLimit: 50000,
      },
    });

    results.apiKey = { raw, prefix };
    console.log(`  ✅ Created API key: ${prefix}... (save this: ${raw})`);
  } else {
    results.apiKey = {
      raw: "(already created - view in dashboard)",
      prefix: existingKey.keyPrefix,
    };
    console.log(`  ℹ️  API key already exists: ${existingKey.keyPrefix}...`);
  }

  console.log("🌱 Database seeding complete!");

  return results;
}

export async function seedDatabase() {
  try {
    return await seed();
  } catch (error) {
    console.error('[seedDatabase]', error)
    throw new Error(`Failed to seedDatabase: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
