import React from 'react'
import {
  Brain, Server, Search, Key, Zap, Shield, ArrowRight, Check,
  BarChart3, Database, Globe, Code2, Layers, Lock, Sparkles,
  BookOpen, Cpu, Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoginDropdown } from './login-dropdown'

// ─── Data Constants (server-side, no useState/useEffect) ──────────────────────

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Native Knowledge',
    desc: 'Structured JSON Knowledge Units — not markdown. Built for AI agents, not humans reading files.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    icon: Search,
    title: 'Semantic Retrieval',
    desc: 'Vector search + keyword match + category + intent scoring. Only retrieve what\'s relevant.',
    color: 'text-sky-600',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
  },
  {
    icon: Server,
    title: 'MCP Server',
    desc: 'Remote MCP server over SSE. Connect Claude Code, Cursor, VS Code, or any MCP-compatible agent.',
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
  },
  {
    icon: Zap,
    title: 'Token Optimization',
    desc: 'Context builder with token budget. Reduce tokens. Reduce context size. Improve AI quality.',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    icon: Key,
    title: 'API Key Management',
    desc: 'Generate, rotate, revoke API keys. Rate limiting. Usage tracking. Multiple keys per user.',
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
  },
  {
    icon: Shield,
    title: 'Auth & Workspaces',
    desc: 'GitHub/Google OAuth. Team workspaces. Role-based access. Organization management.',
    color: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    desc: 'Get started free forever',
    features: ['Personal account', 'Basic MCP access', '1,000 API requests/mo', '1 API key', '100 knowledge units', 'Community support'],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$21',
    originalPrice: '$30',
    period: '/month',
    desc: 'Launch special — 30% off',
    features: ['50,000 API requests/mo', '5 API keys', '5,000 knowledge units', '5 team members', '3 workspaces', 'Advanced analytics', 'Priority retrieval'],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Ultra',
    price: '$100',
    originalPrice: '$250',
    period: '/month',
    desc: '60% off launch price',
    features: ['500,000 API requests/mo', '50 API keys', '50,000 knowledge units', '25 team members', '10 workspaces', 'Team workspaces', 'Premium support', 'Custom knowledge packs'],
    cta: 'Go Ultra',
    popular: false,
  },
]

const KNOWLEDGE_TYPES = [
  { icon: Code2, label: 'Skills', desc: 'Reusable AI skills and capabilities' },
  { icon: BookOpen, label: 'SOPs', desc: 'Standard operating procedures' },
  { icon: Layers, label: 'Architecture', desc: 'System architecture documents' },
  { icon: Shield, label: 'Security', desc: 'Security standards & practices' },
  { icon: BarChart3, label: 'Economy', desc: 'Game economy & monetization' },
  { icon: Globe, label: 'Deployment', desc: 'CI/CD & deployment knowledge' },
  { icon: Database, label: 'Standards', desc: 'UI/UX, backend, frontend standards' },
  { icon: Cpu, label: 'Analytics', desc: 'Analytics & live ops knowledge' },
]

const MCP_TOOLS_LIST = [
  { name: 'search_knowledge', desc: 'Hybrid search across all knowledge', params: 'query, limit?' },
  { name: 'retrieve_knowledge', desc: 'Get a specific document by slug', params: 'slug' },
  { name: 'build_context', desc: 'Build optimized AI context with token budget', params: 'query, maxDocuments?, maxTokenBudget?' },
  { name: 'search_skills', desc: 'Search skills category', params: 'query, limit?' },
  { name: 'search_sops', desc: 'Search SOPs category', params: 'query, limit?' },
  { name: 'search_architecture', desc: 'Search architecture category', params: 'query, limit?' },
  { name: 'search_security', desc: 'Search security category', params: 'query, limit?' },
  { name: 'search_game_system', desc: 'Search game systems category', params: 'query, limit?' },
]

const MCP_CLIENTS = [
  { name: 'Claude Code', desc: 'Add to claude_desktop_config.json' },
  { name: 'Cursor', desc: 'Add to MCP settings with SSE transport' },
  { name: 'VS Code', desc: 'Use the MCP extension for VS Code' },
  { name: 'OpenCode', desc: 'Configure SSE endpoint in settings' },
  { name: 'Codex', desc: 'Connect via MCP protocol adapter' },
  { name: 'Custom Agents', desc: 'SSE + JSON-RPC 2.0 standard' },
]

// ─── FAQ Data for GEO (AI engines cite FAQ content) ──────────────────────────

const FAQS = [
  {
    question: 'What is IndustryX Knowledge MCP Platform?',
    answer: 'IndustryX is an AI-native knowledge management platform that provides a Model Context Protocol (MCP) server for AI agents. It stores knowledge as structured JSON units — not markdown — and enables semantic retrieval so AI agents only load relevant context, reducing token usage by 80%+ while improving response quality.',
  },
  {
    question: 'What is MCP (Model Context Protocol)?',
    answer: 'MCP is an open protocol that allows AI agents to connect to external data sources and tools. IndustryX implements MCP as a remote server using SSE (Server-Sent Events) transport and JSON-RPC 2.0, enabling any MCP-compatible client like Claude Code, Cursor, or VS Code to retrieve knowledge on demand.',
  },
  {
    question: 'How does semantic retrieval work?',
    answer: 'IndustryX uses a hybrid retrieval system that combines vector embedding similarity (40% weight), keyword matching (20%), category matching (15%), intent matching (15%), and usage weighting (10%). This ensures that AI agents receive the most relevant knowledge units without loading entire knowledge bases into context.',
  },
  {
    question: 'How does IndustryX reduce token usage?',
    answer: 'Instead of loading all knowledge into an AI\'s context window, IndustryX\'s context builder retrieves only the top relevant documents within a configurable token budget. Average token savings exceed 80% compared to loading full knowledge bases, with search latency under 100ms and context building under 500ms.',
  },
  {
    question: 'What are JSON Knowledge Units?',
    answer: 'JSON Knowledge Units are structured data objects that replace traditional markdown documentation. Each unit contains: slug, title, category, tags, intents (for matching user queries), rules, anti-patterns, implementation steps, dependencies, references, and metadata. This structure makes knowledge machine-readable and optimizable for semantic search.',
  },
  {
    question: 'How do I connect my AI agent to IndustryX?',
    answer: 'Generate an API key from the IndustryX dashboard, then add the MCP server configuration to your client. For Claude Code, add to claude_desktop_config.json: { "mcpServers": { "industryx": { "url": "https://your-server.com/sse", "headers": { "Authorization": "Bearer ixk_your_api_key" } } } }. For Cursor, VS Code, and other MCP clients, configure the SSE endpoint similarly.',
  },
  {
    question: 'Is there a free plan available?',
    answer: 'Yes. IndustryX offers a free forever plan that includes a personal account, basic MCP access, 1,000 API requests per month, 1 API key, and 100 knowledge units. No credit card required. Pro plans start at $21/month with launch pricing (regularly $30/month).',
  },
  {
    question: 'What types of knowledge can I store?',
    answer: 'IndustryX supports 8+ knowledge categories: Skills (reusable AI capabilities), SOPs (standard operating procedures), Architecture (system design documents), Security (standards and practices), Economy (game economy and monetization), Deployment (CI/CD knowledge), Standards (UI/UX, backend, frontend), and Analytics (live ops knowledge). Custom categories are also supported.',
  },
]

// ─── JSON-LD Structured Data ─────────────────────────────────────────────────

function JsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'IndustryX',
    description: 'AI-native Knowledge MCP Platform — Skills × MCP. Semantic retrieval platform for AI agents.',
    url: 'https://industryx.io',
    logo: 'https://industryx.io/logo.svg',
    sameAs: ['https://github.com/industryx'],
  }

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'IndustryX Knowledge MCP Platform',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description: 'AI-native knowledge management platform with MCP server for AI agents. Semantic retrieval, token optimization, and structured JSON knowledge units.',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', description: 'Personal account, 1K API requests/mo, 1 API key, 100 knowledge units' },
      { '@type': 'Offer', name: 'Pro', price: '21', priceCurrency: 'USD', description: '50K API requests/mo, 5 API keys, 5K knowledge units, 5 team members' },
      { '@type': 'Offer', name: 'Ultra', price: '100', priceCurrency: 'USD', description: '500K API requests/mo, 50 API keys, 50K knowledge units, 25 team members' },
    ],
    featureList: [
      'MCP Server with SSE transport',
      'Semantic vector search',
      'Context builder with token budget',
      '8 MCP tools for AI agents',
      'API key management with rotation',
      'GitHub and Google OAuth',
      'Team workspaces',
      'Usage analytics',
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  )
}

// ─── Mobile Menu (Client Component boundary) ─────────────────────────────────
// Extracted to avoid making the whole page a client component

import { MobileMenuToggle } from './mobile-menu-toggle'

// ─── Landing Page (Server Component) ─────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      {/* JSON-LD Structured Data for SEO/GEO */}
      <JsonLd />

      <div className="min-h-screen flex flex-col bg-background">
        {/* ─── Navbar ──────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center" aria-hidden="true">
                <Brain className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <span className="font-bold text-sm">IndustryX</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 hidden sm:inline">Skills × MCP</span>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground" aria-label="Main navigation">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#knowledge" className="hover:text-foreground transition-colors">Knowledge</a>
              <a href="#mcp" className="hover:text-foreground transition-colors">MCP Server</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            </nav>

            <div className="flex items-center gap-3">
              <LoginDropdown />
              <MobileMenuToggle />
            </div>
          </div>
        </header>

        {/* ─── Hero ────────────────────────────────────────────────────── */}
        <section aria-label="Hero" className="relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/20" aria-hidden="true" />
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-emerald-200/30 dark:bg-emerald-800/10 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-teal-200/20 dark:bg-teal-800/10 rounded-full blur-3xl" aria-hidden="true" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
            <Badge variant="outline" className="mb-6 px-3 py-1 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30">
              <Sparkles className="h-3 w-3 mr-1.5" aria-hidden="true" />
              Skills × MCP — AI-Native Knowledge Platform
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
              One MCP Server.
              <br />
              <span className="text-emerald-600 dark:text-emerald-400">One API Key.</span>
              <br />
              All Knowledge.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Access all skills, SOPs, architecture docs, standards, and knowledge
              through a single intelligent retrieval platform. Reduce tokens. Reduce
              context size. Improve AI quality.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 text-base font-medium"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
              </Button>
              <Button variant="outline" className="h-12 px-8 text-base" asChild>
                <a href="#mcp">View MCP Setup</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span><strong className="text-foreground">10K+</strong> Knowledge Units</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <span><strong className="text-foreground">&lt;100ms</strong> Search</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-violet-600" aria-hidden="true" />
                <span><strong className="text-foreground">8</strong> MCP Tools</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-rose-600" aria-hidden="true" />
                <span><strong className="text-foreground">OAuth</strong> + API Keys</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Architecture Flow ───────────────────────────────────────── */}
        <section aria-label="Architecture flow" className="border-y border-border bg-card/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              {[
                { label: 'AI Agent', icon: Cpu, color: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300' },
                { label: 'MCP Protocol', icon: Server, color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300' },
                { label: 'MCP Server', icon: Layers, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
                { label: 'Knowledge Engine', icon: Brain, color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
                { label: 'Vector Search', icon: Search, color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300' },
                { label: 'JSON Knowledge', icon: Database, color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' },
              ].map((item, i) => (
                <React.Fragment key={item.label}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${item.color}`}>
                    <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.label}
                  </div>
                  {i < 5 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Features ────────────────────────────────────────────────── */}
        <section id="features" aria-labelledby="features-heading" className="py-20 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <Badge variant="outline" className="mb-3 text-xs">Platform Features</Badge>
              <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold">Built for AI agents.<br />Managed by humans.</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Every feature designed for semantic retrieval — never load all knowledge into context.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map(f => {
                const Icon = f.icon
                return (
                  <article key={f.title} className="group hover:shadow-lg transition-all duration-200 border border-border/50 rounded-xl">
                    <div className="p-6">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.bg}`}>
                        <Icon className={`h-5 w-5 ${f.color}`} aria-hidden="true" />
                      </div>
                      <h3 className="font-semibold text-base mb-1.5">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── Knowledge Types ─────────────────────────────────────────── */}
        <section id="knowledge" aria-labelledby="knowledge-heading" className="py-20 md:py-24 bg-card/50 border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <Badge variant="outline" className="mb-3 text-xs">Knowledge System</Badge>
              <h2 id="knowledge-heading" className="text-3xl sm:text-4xl font-bold">AI-Native JSON Knowledge Units</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Replace markdown with structured, searchable, AI-optimized knowledge.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {KNOWLEDGE_TYPES.map(k => {
                const Icon = k.icon
                return (
                  <article key={k.label} className="flex flex-col items-center text-center p-4 rounded-xl border border-border/50 bg-background hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-2.5">
                      <Icon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                    </div>
                    <h3 className="font-medium text-sm">{k.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{k.desc}</p>
                  </article>
                )
              })}
            </div>

            {/* JSON Schema Preview */}
            <div className="mt-10 max-w-2xl mx-auto border border-border/50 rounded-xl">
              <div className="p-5">
                <h3 className="font-mono text-xs font-semibold text-emerald-600 mb-3">knowledge/skills/ui-ux-pro-max.json</h3>
                <pre className="text-xs font-mono text-muted-foreground leading-relaxed overflow-x-auto" aria-label="Example JSON knowledge unit schema">
{`{
  "slug": "ui-ux-pro-max",
  "title": "UI/UX Pro Max Standards",
  "category": "skills",
  "tags": ["ui", "ux", "design", "accessibility"],
  "intents": ["design ui", "improve ux", "accessibility audit"],
  "rules": ["Use semantic HTML", "44px min touch targets"],
  "antiPatterns": ["Inline styles", "!important overrides"],
  "implementationSteps": ["Audit current UI", ...],
  "dependencies": ["design-system-core"]
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* ─── MCP Server ──────────────────────────────────────────────── */}
        <section id="mcp" aria-labelledby="mcp-heading" className="py-20 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <Badge variant="outline" className="mb-3 text-xs">MCP Protocol</Badge>
              <h2 id="mcp-heading" className="text-3xl sm:text-4xl font-bold">Connect Any AI Agent</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">One MCP server. SSE transport. JSON-RPC 2.0. Your agents get knowledge on demand.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Tools */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  8 MCP Tools Available
                </h3>
                <div className="space-y-2">
                  {MCP_TOOLS_LIST.map(tool => (
                    <div key={tool.name} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                      <code className="text-xs font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded shrink-0">
                        {tool.name}
                      </code>
                      <div>
                        <p className="text-xs text-muted-foreground">{tool.desc}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">params: {tool.params}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clients */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-violet-600" aria-hidden="true" />
                  Supported MCP Clients
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {MCP_CLIENTS.map(client => (
                    <div key={client.name} className="p-3 rounded-lg border border-border/50 bg-card">
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{client.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Connection snippet */}
                <div className="bg-gray-950 text-gray-100 rounded-xl overflow-hidden">
                  <div className="p-4">
                    <p className="text-[10px] text-gray-400 mb-2 font-mono">{'// claude_desktop_config.json'}</p>
                    <pre className="text-xs font-mono leading-relaxed text-emerald-400" aria-label="MCP client configuration example">
{`{
  "mcpServers": {
    "industryx": {
      "url": "https://your-server.com/sse",
      "headers": {
        "Authorization": "Bearer ixk_your_api_key"
      }
    }
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Token Savings ───────────────────────────────────────────── */}
        <section aria-label="Token savings" className="py-20 md:py-24 bg-emerald-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold">Reduce Tokens. Improve Quality.</h2>
            <p className="mt-3 text-emerald-100 text-lg max-w-xl mx-auto">
              Instead of loading all knowledge into context, retrieve only what&apos;s relevant.
            </p>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { value: '80%+', label: 'Token Reduction', sub: 'vs. loading full knowledge base' },
                { value: '<100ms', label: 'Search Latency', sub: 'semantic vector search' },
                { value: '<500ms', label: 'Context Build', sub: 'including ranking & retrieval' },
              ].map(stat => (
                <div key={stat.label} className="p-6 rounded-xl bg-white/10 backdrop-blur-sm">
                  <p className="text-4xl font-extrabold">{stat.value}</p>
                  <p className="text-sm font-medium mt-1">{stat.label}</p>
                  <p className="text-xs text-emerald-200 mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ (GEO-optimized) ─────────────────────────────────────── */}
        <section id="faq" aria-labelledby="faq-heading" className="py-20 md:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <Badge variant="outline" className="mb-3 text-xs">FAQ</Badge>
              <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold">Frequently Asked Questions</h2>
              <p className="mt-3 text-muted-foreground">Everything you need to know about IndustryX Knowledge MCP Platform.</p>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <article key={i} className="border border-border/50 rounded-xl p-5">
                  <h3 className="font-semibold text-sm mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing ─────────────────────────────────────────────────── */}
        <section id="pricing" aria-labelledby="pricing-heading" className="py-20 md:py-24 bg-card/50 border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <Badge variant="outline" className="mb-3 text-xs">Simple Pricing</Badge>
              <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold">Start free. Scale infinitely.</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Launch special pricing — lock in discounts before they expire.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {PLANS.map(plan => (
                <article key={plan.name} className={`relative border rounded-xl ${plan.popular ? 'border-emerald-300 dark:border-emerald-700 shadow-lg' : 'border-border/50'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-600 text-white text-[10px] px-2.5">Most Popular</Badge>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                      {plan.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through ml-1">{plan.originalPrice}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>

                    <Separator className="my-4" />

                    <ul className="space-y-2 mb-6" aria-label={`${plan.name} plan features`}>
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full ${plan.popular ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              <strong>Enterprise</strong> — Custom pricing with private MCP deployment, dedicated infrastructure, SSO, and SLA support.
            </p>
          </div>
        </section>

        {/* ─── CTA ─────────────────────────────────────────────────────── */}
        <section aria-label="Call to action" className="py-16 md:py-20 bg-background">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold">Ready to supercharge your AI agents?</h2>
            <p className="mt-3 text-muted-foreground">One MCP server. One API key. Access all knowledge. Start free today.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8">
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
              </Button>
              <Button variant="outline" className="h-11 px-8">
                Read Documentation
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <footer className="mt-auto border-t border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center" aria-hidden="true">
                  <Brain className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold text-sm">IndustryX</span>
                <span className="text-[10px] text-muted-foreground">Skills × MCP</span>
              </div>
              <nav aria-label="Footer navigation" className="flex items-center gap-6 text-xs text-muted-foreground">
                <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                <a href="#mcp" className="hover:text-foreground transition-colors">MCP Server</a>
                <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
                <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              </nav>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Knowledge MCP Platform</span>
                <span>v1.1.0</span>
                <span>&copy; {new Date().getFullYear()}</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
