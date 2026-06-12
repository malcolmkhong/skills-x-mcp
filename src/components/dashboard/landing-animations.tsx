'use client'

import React from 'react'
import { motion, type Variants } from 'framer-motion'

// ─── Shared viewport config ────────────────────────────────────────────────
const defaultViewport = { once: true, margin: '-100px' as const }
const defaultTransition = { duration: 0.5, ease: 'easeOut' }

// ─── FadeIn ────────────────────────────────────────────────────────────────
// Fades in from below (or configurable direction) with optional delay

type Direction = 'up' | 'down' | 'left' | 'right'

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  direction?: Direction
  duration?: number
  className?: string
  y?: number
  x?: number
}

const directionOffset: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
}

export function FadeIn({
  children,
  delay = 0,
  direction = 'up',
  duration = 0.5,
  className,
  y,
  x,
}: FadeInProps) {
  const offset = directionOffset[direction]
  const yOffset = y ?? offset.y
  const xOffset = x ?? offset.x

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset, x: xOffset }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={defaultViewport}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── StaggerContainer ──────────────────────────────────────────────────────
// Parent container that staggers its children

interface StaggerContainerProps {
  children: React.ReactNode
  delay?: number
  stagger?: number
  className?: string
}

const staggerContainerVariants = (stagger: number, delay: number): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger,
      delayChildren: delay,
    },
  },
})

export function StaggerContainer({
  children,
  delay = 0,
  stagger = 0.08,
  className,
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainerVariants(stagger, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── StaggerItem ───────────────────────────────────────────────────────────
// Individual item inside StaggerContainer

interface StaggerItemProps {
  children: React.ReactNode
  className?: string
}

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  )
}

// ─── ScaleIn ───────────────────────────────────────────────────────────────
// Scales from 0.95 to 1 on scroll

interface ScaleInProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}

export function ScaleIn({
  children,
  delay = 0,
  duration = 0.5,
  className,
}: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={defaultViewport}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── SlideIn ───────────────────────────────────────────────────────────────
// Slides in from left or right

interface SlideInProps {
  children: React.ReactNode
  direction?: 'left' | 'right'
  delay?: number
  duration?: number
  className?: string
  distance?: number
}

export function SlideIn({
  children,
  direction = 'left',
  delay = 0,
  duration = 0.5,
  className,
  distance = 40,
}: SlideInProps) {
  const xOffset = direction === 'left' ? -distance : distance

  return (
    <motion.div
      initial={{ opacity: 0, x: xOffset }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={defaultViewport}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
