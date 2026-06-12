import { NextResponse } from 'next/server'
import { readFile, readdir } from 'fs/promises'
import { join, relative } from 'path'

const KNOWLEDGE_DIR = join(process.cwd(), 'knowledge')
const CATEGORIES_FILE = join(KNOWLEDGE_DIR, 'categories.json')

// ─── Types ──────────────────────────────────────────────────────────────────

interface TreeNode {
  id: string
  label: string
  icon?: string
  type?: 'plugin' | 'domain' | 'commands' | 'category' | 'skill' | 'command'
  children?: TreeNode[]
  items?: string[]
  skillData?: SkillData | null
  depth: number
  path: string[]
}

interface SkillData {
  name: string
  description: string
  role?: string
  whatYouDo?: string
  [key: string]: unknown
}

interface CategoriesConfig {
  categories: CategoryNode[]
}

interface CategoryNode {
  id: string
  label: string
  icon?: string
  type?: string
  children?: CategoryNode[]
  items?: string[]
}

// ─── Generic recursive JSON discovery ───────────────────────────────────────

/**
 * Recursively scan a directory for .json files and return a Map<slug, SkillData>.
 * The slug is the filename without .json. Each entry gets _source and _domain metadata.
 */
async function discoverJsonFiles(dir: string, baseDir: string = KNOWLEDGE_DIR): Promise<Map<string, SkillData>> {
  const result = new Map<string, SkillData>()

  async function scan(currentDir: string) {
    let entries
    try {
      entries = await readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await scan(fullPath)
      } else if (entry.name.endsWith('.json')) {
        // Skip metadata files
        if (['plugin.json', 'overview.json', 'categories.json', 'package.json'].includes(entry.name)) continue

        const name = entry.name.replace('.json', '')
        try {
          const content = await readFile(fullPath, 'utf-8')
          const data = JSON.parse(content)
          const relPath = relative(baseDir, fullPath)
          const domainPart = relPath.split('/')[0] || ''
          result.set(name, { ...data, _source: relPath, _domain: domainPart })
        } catch {
          // Skip unparseable files
        }
      }
    }
  }

  await scan(dir)
  return result
}

// ─── Build tree ─────────────────────────────────────────────────────────────

function buildTree(
  categories: CategoryNode[],
  allSkills: Map<string, SkillData>,
  parentPath: string[] = []
): TreeNode[] {
  return categories.map(cat => {
    const currentPath = [...parentPath, cat.label]
    const node: TreeNode = {
      id: cat.id,
      label: cat.label,
      icon: cat.icon,
      type: cat.type as TreeNode['type'],
      depth: currentPath.length,
      path: currentPath,
    }

    if (cat.children && cat.children.length > 0) {
      node.children = buildTree(cat.children, allSkills, currentPath)
    }

    if (cat.items && cat.items.length > 0) {
      const childNodes: TreeNode[] = node.children || []

      for (const itemName of cat.items) {
        const skillData = allSkills.get(itemName)
        const itemType: 'skill' | 'command' = skillData && isCommandData(skillData) ? 'command' : 'skill'

        const label = skillData?.title || skillData?.name || itemName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

        childNodes.push({
          id: itemName,
          label,
          type: itemType,
          depth: currentPath.length + 1,
          path: [...currentPath, label],
          skillData: skillData || null,
        })
      }

      node.children = childNodes
    }

    return node
  })
}

function isCommandData(data: SkillData): boolean {
  return Array.isArray(data.steps) && typeof data.output === 'string'
}

// ─── Find uncategorized skills ──────────────────────────────────────────────

function findCategorizedIds(categories: CategoryNode[]): Set<string> {
  const ids = new Set<string>()
  for (const cat of categories) {
    if (cat.items) {
      for (const item of cat.items) ids.add(item)
    }
    if (cat.children) {
      const childIds = findCategorizedIds(cat.children)
      for (const id of childIds) ids.add(id)
    }
  }
  return ids
}

// ─── Search ─────────────────────────────────────────────────────────────────

function searchSkills(
  query: string,
  allSkills: Map<string, SkillData>
): Array<{ name: string; data: SkillData; matchField: string }> {
  const q = query.toLowerCase()
  const results: Array<{ name: string; data: SkillData; matchField: string }> = []

  for (const [name, data] of allSkills) {
    if (data.name?.toLowerCase().includes(q)) {
      results.push({ name, data, matchField: 'name' })
    } else if (data.title?.toLowerCase().includes(q)) {
      results.push({ name, data, matchField: 'title' })
    } else if (data.description?.toLowerCase().includes(q)) {
      results.push({ name, data, matchField: 'description' })
    } else if (data.role?.toLowerCase().includes(q)) {
      results.push({ name, data, matchField: 'role' })
    } else if (data.whatYouDo?.toLowerCase().includes(q)) {
      results.push({ name, data, matchField: 'whatYouDo' })
    } else if (Array.isArray(data.tags) && data.tags.some((t: string) => t.toLowerCase().includes(q))) {
      results.push({ name, data, matchField: 'tags' })
    } else if (Array.isArray(data.intents) && data.intents.some((i: string) => i.toLowerCase().includes(q))) {
      results.push({ name, data, matchField: 'intents' })
    }
  }

  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.name)) return false
    seen.add(r.name)
    return true
  })
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('q')
    const skillName = searchParams.get('skill')

    // Single recursive scan discovers ALL JSON knowledge files
    const allSkills = await discoverJsonFiles(KNOWLEDGE_DIR)

    if (skillName) {
      const data = allSkills.get(skillName)
      if (!data) {
        return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
      }
      return NextResponse.json({ skill: data })
    }

    if (search) {
      const results = searchSkills(search, allSkills)
      return NextResponse.json({ results })
    }

    const categoriesContent = await readFile(CATEGORIES_FILE, 'utf-8')
    const categoriesConfig: CategoriesConfig = JSON.parse(categoriesContent)

    const tree = buildTree(categoriesConfig.categories, allSkills)

    const categorizedIds = findCategorizedIds(categoriesConfig.categories)
    const uncategorized: TreeNode[] = []

    for (const [name, data] of allSkills) {
      if (!categorizedIds.has(name)) {
        const label = data.title || data.name || name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        uncategorized.push({
          id: name,
          label,
          type: 'skill',
          depth: 2,
          path: ['Uncategorized', label],
          skillData: data,
        })
      }
    }

    if (uncategorized.length > 0) {
      tree.push({
        id: 'uncategorized',
        label: 'Uncategorized',
        icon: 'FileQuestion',
        type: 'category',
        depth: 1,
        path: ['Uncategorized'],
        children: uncategorized,
      })
    }

    return NextResponse.json({
      tree,
      stats: {
        totalSkills: allSkills.size,
        totalCategorized: categorizedIds.size,
        totalUncategorized: uncategorized.length,
        plugins: 1,
      },
    })
  } catch (error) {
    console.error('Knowledge tree error:', error)
    return NextResponse.json({ error: 'Failed to build knowledge tree' }, { status: 500 })
  }
}
