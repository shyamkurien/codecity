# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

### Backend (TypeScript / Fastify)
```bash
cd backend
npm ci                          # Install pinned dependencies
npm run dev                     # Dev server with tsx watch (:3001)
npm run build                   # Compile TS to dist/
npm start                       # Run compiled server
LOG_LEVEL=debug npm run dev     # With verbose logging
```

Requires Node.js 22+. The backend shells out to the `git` CLI at runtime, so `git` must be available on `$PATH`.

### Frontend (JavaScript/Vite)
```bash
cd frontend
npm install                     # Install dependencies
npm run dev                     # Dev server with hot reload (:3000)
npm run build                   # Production build → dist/
```

### Docker (Full Stack)
```bash
docker compose up --build       # Build and start both services
# Frontend: http://localhost:3000, Backend: http://localhost:3001
```

### Kubernetes
```bash
kubectl apply -k k8s/           # Deploy to cluster
kubectl port-forward -n codecity svc/frontend 3000:80
```

## Architecture Overview

CodeCity visualizes git repositories as 3D city buildings where:
- **Height** = repository age (days since first commit)
- **Volume** = lines of code
- **Color** = primary programming language

### Data Flow
```
User Input → api.js (fetch /api/*) → Fastify route handler
    → analyzeRepository() (walk + git CLI) → RepoAnalysis
    → JSON response → Frontend renders Three.js buildings
```

### Backend (TypeScript / Fastify — Node 22, ESM)
- `src/server.ts` — Fastify bootstrap, CORS, error handler that reshapes to `{error: string}`
- `src/routes/` — one file per endpoint (`health` inline in server, `analyzeLocal`, `analyzeGithub`, `scan`, `repos`)
- `src/analysis/analyzeRepository.ts` — orchestrator: age → walk → line count → dir tree
- `src/analysis/walk.ts` — async fs walk with the same ignore list as the old Rust code
- `src/analysis/lineCount.ts` — streaming byte-level newline counter (handles non-UTF-8)
- `src/analysis/gitCli.ts` — thin `execFile`/`spawn` wrappers around the `git` CLI
- `src/analysis/directoryTree.ts` — flat `Map<path, DirStats>` → hierarchical tree
- `src/analysis/languages.ts` — extension → language and language → color tables
- `src/analysis/findRepositories.ts` — dir walk that returns paths containing `.git/`
- `src/github/analyzeGithub.ts` — octokit metadata → `git clone --depth 1` → deepen → delegate
- `src/store.ts` — in-memory `Map<string, RepoAnalysis>` (process-lifetime, no persistence)
- `src/types.ts` — `RepoAnalysis`, `DirectoryNode`, `LanguageBreakdown` with snake_case fields (load-bearing for the frontend)

### Frontend (Vanilla JS/Three.js)
- `main.js` - CodeCity controller class, event coordination
- `scene.js` - Three.js setup, raycasting, camera/lighting
- `buildings.js` - Layout algorithms, dimension calculations
- `api.js` - HTTP client wrapper
- `ui.js` - DOM manipulation, tooltips, forms
- `colors.js` - Language color mappings (mirrors backend)

### Key Patterns

**State Management:** In-memory `Map<string, RepoAnalysis>` module singleton in `src/store.ts`. Node's single-threaded event loop makes explicit locking unnecessary.

**Concurrency:** The `/api/scan` route uses `p-limit(os.availableParallelism())` to bound how many repositories are analyzed in parallel. All git and fs operations are async — no `worker_threads`.

**Git operations:** All go through `execFile('git', …)` or `spawn('git', …)`. No native bindings.

**Wire contract:** The frontend reads snake_case fields (`total_lines`, `age_days`) and expects `{error: string}` on non-2xx. Both are enforced by the `types.ts` shape and a Fastify `setErrorHandler` that reshapes validation failures. Do not switch response fields to camelCase without updating the frontend.

**API Proxy:** Dev uses Vite proxy (`/api` → `:3001`), production uses nginx proxy.

**Two View Modes:**
- Repository View: each building = one repo
- City Blocks View: blocks = repos, buildings within = directories

### Directory Ignore List
The file walk ignores: `.git`, `node_modules`, `target`, `dist`, `build`, `.next`, `__pycache__`, `.venv`, `venv`, `.idea`, `.vscode`, `vendor`, `.cargo`, `deps`, `_build`, plus any path whose components include a hidden entry (`/.`) outside `.git`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/repos` | List analyzed repos |
| POST | `/api/analyze/local` | Analyze local path `{"path": "/..."}` |
| POST | `/api/analyze/github` | Analyze GitHub `{"owner": "...", "repo": "..."}` |
| POST | `/api/scan` | Scan directory `{"path": "/..."}` |
| GET | `/api/repo/{id}` | Get repo by ID |
| GET | `/api/repo/{id}/tree` | Get directory tree |

## Docker Path Mapping

When running in Docker, host filesystem is mounted at `/host/`:
- Host: `/Users/me/projects` → Container: `/host/Users/me/projects`

On Docker Desktop for macOS the bare `/:/host:ro` mount leaves a dangling `/host/Users → /host_mnt/Users` symlink, so `docker-compose.yml` also mounts `/Users:/host/Users:ro` explicitly.
