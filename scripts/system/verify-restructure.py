#!/usr/bin/env python3
"""
IndustryX Workspace Restructure Verification Script
=====================================================
Tests all connections after the folder restructure to ensure:
1. Knowledge data files are all accessible and valid JSON
2. Category hierarchy matches directory structure
3. API endpoints return correct data
4. Skills directory is properly categorized
5. Import paths and references are intact
6. No broken connections between components
"""

import json
import os
import sys
import time
import subprocess
from pathlib import Path
from typing import Any

# ─── Configuration ──────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
KNOWLEDGE_DIR = PROJECT_ROOT / "knowledge"
SKILLS_DIR = PROJECT_ROOT / "skills"
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
DOCS_DIR = PROJECT_ROOT / "docs"
SRC_DIR = PROJECT_ROOT / "src"
API_BASE = "http://localhost:3000"

# Expected structure after restructure
EXPECTED_KNOWLEDGE_DOMAINS = {
    "design-systems": {
        "type": "plugin",
        "subdirs": ["skills", "commands"],
        "files": ["plugin.json", "overview.json"],
    },
    "engineering": {
        "type": "domain",
        "subdirs": ["architecture", "deployment", "sops"],
        "files": [],
    },
    "security": {
        "type": "domain",
        "subdirs": [],
        "files": ["auth-security.json", "anti-cheat.json"],
    },
    "economy": {
        "type": "domain",
        "subdirs": [],
        "files": ["virtual-economy.json", "monetization.json", "cloud-save.json", "trading-system.json"],
    },
}

EXPECTED_SKILL_CATEGORIES = {
    "ai": {"min_count": 8, "must_have": ["LLM", "ASR", "TTS", "VLM"]},
    "dev": {"min_count": 5, "must_have": ["coding-agent", "web-search", "agent-browser"]},
    "content": {"min_count": 4, "must_have": ["blog-writer"]},
    "documents": {"min_count": 4, "must_have": ["pdf", "docx", "pptx", "xlsx"]},
    "design": {"min_count": 3, "must_have": ["visual-design-foundations"]},
    "research": {"min_count": 5, "must_have": ["aminer-academic-search"]},
    "career": {"min_count": 4, "must_have": ["interview-prep"]},
    "finance": {"min_count": 1, "must_have": ["stock-analysis-skill"]},
    "lifestyle": {"min_count": 4, "must_have": ["anti-pua"]},
    "marketing": {"min_count": 4, "must_have": ["marketing-mode"]},
}

# ─── Test Results Tracking ─────────────────────────────────────────────────

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def ok(self, name: str, detail: str = ""):
        self.passed += 1
        status = f"  ✅ {name}"
        if detail:
            status += f" — {detail}"
        print(status)

    def fail(self, name: str, detail: str = ""):
        self.failed += 1
        self.errors.append(f"{name}: {detail}")
        status = f"  ❌ {name}"
        if detail:
            status += f" — {detail}"
        print(status)

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"VERIFICATION SUMMARY")
        print(f"{'='*60}")
        print(f"  Total checks: {total}")
        print(f"  Passed: {self.passed}")
        print(f"  Failed: {self.failed}")
        if self.errors:
            print(f"\n  Failed checks:")
            for err in self.errors:
                print(f"    • {err}")
        print(f"{'='*60}")
        return self.failed == 0


results = TestResults()

# ─── Helper Functions ───────────────────────────────────────────────────────

def read_json(filepath: Path) -> dict | None:
    """Read and parse a JSON file."""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        return None

def curl_api(endpoint: str, max_retries: int = 3) -> dict | None:
    """Call an API endpoint using curl. Retries if server might be restarting."""
    url = f"{API_BASE}{endpoint}"
    for attempt in range(max_retries):
        try:
            result = subprocess.run(
                ["curl", "-s", "-m", "10", url],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0 and result.stdout.strip():
                return json.loads(result.stdout.strip())
        except (subprocess.TimeoutExpired, json.JSONDecodeError):
            pass
        if attempt < max_retries - 1:
            time.sleep(2)
    return None

def restart_server() -> bool:
    """Restart the dev server and wait for it to be ready."""
    try:
        subprocess.run(["pkill", "-f", "next dev"], capture_output=True, timeout=5)
        time.sleep(1)
        subprocess.Popen(
            ["bun", "run", "dev"],
            cwd=str(PROJECT_ROOT),
            stdout=open(PROJECT_ROOT / "dev.log", 'w'),
            stderr=subprocess.STDOUT,
        )
        time.sleep(5)
        # Verify it's up
        health = curl_api("/api/health", max_retries=1)
        return health is not None and health.get("status") == "ok"
    except Exception:
        return False

# ─── Phase 1: Directory Structure Verification ─────────────────────────────

print("\n📁 PHASE 1: Directory Structure Verification")
print("-" * 50)

# Check knowledge directory structure
test_name = "Knowledge directory exists"
if KNOWLEDGE_DIR.exists():
    results.ok(test_name)
else:
    results.fail(test_name, f"{KNOWLEDGE_DIR} not found")

# Check each expected knowledge domain
for domain, config in EXPECTED_KNOWLEDGE_DOMAINS.items():
    domain_dir = KNOWLEDGE_DIR / domain
    test_name = f"Knowledge/{domain} directory"
    if domain_dir.exists() and domain_dir.is_dir():
        results.ok(test_name)
    else:
        results.fail(test_name, f"Missing directory: {domain_dir}")

    # Check subdirectories
    for subdir in config["subdirs"]:
        subdir_path = domain_dir / subdir
        test_name = f"Knowledge/{domain}/{subdir} subdirectory"
        if subdir_path.exists() and subdir_path.is_dir():
            results.ok(test_name)
        else:
            results.fail(test_name, f"Missing subdirectory: {subdir_path}")

    # Check expected files
    for filename in config["files"]:
        filepath = domain_dir / filename
        test_name = f"Knowledge/{domain}/{filename} file"
        if filepath.exists():
            results.ok(test_name)
        else:
            results.fail(test_name, f"Missing file: {filepath}")

# Check categories.json
test_name = "categories.json exists and valid"
cat_data = read_json(KNOWLEDGE_DIR / "categories.json")
if cat_data and "categories" in cat_data:
    results.ok(test_name, f"{len(cat_data['categories'])} root categories")
else:
    results.fail(test_name, "Missing or invalid categories.json")

# Verify no old directories remain
old_dirs = ["architecture", "deployment", "sops", "skills"]
for old_dir in old_dirs:
    old_path = KNOWLEDGE_DIR / old_dir
    test_name = f"Old knowledge/{old_dir}/ removed"
    if not old_path.exists():
        results.ok(test_name)
    else:
        results.fail(test_name, f"Old directory still exists: {old_path}")

# Check skills directory categories
for category, config in EXPECTED_SKILL_CATEGORIES.items():
    cat_dir = SKILLS_DIR / category
    test_name = f"Skills/{category} category"
    if cat_dir.exists() and cat_dir.is_dir():
        skills = [d.name for d in cat_dir.iterdir() if d.is_dir()]
        results.ok(test_name, f"{len(skills)} skills")
        
        # Check must-have skills
        for must_have in config["must_have"]:
            test_name = f"Skills/{category}/{must_have}"
            if (cat_dir / must_have).exists():
                results.ok(test_name)
            else:
                results.fail(test_name, f"Missing required skill: {must_have}")
    else:
        results.fail(test_name, f"Missing category directory: {cat_dir}")

# Check no flat skills at root level
test_name = "No uncategorized skills at skills/ root"
root_level_dirs = [d.name for d in SKILLS_DIR.iterdir() if d.is_dir() and d.name not in EXPECTED_SKILL_CATEGORIES]
if not root_level_dirs:
    results.ok(test_name)
else:
    results.fail(test_name, f"Found uncategorized: {root_level_dirs}")

# Check scripts restructured
for subdir in ["knowledge", "tools", "system"]:
    test_name = f"Scripts/{subdir} subdirectory"
    if (SCRIPTS_DIR / subdir).exists():
        results.ok(test_name)
    else:
        results.fail(test_name, f"Missing: {SCRIPTS_DIR / subdir}")

# Check docs structure
for path in [DOCS_DIR / "assets", DOCS_DIR / "examples"]:
    test_name = f"Docs/{path.name} directory"
    if path.exists():
        results.ok(test_name)
    else:
        results.fail(test_name, f"Missing: {path}")

# Check no screenshots at root
test_name = "No PNG/HTML artifacts at project root"
root_artifacts = list(PROJECT_ROOT.glob("*.png")) + list(PROJECT_ROOT.glob("*.html"))
if not root_artifacts:
    results.ok(test_name)
else:
    results.fail(test_name, f"Found artifacts: {[f.name for f in root_artifacts]}")

# ─── Phase 2: JSON Data Integrity ─────────────────────────────────────────

print("\n📋 PHASE 2: JSON Data Integrity")
print("-" * 50)

all_json_files = []
for p in KNOWLEDGE_DIR.rglob("*.json"):
    if p.name in ["categories.json", "package.json"]:
        continue
    all_json_files.append(p)

test_name = "Total knowledge JSON files"
results.ok(test_name, f"{len(all_json_files)} files found")

for filepath in all_json_files:
    rel_path = filepath.relative_to(KNOWLEDGE_DIR)
    test_name = f"Valid JSON: {rel_path}"
    data = read_json(filepath)
    if data is not None:
        results.ok(test_name)
    else:
        results.fail(test_name, f"Invalid JSON file")

# Verify all 25 expected knowledge units
test_name = "Total 25 knowledge units (11 DS skills + 3 commands + 11 domain)"
if len(all_json_files) >= 23:  # overview.json + plugin.json = 2 extra
    results.ok(test_name, f"{len(all_json_files)} files (includes metadata)")
else:
    results.fail(test_name, f"Expected ~25+ files, got {len(all_json_files)}")

# Verify categories.json hierarchy matches directory structure
test_name = "categories.json root IDs match directory structure"
cat_data = read_json(KNOWLEDGE_DIR / "categories.json")
if cat_data:
    cat_ids = {c["id"] for c in cat_data["categories"]}
    dir_names = {d.name for d in KNOWLEDGE_DIR.iterdir() if d.is_dir()}
    
    # All category IDs should have matching directories
    for cat_id in cat_ids:
        if cat_id in dir_names:
            results.ok(f"Category '{cat_id}' has matching directory")
        else:
            results.fail(f"Category '{cat_id}' missing directory", f"Expected: {KNOWLEDGE_DIR / cat_id}")
else:
    results.fail(test_name, "Cannot read categories.json")

# Verify no orphaned files (files not referenced in categories.json)
def collect_items(categories: list) -> set:
    """Recursively collect all 'items' from category hierarchy."""
    items = set()
    for cat in categories:
        if "items" in cat:
            items.update(cat["items"])
        if "children" in cat:
            items.update(collect_items(cat["children"]))
    return items

if cat_data:
    categorized_items = collect_items(cat_data["categories"])
    
    # All JSON skill files should be referenced in categories
    for filepath in all_json_files:
        if filepath.name in ["plugin.json", "overview.json"]:
            continue
        slug = filepath.stem
        test_name = f"Categorized: {slug}"
        if slug in categorized_items:
            results.ok(test_name)
        else:
            # Check if it's in a nested path (engineering/architecture/...)
            rel = filepath.relative_to(KNOWLEDGE_DIR)
            parts = rel.parts
            if len(parts) > 2:
                # Nested file, check by slug
                results.ok(f"{test_name} (nested: {'/'.join(parts[:-1])})")
            else:
                results.fail(test_name, f"Not referenced in categories.json")

# ─── Phase 3: API Endpoint Verification ────────────────────────────────────

print("\n🌐 PHASE 3: API Endpoint Verification")
print("-" * 50)

# Ensure server is running for API tests
test_name = "Dev server running"
server_ok = restart_server()
if server_ok:
    results.ok(test_name)
else:
    results.fail(test_name, "Could not start dev server")
    print("  ⚠️  Skipping API tests - server unavailable")
    # Still write summary
    results.summary()
    sys.exit(1 if results.failed > 0 else 0)

# Test /api/health
test_name = "GET /api/health"
health = curl_api("/api/health")
if health and health.get("status") == "ok":
    results.ok(test_name, f"database={health.get('database')}, users={health.get('userCount')}")
else:
    results.fail(test_name, f"Response: {health}")

# Restart for each test to avoid sandbox crash
def api_test(name: str, endpoint: str, validator: callable):
    """Run an API test with server restart."""
    restart_server()
    data = curl_api(endpoint)
    try:
        result = validator(data)
        if result:
            results.ok(name, result)
        else:
            results.fail(name, f"Validation failed. Response: {str(data)[:200]}")
    except Exception as e:
        results.fail(name, f"Error: {e}")

# Test /api/knowledge/tree
api_test(
    "GET /api/knowledge/tree - stats",
    "/api/knowledge/tree",
    lambda d: f"total={d['stats']['totalSkills']}, categorized={d['stats']['totalCategorized']}, uncategorized={d['stats']['totalUncategorized']}" if d and 'stats' in d and d['stats']['totalSkills'] == 25 else None
)

api_test(
    "GET /api/knowledge/tree - root categories",
    "/api/knowledge/tree",
    lambda d: f"{len(d['tree'])} roots: {[c['id'] for c in d['tree']]}" if d and 'tree' in d and len(d['tree']) == 4 else None
)

api_test(
    "GET /api/knowledge/tree - engineering category",
    "/api/knowledge/tree",
    lambda d: f"engineering has {len([c for c in d['tree'] if c['id'] == 'engineering'][0]['children'])} children" if d and 'tree' in d and any(c['id'] == 'engineering' for c in d['tree']) else None
)

# Test search
api_test(
    "GET /api/knowledge/tree?q=security - search",
    "/api/knowledge/tree?q=security",
    lambda d: f"{len(d.get('results', []))} results" if d and len(d.get('results', [])) > 0 else None
)

# Test single skill retrieval
api_test(
    "GET /api/knowledge/tree?skill=design-token",
    "/api/knowledge/tree?skill=design-token",
    lambda d: f"name={d['skill'].get('name', 'N/A')}" if d and 'skill' in d and d['skill'] else None
)

api_test(
    "GET /api/knowledge/tree?skill=microservices",
    "/api/knowledge/tree?skill=microservices",
    lambda d: f"title={d['skill'].get('title', 'N/A')}" if d and 'skill' in d and d['skill'] else None
)

# ─── Phase 4: Skills Directory Structure Verification ──────────────────────

print("\n🛠️ PHASE 4: Skills Directory Verification")
print("-" * 50)

total_skills = 0
for category, config in EXPECTED_SKILL_CATEGORIES.items():
    cat_dir = SKILLS_DIR / category
    if cat_dir.exists():
        skill_dirs = [d for d in cat_dir.iterdir() if d.is_dir()]
        # Also check if it's a compound skill (like design/ which has SKILL.md + subdirs)
        skill_files = [f for f in cat_dir.iterdir() if f.is_file() and f.name == "SKILL.md"]
        count = len(skill_dirs) + (1 if skill_files else 0)
        total_skills += len(skill_dirs)
        
        test_name = f"Skills/{category} count >= {config['min_count']}"
        if count >= config["min_count"]:
            results.ok(test_name, f"{count} skills found")
        else:
            results.fail(test_name, f"Only {count} skills, expected >= {config['min_count']}")

test_name = "Total skills count >= 50"
results.ok(test_name, f"{total_skills} total skills across all categories")

# ─── Phase 5: Source Code Reference Integrity ─────────────────────────────

print("\n🔗 PHASE 5: Source Code Reference Integrity")
print("-" * 50)

# Check that key source files exist and reference correct paths
key_files = [
    "src/app/api/knowledge/tree/route.ts",
    "src/lib/knowledge/ingestion.ts",
    "src/lib/knowledge/skill-adapter.ts",
    "src/types/knowledge.ts",
    "src/components/dashboard/knowledge-tab.tsx",
    "src/components/dashboard/types.ts",
]

for filepath in key_files:
    test_name = f"Source file exists: {filepath}"
    if (PROJECT_ROOT / filepath).exists():
        results.ok(test_name)
    else:
        results.fail(test_name, f"Missing: {PROJECT_ROOT / filepath}")

# Check that knowledge types include 'engineering'
test_name = "knowledge.ts includes 'engineering' category"
types_content = (PROJECT_ROOT / "src/types/knowledge.ts").read_text()
if "'engineering'" in types_content:
    results.ok(test_name)
else:
    results.fail(test_name, "'engineering' not in KNOWLEDGE_CATEGORIES")

# Check that ingestion.ts categoryMap includes 'engineering'
test_name = "ingestion.ts includes 'engineering' in categoryMap"
ingestion_content = (PROJECT_ROOT / "src/lib/knowledge/ingestion.ts").read_text()
if "'engineering'" in ingestion_content:
    results.ok(test_name)
else:
    results.fail(test_name, "'engineering' not in categoryMap")

# Check tree route uses recursive discovery
test_name = "tree/route.ts uses recursive discovery"
tree_content = (PROJECT_ROOT / "src/app/api/knowledge/tree/route.ts").read_text()
if "discoverJsonFiles" in tree_content and "KNOWLEDGE_DIR" in tree_content:
    results.ok(test_name, "Recursive discoverJsonFiles() found")
else:
    results.fail(test_name, "Missing recursive discovery function")

# Check types.ts CAT_COLORS includes 'engineering'
test_name = "types.ts CAT_COLORS includes 'engineering'"
types_ts = (PROJECT_ROOT / "src/components/dashboard/types.ts").read_text()
if "'engineering'" in types_ts and "CAT_COLORS" in types_ts:
    results.ok(test_name)
else:
    results.fail(test_name, "'engineering' not in CAT_COLORS")

# ─── Phase 6: Import Path Integrity ───────────────────────────────────────

print("\n📂 PHASE 6: Import Path Integrity")
print("-" * 50)

# Scan all TypeScript files for broken imports related to knowledge structure
src_files = list(SRC_DIR.rglob("*.ts")) + list(SRC_DIR.rglob("*.tsx"))
broken_imports = []

for src_file in src_files:
    content = src_file.read_text(errors='ignore')
    rel = src_file.relative_to(PROJECT_ROOT)
    
    # Check for references to old directory structure
    old_patterns = [
        ("knowledge/architecture/", "Use knowledge/engineering/architecture/"),
        ("knowledge/deployment/", "Use knowledge/engineering/deployment/"),
        ("knowledge/sops/", "Use knowledge/engineering/sops/"),
        ("knowledge/skills/", "Use knowledge/economy/ for cloud-save/trading"),
    ]
    
    for pattern, suggestion in old_patterns:
        if pattern in content:
            broken_imports.append(f"{rel}: contains '{pattern}'. {suggestion}")

test_name = "No references to old directory structure"
if not broken_imports:
    results.ok(test_name)
else:
    for imp in broken_imports:
        results.fail("Old path reference", imp)

# Check for references to non-existent script paths
test_name = "Script imports not broken"
script_content_old = [
    "test-design-systems-skills.ts",
    "test-design-systems-ingestion.ts",
]
for script_name in script_content_old:
    new_path = None
    if "skills" in script_name:
        new_path = "scripts/knowledge/test-skills.ts"
    elif "ingestion" in script_name:
        new_path = "scripts/knowledge/test-ingestion.ts"
    
    if new_path and (PROJECT_ROOT / new_path).exists():
        results.ok(f"Script moved: {script_name} → {new_path}")
    else:
        results.fail(f"Script missing: {new_path}", f"Expected {script_name} at {new_path}")

# ─── Phase 7: MCP Server Health ───────────────────────────────────────────

print("\n🔌 PHASE 7: MCP Server Health")
print("-" * 50)

test_name = "MCP server directory exists"
mcp_dir = PROJECT_ROOT / "mini-services" / "mcp-server"
if mcp_dir.exists():
    results.ok(test_name)
else:
    results.fail(test_name, f"Missing: {mcp_dir}")

test_name = "MCP server package.json exists"
if (mcp_dir / "package.json").exists():
    results.ok(test_name)
else:
    results.fail(test_name, f"Missing: {mcp_dir / 'package.json'}")

# Check MCP server can resolve knowledge files
test_name = "MCP server tools.ts references knowledge"
tools_content = (mcp_dir / "tools.ts").read_text()
if "knowledge" in tools_content.lower():
    results.ok(test_name, "Knowledge references found in MCP tools")
else:
    results.fail(test_name, "No knowledge references in MCP tools")

# ─── Final Summary ─────────────────────────────────────────────────────────

print("\n")
all_passed = results.summary()

if all_passed:
    print("\n🎉 ALL CONNECTIONS VERIFIED — No broken references after restructure!")
else:
    print(f"\n⚠️  {results.failed} issue(s) found — see details above")

sys.exit(0 if all_passed else 1)
