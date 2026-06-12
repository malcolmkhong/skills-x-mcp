---
Task ID: 2
Agent: Main
Task: Phase 1 — Homepage Rebuild: Navbar + Hero + Problem + Solution + Architecture

Work Log:
- Audited current SEO/GEO implementation (metadata, JSON-LD, sitemap, robots)
- Found JSON-LD duplication between page.tsx and landing-page.tsx — fixed
- Found 8 FAQs (spec requires 15-20) — noted for Phase 4
- Created CtaButton client component (dispatches 'open-signin' custom event)
- Updated LoginDropdown to listen for 'open-signin' event (so any CTA can open it)
- Rebuilt landing-page.tsx with new SaaS positioning:
  - New Navbar: Problem, Solution, Knowledge, MCP, Features, Pricing, FAQ links
  - New Hero: "AI-Native Knowledge Infrastructure for Coding Agents"
  - NEW Problem Section: Pain flow diagram + 6 problem cards
  - NEW Solution Section: Solution flow + 5-step walkthrough
  - Enhanced Architecture: Layered flow diagram
  - Kept existing sections (Features, Knowledge, MCP, Token, FAQ, Pricing, CTA, Footer)
  - All "Get Started" buttons now functional via CtaButton → opens Sign In dropdown
  - All "View Documentation" / "Read Documentation" buttons → scroll to #architecture
  - All pricing CTAs → open Sign In dropdown
- Updated mobile menu with new nav links + Get Started CTA
- Updated page.tsx metadata for new positioning
- Updated sitemap.ts with new section IDs
- Fixed JSON-LD duplication (removed from landing-page.tsx, single source in page.tsx)
- Lint: clean
- Login flow test: all pass
- Dev server: no errors

Stage Summary:
- Phase 1 complete and production-ready
- All homepage buttons functional
- SEO/GEO infrastructure preserved and enhanced
- New sections: Problem, Solution, Architecture
- Sign-in works from any CTA button via custom event system
