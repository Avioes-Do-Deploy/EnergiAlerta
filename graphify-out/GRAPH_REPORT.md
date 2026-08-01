# Graph Report - .  (2026-07-31)

## Corpus Check
- Corpus is ~2,161 words - fits in a single context window. You may not need a graph.

## Summary
- 212 nodes · 202 edges · 24 communities (22 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.84)
- Token cost: 4,200 input · 5,600 output

## Community Hubs (Navigation)
- Backend Runtime Dependencies
- Auth & Error Core
- Backend Dev Dependencies
- Backend Package Scripts
- Frontend Tooling
- Agent Skills & Rules
- Zod Generator Config
- Root Package Config
- TypeScript Config
- Project Template & Stack
- Fastify App Entry
- Prisma DB Plugin
- Fastify Types

## God Nodes (most connected - your core abstractions)
1. `scripts` - 11 edges
2. `Skills Index` - 11 edges
3. `compilerOptions` - 10 edges
4. `pnpm Workspace (Backend)` - 6 edges
5. `AuthModule` - 5 edges
6. `Load Skill Before Acting Rule` - 5 edges
7. `variants` - 4 edges
8. `AppError` - 4 edges
9. `scripts` - 4 edges
10. `SEMCOMP26 Boilerplate Template` - 4 edges

## Surprising Connections (you probably didn't know these)
- `SEMCOMP26 Boilerplate Template` --conceptually_related_to--> `pnpm Workspace (Backend)`  [INFERRED]
  AGENTS.md → backend/pnpm-workspace.yaml
- `SEMCOMP26 Boilerplate Template` --conceptually_related_to--> `Frontend App Entry (index.html)`  [INFERRED]
  AGENTS.md → frontend/index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Process Skills Loaded First** — agents_superpowers_brainstorming, agents_superpowers_systematic_debugging, agents_superpowers_verification_before_completion [EXTRACTED 1.00]
- **Backend Allowed Native Builds** — backend_pnpm_workspace_yaml_pnpm_workspace, backend_pnpm_workspace_yaml_prisma, backend_pnpm_workspace_yaml_prisma_engines, backend_pnpm_workspace_yaml_bcrypt, backend_pnpm_workspace_yaml_better_sqlite3, backend_pnpm_workspace_yaml_prisma_zod_generator [EXTRACTED 1.00]
- **Absolute Priority Instructions** — agents_env_security_rule, agents_gitignore_skip_rule, agents_skill_first_rule [EXTRACTED 1.00]

## Communities (24 total, 2 thin omitted)

### Community 0 - "Backend Runtime Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, bcrypt, better-sqlite3, fastify, @fastify/autoload, fastify-cli, @fastify/cors, @fastify/env (+25 more)

### Community 1 - "Auth & Error Core"
Cohesion: 0.12
Nodes (10): adapter, db, AppError, AppErrorType, ERROR_TAGS, AuthModule, LoginDTO, loginSchema (+2 more)

### Community 2 - "Backend Dev Dependencies"
Cohesion: 0.10
Nodes (21): devDependencies, c8, concurrently, dotenv, fastify-tsconfig, prisma, ts-node, @types/bcrypt (+13 more)

### Community 3 - "Backend Package Scripts"
Cohesion: 0.10
Nodes (19): author, description, keywords, license, main, name, scripts, build:ts (+11 more)

### Community 4 - "Frontend Tooling"
Cohesion: 0.12
Nodes (16): dependencies, tailwindcss, devDependencies, @tailwindcss/vite, vite, name, private, scripts (+8 more)

### Community 5 - "Agent Skills & Rules"
Cohesion: 0.12
Nodes (16): explore (codebase investigation), review (code review), task (subagent dispatch), wait (join parallel jobs), Load Skill Before Acting Rule, Skills Index, superpowers-brainstorming, superpowers-executing-plans (+8 more)

### Community 6 - "Zod Generator Config"
Cohesion: 0.12
Nodes (15): enabled, suffix, mode, output, placeSingleFileAtRoot, enabled, suffix, enabled (+7 more)

### Community 7 - "Root Package Config"
Cohesion: 0.14
Nodes (13): author, dependencies, concurrently, description, concurrently, keywords, license, main (+5 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, module, moduleResolution, outDir, rewriteRelativeImportExtensions, sourceMap, strict (+4 more)

### Community 9 - "Project Template & Stack"
Cohesion: 0.21
Nodes (12): .env Never-Read Rule, Skip .gitignore'd Directories Rule, SEMCOMP26 Boilerplate Template, bcrypt, better-sqlite3, pnpm Workspace (Backend), prisma, @prisma/engines (+4 more)

### Community 10 - "Fastify App Entry"
Cohesion: 0.33
Nodes (4): AppOptions, __dirname, __filename, options

## Knowledge Gaps
- **114 isolated node(s):** `type`, `name`, `version`, `description`, `main` (+109 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Backend Runtime Dependencies` to `Backend Package Scripts`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Backend Dev Dependencies` to `Backend Package Scripts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `type`, `name`, `version` to the rest of the system?**
  _114 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Auth & Error Core` be split into smaller, more focused modules?**
  _Cohesion score 0.1225296442687747 - nodes in this community are weakly interconnected._
- **Should `Backend Dev Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Backend Package Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._