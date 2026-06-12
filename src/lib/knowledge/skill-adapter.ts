// IndustryX Knowledge MCP Server - Skill Format Adapter
// Auto-detects and transforms skill-format JSON (design-systems, etc.)
// into the standard KnowledgeUnit format for ingestion.
//
// Design-systems skills use: {name, description, role, whatYouDo, bestPractices, ...}
// KnowledgeUnit expects:     {id, title, category, description, tags, intents, rules, ...}

import type { KnowledgeCategory, KnowledgeExample } from '@/types/knowledge';

// ─── Skill Format Detection ─────────────────────────────────────────────────

/**
 * Detect if a JSON object is in "skill format" (design-systems, etc.)
 * Skill format is characterized by: name, role, whatYouDo, bestPractices
 */
export function isSkillFormat(data: Record<string, unknown>): boolean {
  return (
    typeof data.name === 'string' &&
    typeof data.role === 'string' &&
    typeof data.whatYouDo === 'string' &&
    Array.isArray(data.bestPractices)
  );
}

/**
 * Detect if a JSON object is a "command format" (audit-system, create-component, etc.)
 * Command format is characterized by: name, steps, output, argumentHint
 */
export function isCommandFormat(data: Record<string, unknown>): boolean {
  return (
    typeof data.name === 'string' &&
    Array.isArray(data.steps) &&
    typeof data.output === 'string'
  );
}

/**
 * Detect if a file should be skipped entirely (metadata files, not knowledge units)
 */
export function shouldSkipFile(filename: string): boolean {
  const skipFiles = [
    'plugin.json',     // Plugin metadata
    'overview.json',   // Index/summary file
    'package.json',    // Package metadata
  ];
  return skipFiles.includes(filename);
}

// ─── Skill → KnowledgeUnit Transformation ───────────────────────────────────

interface TransformContext {
  filename: string;
  relativePath: string;
  categoryFromPath: KnowledgeCategory | undefined;
}

/**
 * Transform a skill-format JSON into KnowledgeUnit-compatible fields.
 * Extracts semantic content from the skill structure and maps it to
 * the flat arrays expected by the knowledge system.
 */
export function transformSkillToKnowledgeUnit(
  data: Record<string, unknown>,
  context: TransformContext
): {
  slug: string;
  title: string;
  category: KnowledgeCategory;
  description: string;
  tags: string[];
  intents: string[];
  dependencies: string[];
  antiPatterns: string[];
  implementationSteps: string[];
  rules: string[];
  examples: KnowledgeExample[];
  references: string[];
  rawContent: string;
} {
  const name = data.name as string;
  const isCommand = isCommandFormat(data);

  // Derive slug from name
  const slug = `design-systems-${name}`;

  // Derive title from name (prettify)
  const title = isCommand
    ? `/${name} Command`
    : `${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Skill`;

  // Category
  const category = context.categoryFromPath || 'design-systems';

  // Description
  const description = (data.description as string) || (data.whatYouDo as string) || '';

  // ─── Tags: extract from the skill structure ────────────────────────────

  const tags = extractTags(data, isCommand);

  // ─── Intents: derive from role, whatYouDo, description ────────────────

  const intents = extractIntents(data, isCommand);

  // ─── Dependencies: cross-references to other skills/commands ──────────

  const dependencies = extractDependencies(data, isCommand);

  // ─── Anti-patterns: extract from commonPitfalls, antiPatternGuidance ──

  const antiPatterns = extractAntiPatterns(data);

  // ─── Implementation steps ──────────────────────────────────────────────

  const implementationSteps = extractImplementationSteps(data, isCommand);

  // ─── Rules: extract from bestPractices and structured content ──────────

  const rules = extractRules(data, isCommand);

  // ─── Examples: extract from structured content ─────────────────────────

  const examples = extractExamples(data);

  // ─── References ────────────────────────────────────────────────────────

  const references = isCommand && Array.isArray(data.followUp)
    ? (data.followUp as string[]).map(f => `design-systems-${f}`)
    : [];

  // ─── Raw content: preserve the full original JSON ──────────────────────

  const rawContent = JSON.stringify(data);

  return {
    slug,
    title,
    category,
    description,
    tags,
    intents,
    dependencies,
    antiPatterns,
    implementationSteps,
    rules,
    examples,
    references,
    rawContent,
  };
}

// ─── Extraction Helpers ─────────────────────────────────────────────────────

function extractTags(data: Record<string, unknown>, isCommand: boolean): string[] {
  const tags = new Set<string>();

  // Core tags
  tags.add('design-systems');
  tags.add(data.name as string);

  if (isCommand) {
    tags.add('command');
    tags.add('workflow');
  } else {
    tags.add('skill');
  }

  // Extract from category-like fields
  if (Array.isArray(data.categories)) {
    for (const cat of data.categories as string[]) {
      tags.add(cat.toLowerCase());
    }
  }

  // Extract from tokenCategories keys
  if (data.tokenCategories && typeof data.tokenCategories === 'object') {
    for (const key of Object.keys(data.tokenCategories as Record<string, unknown>)) {
      tags.add(key);
    }
  }

  // Extract from themeTypes keys
  if (data.themeTypes && typeof data.themeTypes === 'object') {
    for (const key of Object.keys(data.themeTypes as Record<string, unknown>)) {
      tags.add(key);
    }
  }

  // Extract from severityRatings
  if (Array.isArray(data.severityRatings)) {
    for (const item of data.severityRatings as Array<Record<string, string>>) {
      if (item.level) tags.add(item.level.toLowerCase());
    }
  }

  // Extract from naming fields
  if (typeof data.naming === 'string') tags.add('naming');
  if (data.patterns && typeof data.patterns === 'object') {
    for (const key of Object.keys(data.patterns as Record<string, unknown>)) {
      tags.add(key);
    }
  }

  // Extract from duration/easing tokens (motion-system)
  if (Array.isArray(data.durationTokens)) {
    tags.add('duration');
    tags.add('animation');
  }
  if (Array.isArray(data.easingTokens)) {
    tags.add('easing');
    tags.add('transition');
  }

  // Extract from ownership models
  if (data.ownershipModels && typeof data.ownershipModels === 'object') {
    for (const key of Object.keys(data.ownershipModels as Record<string, unknown>)) {
      tags.add(key);
    }
  }

  // Extract from rtl support
  if (data.rtlSupport) tags.add('rtl');
  if (data.textExpansion) tags.add('i18n');

  // Extract from icon categories
  if (Array.isArray(data.categories)) {
    for (const cat of data.categories as string[]) {
      tags.add(cat.toLowerCase());
    }
  }

  return [...tags].slice(0, 20); // Cap at 20 tags
}

function extractIntents(data: Record<string, unknown>, isCommand: boolean): string[] {
  const intents = new Set<string>();

  // From description
  const desc = (data.description as string) || '';
  const descLower = desc.toLowerCase();

  // Generate intent phrases from the skill's purpose
  const name = data.name as string;

  if (isCommand) {
    intents.add(`run ${name}`);
    intents.add(`execute ${name}`);
    intents.add(descLower);
  } else {
    intents.add(`how to ${name.replace(/-/g, ' ')}`);
    intents.add(`${name.replace(/-/g, ' ')} guidelines`);
    intents.add(`${name.replace(/-/g, ' ')} best practices`);
    intents.add(descLower);

    // From whatYouDo
    if (typeof data.whatYouDo === 'string') {
      // Extract key action phrases
      const sentences = (data.whatYouDo as string).split(/[.!?]+/).filter(s => s.trim());
      for (const sentence of sentences.slice(0, 3)) {
        intents.add(sentence.trim().toLowerCase());
      }
    }
  }

  // Category-specific intents
  if (name.includes('token')) {
    intents.add('define design tokens');
    intents.add('organize tokens');
  }
  if (name.includes('component')) {
    intents.add('spec a component');
    intents.add('component specification');
  }
  if (name.includes('accessibility') || name.includes('a11y')) {
    intents.add('audit accessibility');
    intents.add('wcag compliance');
  }
  if (name.includes('them')) {
    intents.add('create theme');
    intents.add('dark mode setup');
  }
  if (name.includes('motion') || name.includes('animation')) {
    intents.add('define motion system');
    intents.add('animation tokens');
  }
  if (name.includes('governance')) {
    intents.add('design system governance');
    intents.add('versioning strategy');
  }
  if (name.includes('localization') || name.includes('i18n')) {
    intents.add('localize interface');
    intents.add('rtl support');
  }
  if (name.includes('icon')) {
    intents.add('icon system design');
  }
  if (name.includes('naming')) {
    intents.add('naming conventions');
  }
  if (name.includes('pattern')) {
    intents.add('document patterns');
  }
  if (name.includes('documentation')) {
    intents.add('document components');
  }

  return [...intents].slice(0, 15);
}

function extractDependencies(data: Record<string, unknown>, isCommand: boolean): string[] {
  const deps = new Set<string>();

  if (isCommand) {
    // Commands reference skills in their step descriptions
    const steps = data.steps as Array<Record<string, string>> | undefined;
    if (Array.isArray(steps)) {
      for (const step of steps) {
        const desc = step.description || '';
        // Find `skill-name` skill references
        const refs = desc.match(/`([^`]+)` skill/g);
        if (refs) {
          for (const ref of refs) {
            const skillName = ref.replace(/`/g, '').replace(' skill', '');
            deps.add(`design-systems-${skillName}`);
          }
        }
      }
    }
  } else {
    // Skills can reference other skills through various fields
    if (Array.isArray(data.relatedPatterns)) {
      for (const p of data.relatedPatterns as string[]) deps.add(`design-systems-${p}`);
    }
    if (Array.isArray(data.followUp)) {
      for (const f of data.followUp as string[]) deps.add(`design-systems-${f}`);
    }
  }

  return [...deps];
}

function extractAntiPatterns(data: Record<string, unknown>): string[] {
  const patterns: string[] = [];

  // From commonPitfalls (naming-convention)
  if (Array.isArray(data.commonPitfalls)) {
    for (const pitfall of data.commonPitfalls as string[]) {
      patterns.push(pitfall);
    }
  }

  // From antiPatternGuidance (pattern-library)
  if (typeof data.antiPatternGuidance === 'string') {
    patterns.push(data.antiPatternGuidance);
  }

  // From darkModeConsiderations (theming-system)
  if (Array.isArray(data.darkModeConsiderations)) {
    for (const item of data.darkModeConsiderations as string[]) {
      if (item.toLowerCase().includes("don't") || item.toLowerCase().includes('avoid') || item.toLowerCase().includes('not')) {
        patterns.push(item);
      }
    }
  }

  // From commonPitfalls in naming-convention
  if (Array.isArray(data.commonPitfalls)) {
    for (const p of data.commonPitfalls as string[]) patterns.push(p);
  }

  return patterns.slice(0, 10);
}

function extractImplementationSteps(data: Record<string, unknown>, isCommand: boolean): string[] {
  const steps: string[] = [];

  if (isCommand && Array.isArray(data.steps)) {
    // Commands have explicit steps
    for (const step of data.steps as Array<Record<string, string>>) {
      if (step.step && step.description) {
        steps.push(`${step.step}: ${step.description}`);
      }
    }
  } else {
    // Skills: derive steps from structured content
    if (Array.isArray(data.specificationStructure)) {
      for (const section of data.specificationStructure as Array<Record<string, string>>) {
        steps.push(`Define ${section.section}: ${section.description}`);
      }
    }

    if (Array.isArray(data.patternEntryStructure)) {
      for (const section of data.patternEntryStructure as Array<Record<string, string>>) {
        steps.push(`Document ${section.section}: ${section.description}`);
      }
    }

    if (Array.isArray(data.contributionProcess)) {
      for (const step of data.contributionProcess as Array<Record<string, string>>) {
        steps.push(`${step.step}: ${step.description}`);
      }
    }

    if (Array.isArray(data.deprecationProcess)) {
      for (const p of data.deprecationProcess as string[]) {
        steps.push(`Deprecation: ${p}`);
      }
    }

    if (Array.isArray(data.implementation)) {
      for (const impl of data.implementation as string[]) {
        steps.push(`Implement: ${impl}`);
      }
    }

    // Token tiers as steps
    if (Array.isArray(data.tokenTiers)) {
      for (const tier of data.tokenTiers as Array<Record<string, string>>) {
        steps.push(`Create ${tier.tier}: ${tier.description}`);
      }
    }

    // Quality standards as steps
    if (Array.isArray(data.qualityStandards)) {
      for (const std of data.qualityStandards as string[]) {
        steps.push(`Ensure: ${std}`);
      }
    }
  }

  return steps.slice(0, 15);
}

function extractRules(data: Record<string, unknown>, isCommand: boolean): string[] {
  const rules: string[] = [];

  // From bestPractices → convert to rules
  if (Array.isArray(data.bestPractices)) {
    for (const bp of data.bestPractices as string[]) {
      rules.push(`Best practice: ${bp}`);
    }
  }

  // From principles
  if (Array.isArray(data.principles)) {
    for (const p of data.principles as string[]) {
      rules.push(`Principle: ${p}`);
    }
  }

  // From namingConvention
  if (typeof data.namingConvention === 'string') {
    rules.push(`Naming: ${data.namingConvention}`);
  }

  // From naming patterns
  if (data.patterns && typeof data.patterns === 'object') {
    for (const [key, value] of Object.entries(data.patterns as Record<string, unknown>)) {
      if (typeof value === 'string') {
        rules.push(`${key} naming: ${value}`);
      }
    }
  }

  // From choreography rules
  if (data.choreographyRules && typeof data.choreographyRules === 'object') {
    for (const [key, value] of Object.entries(data.choreographyRules as Record<string, string>)) {
      rules.push(`Choreography - ${key}: ${value}`);
    }
  }

  // From reduced motion rules
  if (data.reducedMotion && typeof data.reducedMotion === 'object') {
    for (const [key, value] of Object.entries(data.reducedMotion as Record<string, string>)) {
      rules.push(`Reduced motion - ${key}: ${value}`);
    }
  }

  // From breaking change policy
  if (Array.isArray(data.breakingChangePolicy)) {
    for (const p of data.breakingChangePolicy as string[]) {
      rules.push(`Breaking change: ${p}`);
    }
  }

  // From severity ratings
  if (Array.isArray(data.severityRatings)) {
    for (const sr of data.severityRatings as Array<Record<string, string>>) {
      rules.push(`Severity ${sr.level}: ${sr.description}`);
    }
  }

  // From WCAG principles
  if (data.wcagPrinciples && typeof data.wcagPrinciples === 'object') {
    for (const [key, value] of Object.entries(data.wcagPrinciples as Record<string, string>)) {
      rules.push(`WCAG ${key}: ${value}`);
    }
  }

  // From design system implications
  if (Array.isArray(data.designSystemImplications)) {
    for (const impl of data.designSystemImplications as string[]) {
      rules.push(`Implication: ${impl}`);
    }
  }

  return rules.slice(0, 20);
}

function extractExamples(data: Record<string, unknown>): KnowledgeExample[] {
  const examples: KnowledgeExample[] = [];

  // From durationTokens
  if (Array.isArray(data.durationTokens)) {
    for (const token of data.durationTokens as Array<Record<string, string>>) {
      examples.push({
        name: token.token || 'duration token',
        description: `${token.value} — ${token.use}`,
      });
    }
  }

  // From easingTokens
  if (Array.isArray(data.easingTokens)) {
    for (const token of data.easingTokens as Array<Record<string, string>>) {
      examples.push({
        name: token.token || 'easing token',
        description: `${token.curve} — ${token.use}`,
      });
    }
  }

  // From tokenTiers
  if (Array.isArray(data.tokenTiers)) {
    for (const tier of data.tokenTiers as Array<Record<string, string>>) {
      examples.push({
        name: tier.tier || 'token tier',
        description: tier.description,
      });
    }
  }

  // From versioning types
  if (data.versioning && typeof data.versioning === 'object') {
    const versioning = data.versioning as Record<string, unknown>;
    if (Array.isArray(versioning.types)) {
      for (const v of versioning.types as Array<Record<string, string>>) {
        examples.push({
          name: v.type || 'version type',
          description: v.when,
        });
      }
    }
  }

  // From textExpansion rates
  if (data.textExpansion && typeof data.textExpansion === 'object') {
    const te = data.textExpansion as Record<string, unknown>;
    if (Array.isArray(te.expansionRates)) {
      for (const rate of te.expansionRates as Array<Record<string, string>>) {
        examples.push({
          name: rate.language || 'language',
          description: rate.expansion,
        });
      }
    }
  }

  return examples.slice(0, 15);
}
