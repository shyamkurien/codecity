import { dirname, sep } from 'node:path'
import { getLanguageColor } from './languages.js'
import type { DirectoryNode, LanguageBreakdown } from '../types.js'

export interface DirStats {
  lines: number
  languages: Map<string, number>
}

export function newDirStats(): DirStats {
  return { lines: 0, languages: new Map() }
}

export function calculateLanguageBreakdown(
  stats: Map<string, number>,
  total: number,
): LanguageBreakdown[] {
  if (total <= 0) return []
  const breakdown: LanguageBreakdown[] = []
  for (const [language, lines] of stats) {
    breakdown.push({
      language,
      lines,
      percentage: (lines / total) * 100,
      color: getLanguageColor(language),
    })
  }
  breakdown.sort((a, b) => b.lines - a.lines)
  return breakdown
}

// dirStats keys are posix-style relative directory paths, with '' meaning the
// repository root. dirAges keys use the same convention.
export function buildDirectoryTree(
  dirStats: Map<string, DirStats>,
  dirAges: Map<string, number>,
): DirectoryNode[] {
  const nodes = new Map<string, DirectoryNode>()

  for (const [path, stats] of dirStats) {
    const name = path === '' ? '(root)' : basename(path)
    nodes.set(path, {
      name,
      path,
      age_days: dirAges.get(path) ?? 0,
      lines: stats.lines,
      languages: calculateLanguageBreakdown(stats.languages, stats.lines),
      children: [],
    })
  }

  const roots: DirectoryNode[] = []
  const rootNode = nodes.get('')
  if (rootNode) {
    roots.push(rootNode)
    nodes.delete('')
  }

  for (const [path, node] of nodes) {
    const parent = parentPath(path)
    if (parent === '' || parent === path) {
      roots.push(node)
      continue
    }
    const parentNode = nodes.get(parent) ?? (parent === '' ? rootNode : undefined)
    if (parentNode) parentNode.children.push(node)
    else roots.push(node)
  }

  const sortByLines = (a: DirectoryNode, b: DirectoryNode) => b.lines - a.lines
  const sortRecursive = (node: DirectoryNode) => {
    node.children.sort(sortByLines)
    for (const c of node.children) sortRecursive(c)
  }
  roots.sort(sortByLines)
  for (const r of roots) sortRecursive(r)

  return roots
}

function basename(posixPath: string): string {
  const i = posixPath.lastIndexOf('/')
  return i === -1 ? posixPath : posixPath.slice(i + 1)
}

function parentPath(posixPath: string): string {
  const i = posixPath.lastIndexOf('/')
  return i === -1 ? '' : posixPath.slice(0, i)
}

export function toPosix(relPath: string): string {
  if (sep === '/') return relPath
  return relPath.split(sep).join('/')
}

export function ancestorDirs(posixPath: string): string[] {
  // For "a/b/c" return ["", "a", "a/b"] (ancestors, not including the path itself).
  const result: string[] = ['']
  let current = ''
  const parts = posixPath.split('/')
  for (let i = 0; i < parts.length - 1; i++) {
    current = current === '' ? parts[i]! : `${current}/${parts[i]!}`
    result.push(current)
  }
  return result
}

// Return the parent directory of a posix file path ('' for a top-level file).
export function fileParentDir(posixPath: string): string {
  const d = dirname(posixPath)
  if (d === '.' || d === '/') return ''
  return d
}
