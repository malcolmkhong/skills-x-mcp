import type { Metadata } from 'next'
import HomePage from './home-client'

// ─── SEO + GEO Metadata ──────────────────────────────────────────────────────
// Exported from this Server Component — crawlers see this SSR'd.
// Updated for Phase 1 repositioning: AI Knowledge Infrastructure SaaS.

export const metadata: Metadata = {
  title: 'IndustryX — AI-Native Knowledge Infrastructure for Coding Agents',
  description:
    'IndustryX is the AI-native knowledge infrastructure platform. One MCP endpoint. One API key. Semantic retrieval of structured JSON knowledge units. Connect Claude Code, Cursor, VS Code, OpenCode, Codex. Reduce tokens by 80%+.',
  keywords: [
    'MCP server',
    'Model Context Protocol',
    'AI knowledge infrastructure',
    'AI knowledge management',
    'semantic retrieval',
    'knowledge platform',
    'AI agents',
    'Claude Code',
    'Cursor AI',
    'VS Code MCP',
    'OpenCode',
    'Codex',
    'token optimization',
    'vector search',
    'JSON knowledge units',
    'IndustryX',
    'Skills MCP',
    'AI-native knowledge',
    'context window optimization',
    'AI coding agents',
    'knowledge retrieval',
    'context builder',
  ],
  authors: [{ name: 'IndustryX Team', url: 'https://industryx.io' }],
  creator: 'IndustryX',
  publisher: 'IndustryX',
  metadataBase: new URL('https://industryx.io'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://industryx.io',
    siteName: 'IndustryX',
    title: 'IndustryX — AI-Native Knowledge Infrastructure for Coding Agents',
    description:
      'One MCP endpoint. One API key. Access thousands of AI-ready knowledge units through intelligent semantic retrieval. Reduce tokens by 80%+. Connect Claude Code, Cursor, VS Code, OpenCode, Codex.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'IndustryX — AI-Native Knowledge Infrastructure for Coding Agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IndustryX — AI-Native Knowledge Infrastructure for Coding Agents',
    description:
      'One MCP endpoint. One API key. All knowledge. Reduce tokens by 80%+ with semantic retrieval.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// ─── JSON-LD Structured Data ─────────────────────────────────────────────────
// Single source of truth — emitted here in page.tsx, NOT duplicated in landing-page.tsx.

const faqData = [
  { q: 'What is IndustryX Knowledge MCP Platform?', a: 'IndustryX is an AI-native knowledge infrastructure platform that provides a Model Context Protocol (MCP) server for coding agents. It stores knowledge as structured JSON units and enables semantic retrieval so AI agents only load relevant context, reducing token usage by 80%+ while improving response quality.' },
  { q: 'What is MCP (Model Context Protocol)?', a: 'MCP is an open protocol that allows AI agents to connect to external data sources and tools. IndustryX implements MCP as a remote server using SSE transport and JSON-RPC 2.0, enabling any MCP-compatible client like Claude Code, Cursor, VS Code, OpenCode, or Codex to retrieve knowledge on demand.' },
  { q: 'How does semantic retrieval work?', a: 'IndustryX uses a hybrid retrieval system that combines vector embedding similarity (40% weight), keyword matching (20%), category matching (15%), intent matching (15%), and usage weighting (10%). This ensures that AI agents receive the most relevant knowledge units without loading entire knowledge bases into context.' },
  { q: 'How does IndustryX reduce token usage?', a: 'Instead of loading all knowledge into an AI context window, IndustryX context builder retrieves only the top relevant documents within a configurable token budget. Average token savings exceed 80% compared to loading full knowledge bases, with search latency under 100ms and context building under 500ms.' },
  { q: 'What are JSON Knowledge Units?', a: 'JSON Knowledge Units are structured data objects that replace traditional markdown documentation. Each unit contains: slug, title, category, tags, intents, rules, anti-patterns, implementation steps, dependencies, references, and metadata. This structure makes knowledge machine-readable and optimizable for semantic search.' },
  { q: 'How do I connect my AI agent to IndustryX?', a: 'Generate an API key from the IndustryX dashboard, then add the MCP server configuration to your client. For Claude Code, add to claude_desktop_config.json with the SSE URL and API key. For Cursor, VS Code, OpenCode, Codex, and other MCP clients, configure the SSE endpoint similarly.' },
  { q: 'Is there a free plan available?', a: 'Yes. IndustryX offers a free forever plan that includes a personal account, basic MCP access, 1,000 API requests per month, 1 API key, and 100 knowledge units. No credit card required. Pro plans start at $21/month with launch pricing.' },
  { q: 'What types of knowledge can I store?', a: 'IndustryX supports 8+ knowledge categories: Skills, SOPs, Architecture, Security, Economy, Deployment, Standards, and Analytics. Custom categories are also supported.' },
  { q: 'How is IndustryX different from traditional documentation tools?', a: 'Traditional tools like Confluence, Notion, or Git wikis are built for human readers. IndustryX is built for AI agents. Our JSON Knowledge Units are machine-readable, searchable by vector embedding, and retrievable through MCP — meaning AI agents get exactly what they need without loading entire documentation sites.' },
  { q: 'Can I use IndustryX with multiple AI agents simultaneously?', a: 'Yes. IndustryX supports multiple API keys and concurrent connections. Each agent can connect independently through the MCP server, and usage is tracked per API key. Team members can share workspaces while maintaining individual access controls.' },
  { q: 'How does the context builder work?', a: 'The context builder takes a natural language query, performs semantic search across all knowledge units, ranks results by our hybrid scoring algorithm, then assembles the top results within a configurable token budget. You can set maxDocuments and maxTokenBudget to control exactly how much context your agent receives.' },
  { q: 'Is my knowledge data secure?', a: 'Yes. IndustryX uses API key authentication for all MCP connections, supports workspace-level access controls with role-based permissions (owner, admin, member, viewer), and encrypts data in transit. Knowledge units are logically isolated per workspace.' },
  { q: 'What happens when I update a knowledge unit?', a: 'Updates propagate immediately. Any AI agent making a subsequent query will receive the latest version. There is no caching staleness — each search request retrieves from the current knowledge base. This ensures agents always work with up-to-date information.' },
  { q: 'Can I migrate from markdown documentation to IndustryX?', a: 'Yes. IndustryX provides tools to convert existing markdown files into structured JSON Knowledge Units. The migration process preserves your content structure while adding AI-optimized fields like intents, tags, rules, and anti-patterns that make the knowledge more discoverable by semantic search.' },
  { q: 'What kind of support is available?', a: 'Free users get community support. Pro users get priority email support with 24-hour response time. Ultra users get premium support with dedicated Slack channel and 4-hour response SLA. Enterprise customers get a dedicated success manager and custom SLA.' },
]

const jsonLdScripts = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'IndustryX',
    description: 'AI-Native Knowledge Infrastructure for Coding Agents. One MCP endpoint. Semantic retrieval platform.',
    url: 'https://industryx.io',
    logo: 'https://industryx.io/logo.svg',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'IndustryX Knowledge Platform',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description: 'AI-native knowledge infrastructure platform with MCP server for coding agents. Semantic retrieval, token optimization, and structured JSON knowledge units.',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', description: 'Personal account, 1K API requests/mo' },
      { '@type': 'Offer', name: 'Pro', price: '21', priceCurrency: 'USD', description: '50K API requests/mo, 5 API keys, 5K knowledge units' },
      { '@type': 'Offer', name: 'Ultra', price: '100', priceCurrency: 'USD', description: '500K API requests/mo, 50 API keys, 50K knowledge units' },
    ],
    featureList: ['MCP Server with SSE transport', 'Semantic vector search', 'Context builder with token budget', '8 MCP tools for AI agents', 'API key management', 'GitHub and Google OAuth', 'Team workspaces', 'Usage analytics'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  },
]

export default function Page() {
  return (
    <>
      {/* JSON-LD Structured Data — server-rendered for crawlers */}
      {jsonLdScripts.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <HomePage />
    </>
  )
}
