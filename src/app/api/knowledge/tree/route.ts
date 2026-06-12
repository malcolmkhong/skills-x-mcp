import { NextResponse } from 'next/server'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

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

// ─── Auto-discovery ─────────────────────────────────────────────────────────

async function discoverDesignSystemSkills(): Promise<Map<string, SkillData>> {
  const skills = new Map<string, SkillData>()
  const skillsDir = join(KNOWLEDGE_DIR, 'design-systems', 'skills')
  try {
    const files = await readdir(skillsDir)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const name = file.replace('.json', '')
      const content = await readFile(join(skillsDir, file), 'utf-8')
      const data = JSON.parse(content)
      skills.set(name, { ...data, _source: 'design-systems/skills' })
    }
  } catch {
    // directory may not exist
  }
  return skills
}

async function discoverDesignSystemCommands(): Promise<Map<string, SkillData>> {
  const commands = new Map<string, SkillData>()
  const commandsDir = join(KNOWLEDGE_DIR, 'design-systems', 'commands')
  try {
    const files = await readdir(commandsDir)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const name = file.replace('.json', '')
      const content = await readFile(join(commandsDir, file), 'utf-8')
      const data = JSON.parse(content)
      commands.set(name, { ...data, _source: 'design-systems/commands' })
    }
  } catch {
    // directory may not exist
  }
  return commands
}

async function discoverRootKnowledge(): Promise<Map<string, SkillData>> {
  const knowledge = new Map<string, SkillData>()

  const domains = ['architecture', 'security', 'economy', 'skills', 'sops', 'deployment']
  for (const domain of domains) {
    const domainDir = join(KNOWLEDGE_DIR, domain)
    try {
      const files = await readdir(domainDir)
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const name = file.replace('.json', '')
        const content = await readFile(join(domainDir, file), 'utf-8')
        const data = JSON.parse(content)
        knowledge.set(name, { ...data, _source: `${domain}/${name}`, _domain: domain })
      }
    } catch {
      // directory may not exist
    }
  }

  return knowledge
}

// ─── Build tree ─────────────────────────────────────────────────────────────

function buildTree(
  categories: CategoryNode[],
  dsSkills: Map<string, SkillData>,
  dsCommands: Map<string, SkillData>,
  rootKnowledge: Map<string, SkillData>,
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
      node.children = buildTree(cat.children, dsSkills, dsCommands, rootKnowledge, currentPath)
    }

    if (cat.items && cat.items.length > 0) {
      const childNodes: TreeNode[] = node.children || []

      for (const itemName of cat.items) {
        let skillData = dsSkills.get(itemName)
        let itemType: 'skill' | 'command' = 'skill'

        if (!skillData) {
          skillData = dsCommands.get(itemName)
          if (skillData) itemType = 'command'
        }

        if (!skillData) {
          skillData = rootKnowledge.get(itemName)
        }

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
  dsSkills: Map<string, SkillData>,
  dsCommands: Map<string, SkillData>,
  rootKnowledge: Map<string, SkillData>
): Array<{ name: string; data: SkillData; matchField: string }> {
  const q = query.toLowerCase()
  const results: Array<{ name: string; data: SkillData; matchField: string }> = []

  const searchMap = (map: Map<string, SkillData>) => {
    for (const [name, data] of map) {
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
  }

  searchMap(dsSkills)
  searchMap(dsCommands)
  searchMap(rootKnowledge)

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

    const [dsSkills, dsCommands, rootKnowledge] = await Promise.all([
      discoverDesignSystemSkills(),
      discoverDesignSystemCommands(),
      discoverRootKnowledge(),
    ])

    if (skillName) {
      const data = dsSkills.get(skillName) || dsCommands.get(skillName) || rootKnowledge.get(skillName)
      if (!data) {
        return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
      }
      return NextResponse.json({ skill: data })
    }

    if (search) {
      const results = searchSkills(search, dsSkills, dsCommands, rootKnowledge)
      return NextResponse.json({ results })
    }

    const categoriesContent = await readFile(CATEGORIES_FILE, 'utf-8')
    const categoriesConfig: CategoriesConfig = JSON.parse(categoriesContent)

    const tree = buildTree(
      categoriesConfig.categories,
      dsSkills,
      dsCommands,
      rootKnowledge,
    )

    const categorizedIds = findCategorizedIds(categoriesConfig.categories)
    const allDiscovered = new Map([...dsSkills, ...dsCommands, ...rootKnowledge])
    const uncategorized: TreeNode[] = []

    for (const [name, data] of allDiscovered) {
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

    const totalSkills = dsSkills.size + dsCommands.size + rootKnowledge.size

    return NextResponse.json({
      tree,
      stats: {
        totalSkills,
        totalCategorized: categorizedIds.size,
        totalUncategorized: uncategorized.length,
        dsSkills: dsSkills.size,
        dsCommands: dsCommands.size,
        rootKnowledge: rootKnowledge.size,
        plugins: 1,
      },
    })
  } catch (error) {
    console.error('Knowledge tree error:', error)
    return NextResponse.json({ error: 'Failed to build knowledge tree' }, { status: 500 })
  }
}
