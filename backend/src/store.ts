import type { RepoAnalysis } from './types.js'

// Process-lifetime in-memory store. No persistence — matches the Rust
// backend's HashMap/RwLock. Node's single-threaded event loop makes explicit
// locking unnecessary; inserts and reads are atomic from JS's perspective.
const repos = new Map<string, RepoAnalysis>()

export function saveRepo(repo: RepoAnalysis): void {
  repos.set(repo.id, repo)
}

export function getRepo(id: string): RepoAnalysis | undefined {
  return repos.get(id)
}

export function listRepos(): RepoAnalysis[] {
  return [...repos.values()]
}

export function clearStore(): void {
  repos.clear()
}
