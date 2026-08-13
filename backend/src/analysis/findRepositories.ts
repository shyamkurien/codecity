import { opendir, stat } from 'node:fs/promises'
import { join } from 'node:path'

// Ported from git/mod.rs::find_repositories. Skips these directory names
// entirely — a repo living inside e.g. node_modules is intentionally missed.
const SKIP_DIRS = new Set([
  'node_modules',
  'target',
  '.cargo',
  'vendor',
  '.venv',
  'venv',
  '__pycache__',
])

export async function findRepositories(basePath: string): Promise<string[]> {
  let baseStat
  try {
    baseStat = await stat(basePath)
  } catch {
    throw new Error(`Invalid repository path: ${basePath}`)
  }
  if (!baseStat.isDirectory()) {
    throw new Error(`Invalid repository path: ${basePath}`)
  }

  const found: string[] = []
  await walk(basePath, found)
  return found
}

async function walk(dir: string, out: string[]): Promise<void> {
  let handle
  try {
    handle = await opendir(dir)
  } catch {
    return
  }

  const subdirs: string[] = []
  let hasGitDir = false

  for await (const entry of handle) {
    if (!entry.isDirectory()) continue
    if (entry.name === '.git') {
      hasGitDir = true
      continue
    }
    if (SKIP_DIRS.has(entry.name)) continue
    if (entry.name.startsWith('.')) continue
    subdirs.push(join(dir, entry.name))
  }

  if (hasGitDir) out.push(dir)

  for (const sub of subdirs) {
    await walk(sub, out)
  }
}
