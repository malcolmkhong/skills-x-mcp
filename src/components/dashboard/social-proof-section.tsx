'use client'

import React from 'react'
import { Star, Shield, Globe, Key, BarChart3, Lock, Quote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FadeIn, StaggerContainer, StaggerItem } from './landing-animations'

// ─── Logo Data ──────────────────────────────────────────────────────────────

const LOGOS = [
  { name: 'Acme Corp', weight: 'font-extrabold', size: 'text-xl', color: 'text-slate-700 dark:text-slate-300' },
  { name: 'TechFlow', weight: 'font-semibold', size: 'text-lg', color: 'text-emerald-700 dark:text-emerald-300' },
  { name: 'DataVerse', weight: 'font-bold', size: 'text-2xl', color: 'text-violet-700 dark:text-violet-300' },
  { name: 'CloudNine', weight: 'font-medium', size: 'text-lg', color: 'text-sky-700 dark:text-sky-300' },
  { name: 'Quantum AI', weight: 'font-extrabold', size: 'text-xl', color: 'text-amber-700 dark:text-amber-300' },
  { name: 'NextGen Labs', weight: 'font-semibold', size: 'text-lg', color: 'text-rose-700 dark:text-rose-300' },
  { name: 'SynergyIO', weight: 'font-bold', size: 'text-xl', color: 'text-teal-700 dark:text-teal-300' },
  { name: 'DevForge', weight: 'font-medium', size: 'text-2xl', color: 'text-orange-700 dark:text-orange-300' },
]

// ─── Testimonial Data ───────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Lead Engineer',
    company: 'TechFlow',
    initials: 'SC',
    avatarColor: 'bg-emerald-500',
    quote:
      'IndustryX reduced our AI agent context size by 85%. The semantic search is incredibly accurate — our agents now produce consistently better code.',
    stars: 5,
  },
  {
    name: 'Marcus Rodriguez',
    role: 'CTO',
    company: 'DataVerse',
    initials: 'MR',
    avatarColor: 'bg-violet-500',
    quote:
      'We went from loading 400+ markdown files to a single MCP endpoint. Setup took 30 minutes. The token savings paid for the Pro plan in the first week.',
    stars: 5,
  },
  {
    name: 'Aisha Patel',
    role: 'AI Platform Lead',
    company: 'Quantum AI',
    initials: 'AP',
    avatarColor: 'bg-amber-500',
    quote:
      'The JSON Knowledge Units format is brilliant. Our agents retrieve exactly what they need, when they need it. No more context bloat or contradictions.',
    stars: 5,
  },
]

// ─── Trust Metrics Data ─────────────────────────────────────────────────────

const TRUST_METRICS = [
  { icon: Lock, label: 'SOC 2 Compliant' },
  { icon: Globe, label: '99.9% Uptime SLA' },
  { icon: Shield, label: 'Enterprise Ready' },
  { icon: Key, label: 'API Key Auth' },
  { icon: BarChart3, label: 'Real-time Analytics' },
]

// ─── Logo Marquee Item ──────────────────────────────────────────────────────

function LogoItem({ name, weight, size, color }: (typeof LOGOS)[number]) {
  return (
    <div className="flex items-center justify-center px-6 py-3 mx-2 rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm shrink-0 select-none">
      <span className={`${weight} ${size} ${color} tracking-tight whitespace-nowrap`}>
        {name}
      </span>
    </div>
  )
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < count
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

// ─── Marquee CSS ─────────────────────────────────────────────────────────────
// Inject keyframes for smooth infinite horizontal scroll

const marqueeStyles = `
@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.marquee-track {
  animation: marquee-scroll 30s linear infinite;
}

.marquee-track:hover {
  animation-play-state: paused;
}
`

// ─── Social Proof Section ────────────────────────────────────────────────────

export function SocialProofSection() {
  return (
    <section id="social-proof" aria-labelledby="social-proof-heading" className="py-20 md:py-24">
      {/* Inject marquee keyframes */}
      <style dangerouslySetInnerHTML={{ __html: marqueeStyles }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <FadeIn className="text-center mb-14">
          <Badge
            variant="outline"
            className="mb-3 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30"
          >
            Trusted by Teams
          </Badge>
          <h2
            id="social-proof-heading"
            className="text-3xl sm:text-4xl font-bold"
          >
            Trusted by Engineering Teams Worldwide
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            From startups to enterprises, teams rely on IndustryX to power their AI agents with precise, relevant knowledge.
          </p>
        </FadeIn>

        {/* Part 1: Logo Marquee */}
        <FadeIn delay={0.1}>
          <div
            className="relative overflow-hidden mb-16"
            aria-label="Trusted companies"
          >
            {/* Left fade gradient */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-background to-transparent" />
            {/* Right fade gradient */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-background to-transparent" />

            {/* Marquee track — duplicated for seamless loop */}
            <div className="marquee-track flex items-center w-max">
              {LOGOS.map((logo) => (
                <LogoItem key={`a-${logo.name}`} {...logo} />
              ))}
              {LOGOS.map((logo) => (
                <LogoItem key={`b-${logo.name}`} {...logo} />
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Part 2: Testimonial Cards */}
        <StaggerContainer
          stagger={0.12}
          delay={0.1}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          {TESTIMONIALS.map((testimonial) => (
            <StaggerItem key={testimonial.name}>
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors duration-300">
                <CardContent className="p-6 flex flex-col h-full">
                  {/* Quote icon + Stars */}
                  <div className="flex items-center justify-between mb-4">
                    <Quote className="h-8 w-8 text-emerald-200 dark:text-emerald-800 shrink-0" aria-hidden="true" />
                    <StarRating count={testimonial.stars} />
                  </div>

                  {/* Quote text */}
                  <blockquote className="text-sm leading-relaxed text-foreground/80 mb-6 flex-1">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>

                  {/* Author info */}
                  <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                    {/* Avatar with initials */}
                    <div
                      className={`w-10 h-10 rounded-full ${testimonial.avatarColor} flex items-center justify-center shrink-0`}
                      aria-hidden="true"
                    >
                      <span className="text-white text-sm font-semibold">
                        {testimonial.initials}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {testimonial.role} at {testimonial.company}
                      </p>
                    </div>
                    {/* Company badge */}
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 shrink-0"
                    >
                      {testimonial.company}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Part 3: Trust Metrics */}
        <FadeIn delay={0.2}>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8">
            {TRUST_METRICS.map((metric) => {
              const Icon = metric.icon
              return (
                <div
                  key={metric.label}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border/40 bg-card/50 backdrop-blur-sm hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors duration-200"
                >
                  <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium text-foreground/80 whitespace-nowrap">
                    {metric.label}
                  </span>
                </div>
              )
            })}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
