'use client'

import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { motion } from 'framer-motion'

const FAQS = [
  {
    question: 'What is IndustryX Knowledge MCP Platform?',
    answer:
      'IndustryX is an AI-native knowledge management platform that provides a Model Context Protocol (MCP) server for AI agents. It stores knowledge as structured JSON units — not markdown — and enables semantic retrieval so AI agents only load relevant context, reducing token usage by 80%+ while improving response quality.',
  },
  {
    question: 'What is MCP (Model Context Protocol)?',
    answer:
      'MCP is an open protocol that allows AI agents to connect to external data sources and tools. IndustryX implements MCP as a remote server using SSE (Server-Sent Events) transport and JSON-RPC 2.0, enabling any MCP-compatible client like Claude Code, Cursor, or VS Code to retrieve knowledge on demand.',
  },
  {
    question: 'How does semantic retrieval work?',
    answer:
      'IndustryX uses a hybrid retrieval system that combines vector embedding similarity (40% weight), keyword matching (20%), category matching (15%), intent matching (15%), and usage weighting (10%). This ensures that AI agents receive the most relevant knowledge units without loading entire knowledge bases into context.',
  },
  {
    question: 'How does IndustryX reduce token usage?',
    answer:
      "Instead of loading all knowledge into an AI's context window, IndustryX's context builder retrieves only the top relevant documents within a configurable token budget. Average token savings exceed 80% compared to loading full knowledge bases, with search latency under 100ms and context building under 500ms.",
  },
  {
    question: 'What are JSON Knowledge Units?',
    answer:
      'JSON Knowledge Units are structured data objects that replace traditional markdown documentation. Each unit contains: slug, title, category, tags, intents (for matching user queries), rules, anti-patterns, implementation steps, dependencies, references, and metadata. This structure makes knowledge machine-readable and optimizable for semantic search.',
  },
  {
    question: 'How do I connect my AI agent to IndustryX?',
    answer:
      'Generate an API key from the IndustryX dashboard, then add the MCP server configuration to your client. For Claude Code, add to claude_desktop_config.json. For Cursor, VS Code, and other MCP clients, configure the SSE endpoint similarly.',
  },
  {
    question: 'Is there a free plan available?',
    answer:
      'Yes. IndustryX offers a free forever plan that includes a personal account, basic MCP access, 1,000 API requests per month, 1 API key, and 100 knowledge units. No credit card required. Pro plans start at $21/month with launch pricing.',
  },
  {
    question: 'What types of knowledge can I store?',
    answer:
      'IndustryX supports 8+ knowledge categories: Skills, SOPs, Architecture, Security, Economy, Deployment, Standards, and Analytics. Custom categories are also supported.',
  },
  {
    question: 'How is IndustryX different from traditional documentation tools?',
    answer:
      'Traditional tools like Confluence, Notion, or Git wikis are built for human readers. IndustryX is built for AI agents. Our JSON Knowledge Units are machine-readable, searchable by vector embedding, and retrievable through MCP — meaning AI agents get exactly what they need without loading entire documentation sites.',
  },
  {
    question: 'Can I use IndustryX with multiple AI agents simultaneously?',
    answer:
      'Yes. IndustryX supports multiple API keys and concurrent connections. Each agent can connect independently through the MCP server, and usage is tracked per API key. Team members can share workspaces while maintaining individual access controls.',
  },
  {
    question: 'How does the context builder work?',
    answer:
      'The context builder takes a natural language query, performs semantic search across all knowledge units, ranks results by our hybrid scoring algorithm, then assembles the top results within a configurable token budget. You can set maxDocuments and maxTokenBudget to control exactly how much context your agent receives.',
  },
  {
    question: 'Is my knowledge data secure?',
    answer:
      'Yes. IndustryX uses API key authentication for all MCP connections, supports workspace-level access controls with role-based permissions (owner, admin, member, viewer), and encrypts data in transit. Knowledge units are logically isolated per workspace.',
  },
  {
    question: 'What happens when I update a knowledge unit?',
    answer:
      "Updates propagate immediately. Any AI agent making a subsequent query will receive the latest version. There's no caching staleness — each search request retrieves from the current knowledge base. This ensures agents always work with up-to-date information.",
  },
  {
    question: 'Can I migrate from markdown documentation to IndustryX?',
    answer:
      'Yes. IndustryX provides tools to convert existing markdown files into structured JSON Knowledge Units. The migration process preserves your content structure while adding AI-optimized fields like intents, tags, rules, and anti-patterns that make the knowledge more discoverable by semantic search.',
  },
  {
    question: 'What kind of support is available?',
    answer:
      'Free users get community support. Pro users get priority email support with 24-hour response time. Ultra users get premium support with dedicated Slack channel and 4-hour response SLA. Enterprise customers get a dedicated success manager and custom SLA.',
  },
]

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="py-20 md:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <Badge
            variant="outline"
            className="mb-3 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30"
          >
            FAQ
          </Badge>
          <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need to know about IndustryX Knowledge MCP Platform.
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-border/50 rounded-xl px-5 data-[state=open]:border-emerald-200 dark:data-[state=open]:border-emerald-800 data-[state=open]:bg-emerald-50/30 dark:data-[state=open]:bg-emerald-950/10 transition-colors duration-200"
              >
                <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline py-5">
                  <span className="pr-2">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
