'use client'

import { Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'

const WITHOUT_ITEMS = [
  'Load 500+ markdown files into context',
  'No semantic search — brute force retrieval',
  'Bloated context windows = high token cost',
  'Contradictions from duplicate knowledge',
  'Manual updates across 20+ files',
  'No standard structure for AI consumption',
  'Every agent loads everything independently',
  'No version control on knowledge',
]

const WITH_ITEMS = [
  'One MCP endpoint — connect in 30 seconds',
  'Hybrid semantic retrieval in <100ms',
  '80%+ token reduction with budget control',
  'Single source of truth — no contradictions',
  'Update once, all agents get latest instantly',
  'Structured JSON units built for AI agents',
  'Agents request only what they need',
  'Full versioning and change tracking',
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' },
  }),
}

export function ComparisonSection() {
  return (
    <section id="comparison" aria-labelledby="comparison-heading" className="py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <Badge
            variant="outline"
            className="mb-3 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30"
          >
            Before vs After
          </Badge>
          <h2
            id="comparison-heading"
            className="text-3xl sm:text-4xl font-bold"
          >
            See the Difference
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Traditional documentation workflows vs the IndustryX approach — side by side.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 max-w-5xl mx-auto">
          {/* VS Badge — centered between columns on desktop */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg flex items-center justify-center">
              <span className="text-white font-extrabold text-sm tracking-wide">VS</span>
            </div>
          </div>

          {/* Mobile VS Badge */}
          <div className="flex md:hidden justify-center -my-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg flex items-center justify-center">
              <span className="text-white font-extrabold text-xs tracking-wide">VS</span>
            </div>
          </div>

          {/* Left: Without IndustryX */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Card className="border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10 h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                    <X className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-red-700 dark:text-red-300">
                      Without IndustryX
                    </h3>
                    <p className="text-xs text-red-600/70 dark:text-red-400/60">
                      Traditional approach
                    </p>
                  </div>
                </div>

                <ul className="space-y-3" aria-label="Problems without IndustryX">
                  {WITHOUT_ITEMS.map((item, i) => (
                    <motion.li
                      key={item}
                      custom={i}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      variants={fadeUp}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="h-3 w-3 text-red-500 dark:text-red-400" aria-hidden="true" />
                      </div>
                      <span className="text-red-900/80 dark:text-red-200/80 leading-snug">
                        {item}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: With IndustryX */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-300">
                      With IndustryX
                    </h3>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">
                      AI-native approach
                    </p>
                  </div>
                </div>

                <ul className="space-y-3" aria-label="Benefits with IndustryX">
                  {WITH_ITEMS.map((item, i) => (
                    <motion.li
                      key={item}
                      custom={i}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      variants={fadeUp}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      </div>
                      <span className="text-emerald-900/80 dark:text-emerald-200/80 leading-snug">
                        {item}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
