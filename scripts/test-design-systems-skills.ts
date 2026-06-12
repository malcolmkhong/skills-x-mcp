/**
 * Design Systems Skill Flow — Verification Script
 *
 * Tests that every skill & command in the design-systems knowledge set:
 *   1. File exists and is readable
 *   2. Contains valid JSON
 *   3. Has all required structural fields
 *   4. Can be fetched through a simulated API flow
 *   5. Cross-references between skills/commands are valid
 *
 * Usage:
 *   bun run scripts/test-design-systems-skills.ts
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

interface SkillMeta {
  name: string;
  description: string;
}

interface CommandMeta {
  name: string;
  description: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const KNOWLEDGE_ROOT = join(import.meta.dir, "..", "knowledge", "design-systems");

const REQUIRED_SKILL_FIELDS = [
  "name",
  "description",
  "role",
  "whatYouDo",
  "bestPractices",
] as const;

const REQUIRED_COMMAND_FIELDS = [
  "name",
  "description",
  "steps",
  "output",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

let totalPassed = 0;
let totalFailed = 0;
const results: TestResult[] = [];

function pass(name: string, details: string) {
  totalPassed++;
  results.push({ name, passed: true, details });
  console.log(`  ✅ ${name}`);
  if (details) console.log(`     ${details}`);
}

function fail(name: string, details: string) {
  totalFailed++;
  results.push({ name, passed: false, details });
  console.log(`  ❌ ${name}`);
  console.log(`     ${details}`);
}

function section(title: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

function loadJson<T>(filePath: string): T | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Test 1: Plugin Metadata ─────────────────────────────────────────────────

function testPluginMetadata() {
  section("1. Plugin Metadata");

  const path = join(KNOWLEDGE_ROOT, "plugin.json");
  if (!existsSync(path)) {
    fail("plugin.json exists", `File not found at ${path}`);
    return;
  }
  pass("plugin.json exists", path);

  const data = loadJson<Record<string, unknown>>(path);
  if (!data) {
    fail("plugin.json is valid JSON", "Failed to parse");
    return;
  }
  pass("plugin.json is valid JSON", "");

  const requiredPluginFields = ["name", "version", "description", "author", "keywords", "license"];
  for (const field of requiredPluginFields) {
    if (data[field]) {
      pass(`plugin.json has "${field}"`, String(data[field]));
    } else {
      fail(`plugin.json has "${field}"`, "Missing field");
    }
  }
}

// ─── Test 2: Overview Index ──────────────────────────────────────────────────

function testOverviewIndex() {
  section("2. Overview Index");

  const path = join(KNOWLEDGE_ROOT, "overview.json");
  if (!existsSync(path)) {
    fail("overview.json exists", `File not found at ${path}`);
    return;
  }
  pass("overview.json exists", path);

  const data = loadJson<{
    name: string;
    skillsCount: number;
    commandsCount: number;
    skills: SkillMeta[];
    commands: CommandMeta[];
  }>(path);

  if (!data) {
    fail("overview.json is valid JSON", "Failed to parse");
    return;
  }
  pass("overview.json is valid JSON", "");

  if (data.skillsCount === data.skills.length) {
    pass(`skillsCount matches actual count`, `${data.skillsCount} skills`);
  } else {
    fail(
      `skillsCount matches actual count`,
      `Expected ${data.skillsCount}, got ${data.skills.length}`
    );
  }

  if (data.commandsCount === data.commands.length) {
    pass(`commandsCount matches actual count`, `${data.commandsCount} commands`);
  } else {
    fail(
      `commandsCount matches actual count`,
      `Expected ${data.commandsCount}, got ${data.commands.length}`
    );
  }

  // Verify each skill listed in overview has a corresponding file
  for (const skill of data.skills) {
    const skillPath = join(KNOWLEDGE_ROOT, "skills", `${skill.name}.json`);
    if (existsSync(skillPath)) {
      pass(`Overview skill "${skill.name}" has file`, skillPath);
    } else {
      fail(`Overview skill "${skill.name}" has file`, `Missing: ${skillPath}`);
    }
  }

  for (const cmd of data.commands) {
    const cmdPath = join(KNOWLEDGE_ROOT, "commands", `${cmd.name}.json`);
    if (existsSync(cmdPath)) {
      pass(`Overview command "${cmd.name}" has file`, cmdPath);
    } else {
      fail(`Overview command "${cmd.name}" has file`, `Missing: ${cmdPath}`);
    }
  }
}

// ─── Test 3: Each Skill File ─────────────────────────────────────────────────

function testSkillFiles() {
  section("3. Skill Files — Structure & Content");

  const overviewPath = join(KNOWLEDGE_ROOT, "overview.json");
  const overview = loadJson<{ skills: SkillMeta[] }>(overviewPath);
  if (!overview) {
    fail("Load overview for skill test", "overview.json not readable");
    return;
  }

  for (const skillMeta of overview.skills) {
    const skillPath = join(KNOWLEDGE_ROOT, "skills", `${skillMeta.name}.json`);

    // 3a. File exists
    if (!existsSync(skillPath)) {
      fail(`Skill "${skillMeta.name}" — file exists`, `Missing: ${skillPath}`);
      continue;
    }
    pass(`Skill "${skillMeta.name}" — file exists`, skillPath);

    // 3b. Valid JSON
    const skill = loadJson<Record<string, unknown>>(skillPath);
    if (!skill) {
      fail(`Skill "${skillMeta.name}" — valid JSON`, "Parse error");
      continue;
    }
    pass(`Skill "${skillMeta.name}" — valid JSON`, "");

    // 3c. Required fields
    for (const field of REQUIRED_SKILL_FIELDS) {
      if (skill[field] !== undefined && skill[field] !== null && skill[field] !== "") {
        const value = skill[field];
        const detail =
          Array.isArray(value)
            ? `${(value as unknown[]).length} items`
            : String(value).substring(0, 80);
        pass(`Skill "${skillMeta.name}" — has "${field}"`, detail);
      } else {
        fail(`Skill "${skillMeta.name}" — has "${field}"`, "Missing or empty");
      }
    }

    // 3d. Name matches filename
    if (skill.name === skillMeta.name) {
      pass(`Skill "${skillMeta.name}" — name matches filename`, "");
    } else {
      fail(
        `Skill "${skillMeta.name}" — name matches filename`,
        `File says "${skill.name}", expected "${skillMeta.name}"`
      );
    }

    // 3e. Description matches overview
    if (skill.description === skillMeta.description) {
      pass(`Skill "${skillMeta.name}" — description matches overview`, "");
    } else {
      fail(
        `Skill "${skillMeta.name}" — description matches overview`,
        `Mismatch: file="${(skill.description as string)?.substring(0, 50)}..." vs overview="${skillMeta.description?.substring(0, 50)}..."`
      );
    }

    // 3f. bestPractices is a non-empty array
    if (Array.isArray(skill.bestPractices) && skill.bestPractices.length > 0) {
      pass(
        `Skill "${skillMeta.name}" — bestPractices non-empty`,
        `${skill.bestPractices.length} items`
      );
    } else {
      fail(`Skill "${skillMeta.name}" — bestPractices non-empty`, "Empty or not an array");
    }

    // 3g. Content depth — at least 3 top-level keys beyond required fields
    const extraKeys = Object.keys(skill).filter(
      (k) => !REQUIRED_SKILL_FIELDS.includes(k as (typeof REQUIRED_SKILL_FIELDS)[number])
    );
    if (extraKeys.length >= 3) {
      pass(`Skill "${skillMeta.name}" — content depth`, `${extraKeys.length} additional keys: ${extraKeys.join(", ")}`);
    } else {
      fail(
        `Skill "${skillMeta.name}" — content depth`,
        `Only ${extraKeys.length} additional keys (expected ≥3): ${extraKeys.join(", ")}`
      );
    }
  }
}

// ─── Test 4: Each Command File ───────────────────────────────────────────────

function testCommandFiles() {
  section("4. Command Files — Structure & Content");

  const overviewPath = join(KNOWLEDGE_ROOT, "overview.json");
  const overview = loadJson<{ commands: CommandMeta[] }>(overviewPath);
  if (!overview) {
    fail("Load overview for command test", "overview.json not readable");
    return;
  }

  for (const cmdMeta of overview.commands) {
    const cmdPath = join(KNOWLEDGE_ROOT, "commands", `${cmdMeta.name}.json`);

    // 4a. File exists
    if (!existsSync(cmdPath)) {
      fail(`Command "${cmdMeta.name}" — file exists`, `Missing: ${cmdPath}`);
      continue;
    }
    pass(`Command "${cmdMeta.name}" — file exists`, cmdPath);

    // 4b. Valid JSON
    const cmd = loadJson<Record<string, unknown>>(cmdPath);
    if (!cmd) {
      fail(`Command "${cmdMeta.name}" — valid JSON`, "Parse error");
      continue;
    }
    pass(`Command "${cmdMeta.name}" — valid JSON`, "");

    // 4c. Required fields
    for (const field of REQUIRED_COMMAND_FIELDS) {
      if (cmd[field] !== undefined && cmd[field] !== null && cmd[field] !== "") {
        const value = cmd[field];
        const detail =
          Array.isArray(value)
            ? `${(value as unknown[]).length} items`
            : String(value).substring(0, 80);
        pass(`Command "${cmdMeta.name}" — has "${field}"`, detail);
      } else {
        fail(`Command "${cmdMeta.name}" — has "${field}"`, "Missing or empty");
      }
    }

    // 4d. Name matches filename
    if (cmd.name === cmdMeta.name) {
      pass(`Command "${cmdMeta.name}" — name matches filename`, "");
    } else {
      fail(
        `Command "${cmdMeta.name}" — name matches filename`,
        `File says "${cmd.name}", expected "${cmdMeta.name}"`
      );
    }

    // 4e. Steps is a non-empty array with correct structure
    if (Array.isArray(cmd.steps) && cmd.steps.length > 0) {
      const stepsWithBoth = (cmd.steps as Array<Record<string, string>>).filter(
        (s) => s.step && s.description
      );
      if (stepsWithBoth.length === (cmd.steps as unknown[]).length) {
        pass(
          `Command "${cmdMeta.name}" — steps well-formed`,
          `${stepsWithBoth.length} steps with step + description`
        );
      } else {
        fail(
          `Command "${cmdMeta.name}" — steps well-formed`,
          `${stepsWithBoth.length}/${(cmd.steps as unknown[]).length} steps have both step + description`
        );
      }
    } else {
      fail(`Command "${cmdMeta.name}" — steps non-empty`, "Empty or not an array");
    }

    // 4f. Cross-reference: followUp commands exist
    if (Array.isArray(cmd.followUp)) {
      for (const followUpName of cmd.followUp as string[]) {
        const followUpPath = join(KNOWLEDGE_ROOT, "commands", `${followUpName}.json`);
        if (existsSync(followUpPath)) {
          pass(
            `Command "${cmdMeta.name}" — followUp "${followUpName}" exists`,
            ""
          );
        } else {
          fail(
            `Command "${cmdMeta.name}" — followUp "${followUpName}" exists`,
            `Missing: ${followUpPath}`
          );
        }
      }
    }

    // 4g. argumentHint present
    if (cmd.argumentHint) {
      pass(`Command "${cmdMeta.name}" — has argumentHint`, String(cmd.argumentHint));
    } else {
      fail(`Command "${cmdMeta.name}" — has argumentHint`, "Missing");
    }
  }
}

// ─── Test 5: Cross-Reference Integrity ───────────────────────────────────────

function testCrossReferences() {
  section("5. Cross-Reference Integrity");

  const overviewPath = join(KNOWLEDGE_ROOT, "overview.json");
  const overview = loadJson<{ skills: SkillMeta[]; commands: CommandMeta[] }>(overviewPath);
  if (!overview) return;

  // Build a set of all known skill names
  const skillNames = new Set(overview.skills.map((s) => s.name));
  const commandNames = new Set(overview.commands.map((c) => c.name));

  // Commands reference skills — check those references exist
  for (const cmdMeta of overview.commands) {
    const cmdPath = join(KNOWLEDGE_ROOT, "commands", `${cmdMeta.name}.json`);
    const cmd = loadJson<{ steps: Array<{ step: string; description: string }> }>(cmdPath);
    if (!cmd) continue;

    // Find skill names mentioned in step descriptions (e.g., "using `component-spec` skill")
    for (const step of cmd.steps) {
      const skillRefs = step.description.match(/`([^`]+)` skill/g);
      if (skillRefs) {
        for (const ref of skillRefs) {
          const skillName = ref.replace(/`/g, "").replace(" skill", "");
          if (skillNames.has(skillName)) {
            pass(
              `Cmd "${cmdMeta.name}" step "${step.step}" — references skill "${skillName}"`,
              "Found in knowledge set"
            );
          } else {
            fail(
              `Cmd "${cmdMeta.name}" step "${step.step}" — references skill "${skillName}"`,
              "NOT found in knowledge set"
            );
          }
        }
      }
    }
  }

  // Check no orphan files in skills/ or commands/ directories
  const skillsDir = join(KNOWLEDGE_ROOT, "skills");
  const commandsDir = join(KNOWLEDGE_ROOT, "commands");

  const skillFiles = readdirSync(skillsDir).filter((f) => f.endsWith(".json"));
  for (const file of skillFiles) {
    const name = file.replace(".json", "");
    if (skillNames.has(name)) {
      pass(`Skills dir: "${file}" listed in overview`, "");
    } else {
      fail(`Skills dir: "${file}" listed in overview`, "Orphan file — not in overview.json");
    }
  }

  const commandFiles = readdirSync(commandsDir).filter((f) => f.endsWith(".json"));
  for (const file of commandFiles) {
    const name = file.replace(".json", "");
    if (commandNames.has(name)) {
      pass(`Commands dir: "${file}" listed in overview`, "");
    } else {
      fail(`Commands dir: "${file}" listed in overview`, "Orphan file — not in overview.json");
    }
  }
}

// ─── Test 6: Simulated Fetch Flow ────────────────────────────────────────────

function testSimulatedFetchFlow() {
  section("6. Simulated Fetch Flow (read + validate pipeline)");

  const overviewPath = join(KNOWLEDGE_ROOT, "overview.json");
  const overview = loadJson<{
    skills: SkillMeta[];
    commands: CommandMeta[];
  }>(overviewPath);
  if (!overview) return;

  // Simulate: client requests all skills → we read each file → return summary
  const fetched: Array<{ name: string; description: string; fieldCount: number }> = [];
  let fetchErrors = 0;

  for (const skillMeta of overview.skills) {
    const skillPath = join(KNOWLEDGE_ROOT, "skills", `${skillMeta.name}.json`);
    const skill = loadJson<Record<string, unknown>>(skillPath);
    if (skill) {
      fetched.push({
        name: skill.name as string,
        description: skill.description as string,
        fieldCount: Object.keys(skill).length,
      });
    } else {
      fetchErrors++;
    }
  }

  if (fetchErrors === 0) {
    pass("Simulated fetch — all skills readable", `${fetched.length} skills fetched`);
  } else {
    fail("Simulated fetch — all skills readable", `${fetchErrors} errors`);
  }

  // Validate each fetched skill has meaningful content
  for (const item of fetched) {
    if (item.fieldCount >= 5) {
      pass(`Fetched "${item.name}" — content rich`, `${item.fieldCount} fields`);
    } else {
      fail(`Fetched "${item.name}" — content rich`, `Only ${item.fieldCount} fields (expected ≥5)`);
    }
  }

  // Simulate: client requests a command → get steps → resolve skill references
  for (const cmdMeta of overview.commands) {
    const cmdPath = join(KNOWLEDGE_ROOT, "commands", `${cmdMeta.name}.json`);
    const cmd = loadJson<{
      name: string;
      steps: Array<{ step: string; description: string }>;
    }>(cmdPath);

    if (!cmd) {
      fail(`Simulated fetch command "${cmdMeta.name}"`, "Could not load");
      continue;
    }

    pass(
      `Simulated fetch command "${cmdMeta.name}"`,
      `${cmd.steps.length} steps resolved`
    );
  }
}

// ─── Test 7: Content Uniqueness ──────────────────────────────────────────────

function testContentUniqueness() {
  section("7. Content Uniqueness — No Duplicate Skills/Commands");

  const overviewPath = join(KNOWLEDGE_ROOT, "overview.json");
  const overview = loadJson<{ skills: SkillMeta[]; commands: CommandMeta[] }>(overviewPath);
  if (!overview) return;

  const skillNameCounts = new Map<string, number>();
  for (const s of overview.skills) {
    skillNameCounts.set(s.name, (skillNameCounts.get(s.name) || 0) + 1);
  }
  for (const [name, count] of skillNameCounts) {
    if (count === 1) {
      pass(`Skill name "${name}" — unique`, "");
    } else {
      fail(`Skill name "${name}" — unique`, `Appears ${count} times`);
    }
  }

  const cmdNameCounts = new Map<string, number>();
  for (const c of overview.commands) {
    cmdNameCounts.set(c.name, (cmdNameCounts.get(c.name) || 0) + 1);
  }
  for (const [name, count] of cmdNameCounts) {
    if (count === 1) {
      pass(`Command name "${name}" — unique`, "");
    } else {
      fail(`Command name "${name}" — unique`, `Appears ${count} times`);
    }
  }

  // Check no skill name collides with command name
  for (const s of overview.skills) {
    if (cmdNameCounts.has(s.name)) {
      fail(`No name collision — "${s.name}"`, "Appears as both skill and command");
    }
  }
}

// ─── Test 8: Byte Size Health Check ──────────────────────────────────────────

function testFileSizeHealth() {
  section("8. File Size Health — No Empty or Suspiciously Large Files");

  const overviewPath = join(KNOWLEDGE_ROOT, "overview.json");
  const overview = loadJson<{ skills: SkillMeta[]; commands: CommandMeta[] }>(overviewPath);
  if (!overview) return;

  // Check skill files
  for (const skillMeta of overview.skills) {
    const skillPath = join(KNOWLEDGE_ROOT, "skills", `${skillMeta.name}.json`);
    if (existsSync(skillPath)) {
      const stats = statSync(skillPath);
      const sizeBytes = stats.size;
      if (sizeBytes < 50) {
        fail(`Skill "${skillMeta.name}" — file size`, `${sizeBytes} bytes (suspiciously small)`);
      } else if (sizeBytes > 100_000) {
        fail(`Skill "${skillMeta.name}" — file size`, `${sizeBytes} bytes (suspiciously large)`);
      } else {
        pass(`Skill "${skillMeta.name}" — file size`, `${sizeBytes} bytes`);
      }
    }
  }

  // Check command files
  for (const cmdMeta of overview.commands) {
    const cmdPath = join(KNOWLEDGE_ROOT, "commands", `${cmdMeta.name}.json`);
    if (existsSync(cmdPath)) {
      const stats = statSync(cmdPath);
      const sizeBytes = stats.size;
      if (sizeBytes < 50) {
        fail(`Command "${cmdMeta.name}" — file size`, `${sizeBytes} bytes (suspiciously small)`);
      } else if (sizeBytes > 50_000) {
        fail(`Command "${cmdMeta.name}" — file size`, `${sizeBytes} bytes (suspiciously large)`);
      } else {
        pass(`Command "${cmdMeta.name}" — file size`, `${sizeBytes} bytes`);
      }
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log("\n🔧 Design Systems Skill Flow — Verification Script");
  console.log(`   Knowledge root: ${KNOWLEDGE_ROOT}\n`);

  testPluginMetadata();
  testOverviewIndex();
  testSkillFiles();
  testCommandFiles();
  testCrossReferences();
  testSimulatedFetchFlow();
  testContentUniqueness();
  testFileSizeHealth();

  // ─── Summary ───────────────────────────────────────────────────────────

  section("Summary");

  const total = totalPassed + totalFailed;
  const pct = total > 0 ? ((totalPassed / total) * 100).toFixed(1) : "0";

  console.log(`\n  Total checks: ${total}`);
  console.log(`  ✅ Passed:    ${totalPassed}`);
  console.log(`  ❌ Failed:    ${totalFailed}`);
  console.log(`  Pass rate:    ${pct}%\n`);

  if (totalFailed > 0) {
    console.log("  Failed checks:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    ❌ ${r.name} — ${r.details}`);
    }
    console.log("");
  }

  // Exit code
  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
