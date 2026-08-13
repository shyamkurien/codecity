import { opendir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const IGNORED_COMPONENTS = new Set([
  '.git',
  'node_modules',
  'target',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
  'vendor',
  '.cargo',
  'deps',
  '_build',
])

export function isIgnored(absPath: string, repoRoot: string): boolean {
  const rel = relative(repoRoot, absPath)
  if (rel === '') return false

  for (const component of rel.split(sep)) {
    if (component !== '' && IGNORED_COMPONENTS.has(component)) return true
  }

  const posixRel = rel.split(sep).join('/')
  if (posixRel.includes('/.') && !posixRel.startsWith('.git')) return true

  return false
}

export interface WalkedFile {
  absPath: string
  extension: string
}

export async function* walkFiles(repoRoot: string): AsyncGenerator<WalkedFile> {
  yield* walkDir(repoRoot, repoRoot)
}

async function* walkDir(dir: string, repoRoot: string): AsyncGenerator<WalkedFile> {
  let handle
  try {
    handle = await opendir(dir)
  } catch {
    return
  }

  for await (const entry of handle) {
    const abs = join(dir, entry.name)
    if (isIgnored(abs, repoRoot)) continue

    if (entry.isDirectory()) {
      yield* walkDir(abs, repoRoot)
    } else if (entry.isFile()) {
      const dot = entry.name.lastIndexOf('.')
      if (dot > 0 && dot < entry.name.length - 1) {
        yield { absPath: abs, extension: entry.name.slice(dot + 1) }
      }
    }
  }
}
