'use client'

import React from 'react'
import {
  Brain, Server, Search, Key, Zap, Shield, ArrowRight, Check,
  BarChart3, Database, Globe, Code2, Layers, Lock, Sparkles,
  BookOpen, Cpu, FileText, AlertTriangle, X,
  GitBranch, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LoginDropdown } from './login-dropdown'
import { CtaButton } from './cta-button'
import { MobileMenuToggle } from './mobile-menu-toggle'
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  ScaleIn,
  SlideIn,
} from './landing-animations'
import { ComparisonSection } from './comparison-section'
import LiveDemoSection from './live-demo-section'
import { SocialProofSection } from './social-proof-section'
import { FaqSection } from './faq-section'

// ─── Data Constants ──────────────────────────────────────────────────────────

const PROBLEMS = [
  { icon: AlertTriangle, title: 'Context Bloat', desc: 'Loading 500+ markdown files into context wastes tokens and degrades response quality.' },
  { icon: Zap, title: 'Token Waste', desc: 'Every unnecessary token costs money. Bloated context means higher bills and slower inference.' },
  { icon: FileText, title: 'Duplicate Instructions', desc: 'Same rules repeated across files. Contradictions emerge. AI gets confused.' },
  { icon: GitBranch, title: 'Knowledge Fragmentation', desc: 'Knowledge scattered across repos, wikis, and docs. No single source of truth.' },
  { icon: X, title: 'Maintenance Nightmare', desc: 'Updating one standard means editing 20 files. Version conflicts everywhere.' },
  { icon: Users, title: 'Difficult Onboarding', desc: 'New agents need entire knowledge bases loaded. No selective retrieval.' },
]

const SOLUTION_STEPS = [
  { num: '01', title: 'Search', desc: 'Agent sends a natural language query to the IndustryX MCP server.' },
  { num: '02', title: 'Retrieve', desc: 'Hybrid scoring finds the most relevant knowledge units — not everything.' },
  { num: '03', title: 'Rank', desc: 'Vector similarity + keyword match + category + intent + usage weighting.' },
  { num: '04', title: 'Assemble Context', desc: 'Context builder packages results within a configurable token budget.' },
  { num: '05', title: 'Generate', desc: 'Agent receives optimized context. Better inputs. Better outputs. Lower cost.' },
]

const FEATURES = [
  { icon: Brain, title: 'AI-Native Knowledge', desc: 'Structured JSON Knowledge Units — not markdown. Built for AI agents, not humans reading files.', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { icon: Search, title: 'Semantic Retrieval', desc: 'Vector search + keyword match + category + intent scoring. Only retrieve what\'s relevant.', color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30' },
  { icon: Server, title: 'MCP Server', desc: 'Remote MCP server over SSE. Connect Claude Code, Cursor, VS Code, or any MCP-compatible agent.', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { icon: Zap, title: 'Token Optimization', desc: 'Context builder with token budget. Reduce tokens. Reduce context size. Improve AI quality.', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { icon: Key, title: 'API Key Management', desc: 'Generate, rotate, revoke API keys. Rate limiting. Usage tracking. Multiple keys per user.', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
  { icon: Shield, title: 'Auth & Workspaces', desc: 'GitHub/Google OAuth. Team workspaces. Role-based access. Organization management.', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
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

const PLANS = [
  {
    name: 'Free', price: '$0', period: '/month', desc: 'Get started free forever',
    features: ['Personal account', 'Basic MCP access', '1,000 API requests/mo', '1 API key', '100 knowledge units', 'Community support'],
    cta: 'Get Started Free', popular: false,
  },
  {
    name: 'Pro', price: '$21', originalPrice: '$30', period: '/month', desc: 'Launch special — 30% off',
    features: ['50,000 API requests/mo', '5 API keys', '5,000 knowledge units', '5 team members', '3 workspaces', 'Advanced analytics', 'Priority retrieval'],
    cta: 'Start Pro Trial', popular: true,
  },
  {
    name: 'Ultra', price: '$100', originalPrice: '$250', period: '/month', desc: '60% off launch price',
    features: ['500,000 API requests/mo', '50 API keys', '50,000 knowledge units', '25 team members', '10 workspaces', 'Team workspaces', 'Premium support', 'Custom knowledge packs'],
    cta: 'Go Ultra', popular: false,
  },
]

// ─── Navbar Section Links ───────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '#problem', label: 'Problem' },
  { href: '#solution', label: 'Solution' },
  { href: '#comparison', label: 'Compare' },
  { href: '#live-demo', label: 'Demo' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

// ─── Landing Page (Client Component) ────────────────────────────────────────

export default function LandingPage() {
  return (
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
              <span className="text-[10px] text-muted-foreground ml-1.5 hidden sm:inline">Knowledge MCP</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground" aria-label="Main navigation">
            {NAV_LINKS.map(link => (
              <a key={link.href} href={link.href} className="hover:text-foreground transition-colors">{link.label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LoginDropdown />
            <MobileMenuToggle />
          </div>
        </div>
      </header>

      {/* ─── Section 1: Hero ─────────────────────────────────────────── */}
      <section aria-label="Hero" className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/20" aria-hidden="true" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-emerald-200/30 dark:bg-emerald-800/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-teal-200/20 dark:bg-teal-800/10 rounded-full blur-3xl" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
          <StaggerContainer stagger={0.1} className="flex flex-col items-center">
            <StaggerItem>
              <Badge variant="outline" className="mb-6 px-3 py-1 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30">
                <Sparkles className="h-3 w-3 mr-1.5" aria-hidden="true" />
                AI Knowledge Infrastructure for Coding Agents
              </Badge>
            </StaggerItem>

            <StaggerItem>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                AI-Native Knowledge
                <br />
                <span className="text-emerald-600 dark:text-emerald-400">Infrastructure</span>
                <br />
                for Coding Agents
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Connect Claude Code, OpenCode, Codex, Cursor, VS Code, and future MCP-compatible
                agents to a centralized retrieval platform built for high-quality AI outputs.
              </p>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <CtaButton
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 text-base font-medium"
                  showArrow
                >
                  Get Started
                </CtaButton>
                <Button variant="outline" className="h-12 px-8 text-base" asChild>
                  <a href="#live-demo">Try Live Demo</a>
                </Button>
              </div>
            </StaggerItem>

            {/* Supported Clients */}
            <StaggerItem>
              <div className="mt-12">
                <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">Supported MCP Clients</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {['Claude Code', 'Cursor', 'VS Code', 'OpenCode', 'Codex'].map(client => (
                    <div key={client} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-card/50 text-xs font-medium text-muted-foreground">
                      <Code2 className="h-3 w-3" aria-hidden="true" />
                      {client}
                    </div>
                  ))}
                </div>
              </div>
            </StaggerItem>

            {/* Stats */}
            <StaggerItem>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
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
                  <span><strong className="text-foreground">API Key</strong> Access</span>
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Section 2: The Problem ───────────────────────────────────── */}
      <section id="problem" aria-labelledby="problem-heading" className="py-20 md:py-24 bg-card/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <FadeIn delay={0}>
              <Badge variant="outline" className="mb-3 text-xs border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-950/30">
                <AlertTriangle className="h-3 w-3 mr-1.5" aria-hidden="true" />
                The Problem
              </Badge>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 id="problem-heading" className="text-3xl sm:text-4xl font-bold">
                The Traditional Workflow Is Broken
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                AI coding agents load entire knowledge bases into context. The result: wasted tokens, slow responses, and inconsistent outputs.
              </p>
            </FadeIn>
          </div>

          {/* Pain Flow */}
          <FadeIn delay={0.1} className="mb-14 max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              {[
                { label: 'AI Agent', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
                { label: 'Loads 500 MD Files', color: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300' },
                { label: 'Bloated Context', color: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300' },
                { label: 'High Token Cost', color: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300' },
                { label: 'Slow Responses', color: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300' },
                { label: 'Inconsistent Outputs', color: 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200 font-semibold' },
              ].map((item, i) => (
                <React.Fragment key={item.label}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${item.color}`}>
                    {item.label}
                  </div>
                  {i < 5 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          </FadeIn>

          {/* Problem Cards */}
          <StaggerContainer stagger={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROBLEMS.map(p => {
              const Icon = p.icon
              return (
                <StaggerItem key={p.title}>
                  <article className="group border border-red-100 dark:border-red-950/40 rounded-xl bg-background hover:border-red-200 dark:hover:border-red-800 transition-all duration-200">
                    <div className="p-6">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-red-50 dark:bg-red-950/30">
                        <Icon className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                      </div>
                      <h3 className="font-semibold text-base mb-1.5">{p.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                    </div>
                  </article>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Section 3: The Solution ──────────────────────────────────── */}
      <section id="solution" aria-labelledby="solution-heading" className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <FadeIn delay={0}>
              <Badge variant="outline" className="mb-3 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30">
                <Sparkles className="h-3 w-3 mr-1.5" aria-hidden="true" />
                The Solution
              </Badge>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 id="solution-heading" className="text-3xl sm:text-4xl font-bold">
                The IndustryX Approach
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                One MCP endpoint. Semantic retrieval. Only the knowledge that matters.
              </p>
            </FadeIn>
          </div>

          {/* Solution Flow */}
          <FadeIn delay={0.1} className="mb-14 max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              {[
                { label: 'AI Agent', color: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300' },
                { label: 'IndustryX MCP', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold' },
                { label: 'Semantic Retrieval', color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' },
                { label: 'Relevant Knowledge', color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' },
                { label: 'Optimized Context', color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' },
                { label: 'Better Outputs', color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 font-semibold' },
              ].map((item, i) => (
                <React.Fragment key={item.label}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${item.color}`}>
                    {item.label}
                  </div>
                  {i < 5 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          </FadeIn>

          {/* Steps */}
          <div className="max-w-3xl mx-auto">
            <StaggerContainer stagger={0.1} className="space-y-4">
              {SOLUTION_STEPS.map(step => (
                <StaggerItem key={step.num}>
                  <div className="flex items-start gap-4 p-5 rounded-xl border border-border/50 bg-card/50 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{step.num}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ─── Section 4: Comparison ───────────────────────────────────── */}
      <ComparisonSection />

      {/* ─── Section 5: Architecture Flow ─────────────────────────────── */}
      <section id="architecture" aria-labelledby="architecture-heading" className="border-y border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <FadeIn>
            <div className="text-center mb-10">
              <h2 id="architecture-heading" className="text-2xl sm:text-3xl font-bold">How It Works</h2>
              <p className="mt-2 text-muted-foreground text-sm max-w-lg mx-auto">Every layer optimized for AI-native knowledge delivery.</p>
            </div>
          </FadeIn>
          <StaggerContainer stagger={0.1} className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {[
              { label: 'Developer', icon: Users, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
              { label: 'AI Agent', icon: Cpu, color: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300' },
              { label: 'IndustryX MCP', icon: Server, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold' },
              { label: 'Knowledge Engine', icon: Brain, color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300' },
              { label: 'Vector Search', icon: Search, color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
              { label: 'JSON Knowledge', icon: Database, color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                <StaggerItem>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${item.color}`}>
                    <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.label}
                  </div>
                </StaggerItem>
                {i < 5 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" aria-hidden="true" />}
              </React.Fragment>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Section 6: Live Demo ─────────────────────────────────────── */}
      <LiveDemoSection />

      {/* ─── Section 7: Features ──────────────────────────────────────── */}
      <section id="features" aria-labelledby="features-heading" className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <FadeIn delay={0}>
              <Badge variant="outline" className="mb-3 text-xs">Platform Features</Badge>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold">Built for AI agents.<br />Managed by humans.</h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Every feature designed for semantic retrieval — never load all knowledge into context.</p>
            </FadeIn>
          </div>

          <StaggerContainer stagger={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <StaggerItem key={f.title}>
                  <article className="group hover:shadow-lg transition-all duration-200 border border-border/50 rounded-xl">
                    <div className="p-6">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.bg}`}>
                        <Icon className={`h-5 w-5 ${f.color}`} aria-hidden="true" />
                      </div>
                      <h3 className="font-semibold text-base mb-1.5">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </article>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Section 8: Knowledge Types ───────────────────────────────── */}
      <section id="knowledge" aria-labelledby="knowledge-heading" className="py-20 md:py-24 bg-card/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <FadeIn delay={0}>
              <Badge variant="outline" className="mb-3 text-xs">Knowledge System</Badge>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 id="knowledge-heading" className="text-3xl sm:text-4xl font-bold">AI-Native JSON Knowledge Units</h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Replace markdown with structured, searchable, AI-optimized knowledge.</p>
            </FadeIn>
          </div>

          <StaggerContainer stagger={0.06} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {KNOWLEDGE_TYPES.map(k => {
              const Icon = k.icon
              return (
                <StaggerItem key={k.label}>
                  <article className="flex flex-col items-center text-center p-4 rounded-xl border border-border/50 bg-background hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-2.5">
                      <Icon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                    </div>
                    <h3 className="font-medium text-sm">{k.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{k.desc}</p>
                  </article>
                </StaggerItem>
              )
            })}
          </StaggerContainer>

          {/* JSON Schema Preview */}
          <SlideIn direction="right" delay={0.2} className="mt-10 max-w-2xl mx-auto border border-border/50 rounded-xl">
            <div className="p-5">
              <h3 className="font-mono text-xs font-semibold text-emerald-600 mb-3">knowledge/design-systems/skills/component-spec.json</h3>
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
          </SlideIn>
        </div>
      </section>

      {/* ─── Section 9: MCP Server ────────────────────────────────────── */}
      <section id="mcp" aria-labelledby="mcp-heading" className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <FadeIn delay={0}>
              <Badge variant="outline" className="mb-3 text-xs">MCP Protocol</Badge>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 id="mcp-heading" className="text-3xl sm:text-4xl font-bold">Connect Any AI Agent</h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">One MCP server. SSE transport. JSON-RPC 2.0. Your agents get knowledge on demand.</p>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <FadeIn delay={0.1}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  8 MCP Tools Available
                </h3>
              </FadeIn>
              <StaggerContainer stagger={0.06} className="space-y-2">
                {MCP_TOOLS_LIST.map(tool => (
                  <StaggerItem key={tool.name}>
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                      <code className="text-xs font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded shrink-0">
                        {tool.name}
                      </code>
                      <div>
                        <p className="text-xs text-muted-foreground">{tool.desc}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">params: {tool.params}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

            <div>
              <FadeIn delay={0.1}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-violet-600" aria-hidden="true" />
                  Supported MCP Clients
                </h3>
              </FadeIn>
              <StaggerContainer stagger={0.06} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {MCP_CLIENTS.map(client => (
                  <StaggerItem key={client.name}>
                    <div className="p-3 rounded-lg border border-border/50 bg-card">
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{client.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <FadeIn delay={0.3}>
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
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 10: Token Savings ────────────────────────────────── */}
      <section aria-label="Token savings" className="py-20 md:py-24 bg-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold">Reduce Tokens. Improve Quality.</h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-3 text-emerald-100 text-lg max-w-xl mx-auto">
              Instead of loading all knowledge into context, retrieve only what&apos;s relevant.
            </p>
          </FadeIn>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { value: '80%+', label: 'Token Reduction', sub: 'vs. loading full knowledge base' },
              { value: '<100ms', label: 'Search Latency', sub: 'semantic vector search' },
              { value: '<500ms', label: 'Context Build', sub: 'including ranking & retrieval' },
            ].map((stat, i) => (
              <ScaleIn key={stat.label} delay={0.15 + i * 0.1}>
                <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm">
                  <p className="text-4xl font-extrabold">{stat.value}</p>
                  <p className="text-sm font-medium mt-1">{stat.label}</p>
                  <p className="text-xs text-emerald-200 mt-1">{stat.sub}</p>
                </div>
              </ScaleIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 11: Social Proof ─────────────────────────────────── */}
      <SocialProofSection />

      {/* ─── Section 12: FAQ ──────────────────────────────────────────── */}
      <FaqSection />

      {/* ─── Section 13: Pricing ──────────────────────────────────────── */}
      <section id="pricing" aria-labelledby="pricing-heading" className="py-20 md:py-24 bg-card/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <FadeIn delay={0}>
              <Badge variant="outline" className="mb-3 text-xs">Simple Pricing</Badge>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold">Start free. Scale infinitely.</h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Launch special pricing — lock in discounts before they expire.</p>
            </FadeIn>
          </div>

          <StaggerContainer stagger={0.12} className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map(plan => (
              <StaggerItem key={plan.name}>
                <article className={`relative border rounded-xl ${plan.popular ? 'border-emerald-300 dark:border-emerald-700 shadow-lg' : 'border-border/50'}`}>
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

                    <CtaButton
                      className={`w-full ${plan.popular ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </CtaButton>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <FadeIn delay={0.4}>
            <p className="text-center text-sm text-muted-foreground mt-6">
              <strong>Enterprise</strong> — Custom pricing with private MCP deployment, dedicated infrastructure, SSO, and SLA support.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────── */}
      <section aria-label="Call to action" className="py-16 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold">Ready to supercharge your AI agents?</h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-3 text-muted-foreground">One MCP server. One API key. Access all knowledge. Start free today.</p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <CtaButton className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8" showArrow>
                Get Started Free
              </CtaButton>
              <Button variant="outline" className="h-11 px-8" asChild>
                <a href="#live-demo">Try Live Demo</a>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border bg-card">
        <FadeIn>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center" aria-hidden="true">
                  <Brain className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold text-sm">IndustryX</span>
                <span className="text-[10px] text-muted-foreground">Knowledge MCP</span>
              </div>
              <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground">
                {NAV_LINKS.map(link => (
                  <a key={link.href} href={link.href} className="hover:text-foreground transition-colors">{link.label}</a>
                ))}
              </nav>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Knowledge MCP Platform</span>
                <span>v2.0</span>
                <span>&copy; {new Date().getFullYear()}</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </footer>
    </div>
  )
}
