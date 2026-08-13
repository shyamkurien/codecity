import { randomUUID } from 'node:crypto'
import { basename, relative } from 'node:path'
import { stat } from 'node:fs/promises'
import {
  assertGitRepo,
  getOldestCommitSeconds,
  streamAddedFiles,
} from './gitCli.js'
import { getLanguageFromExtension } from './languages.js'
import { countLines } from './lineCount.js'
import { walkFiles } from './walk.js'
import {
  ancestorDirs,
  buildDirectoryTree,
  calculateLanguageBreakdown,
  fileParentDir,
  newDirStats,
  toPosix,
  type DirStats,
} from './directoryTree.js'
import type { RepoAnalysis } from '../types.js'

const SECONDS_PER_DAY = 86400

export async function analyzeRepository(repoPath: string): Promise<RepoAnalysis> {
  let statResult
  try {
    statResult = await stat(repoPath)
  } catch {
    throw new Error(`Invalid repository path: ${repoPath}`)
  }
  if (!statResult.isDirectory()) {
    throw new Error(`Invalid repository path: ${repoPath}`)
  }

  await assertGitRepo(repoPath)

  const oldestCommit = await getOldestCommitSeconds(repoPath)
  const nowSec = Math.floor(Date.now() / 1000)
  const ageDays = Math.max(0, Math.floor((nowSec - oldestCommit) / SECONDS_PER_DAY))

  const languageStats = new Map<string, number>()
  const dirStats = new Map<string, DirStats>()
  dirStats.set('', newDirStats())
  let totalLines = 0

  for await (const file of walkFiles(repoPath)) {
    const language = getLanguageFromExtension(file.extension)
    if (!language) continue

    const lines = await countLines(file.absPath)
    if (lines === 0) continue

    totalLines += lines
    languageStats.set(language, (languageStats.get(language) ?? 0) + lines)

    const relFile = toPosix(relative(repoPath, file.absPath))
    const dir = fileParentDir(relFile)

    // Record LOC only at the file's immediate parent directory. The Rust
    // implementation did the same — parent aggregation happens through the
    // tree structure only via lines-of-code display, not aggregate totals.
    let ds = dirStats.get(dir)
    if (!ds) {
      ds = newDirStats()
      dirStats.set(dir, ds)
    }
    ds.lines += lines
    ds.languages.set(language, (ds.languages.get(language) ?? 0) + lines)
  }

  const dirAges = await computeDirectoryAges(repoPath, dirStats)

  const analysis: RepoAnalysis = {
    id: randomUUID(),
    name: basename(repoPath) || 'unknown',
    path: repoPath,
    age_days: ageDays,
    total_lines: totalLines,
    languages: calculateLanguageBreakdown(languageStats, totalLines),
    directories: buildDirectoryTree(dirStats, dirAges),
  }

  return analysis
}

// One pass over `git log --diff-filter=A --name-only`: for every added file,
// bubble its commit timestamp up to all ancestor dirs and keep the minimum.
// Replaces the Rust implementation which re-opened the repo and re-ran the
// revwalk once per directory.
async function computeDirectoryAges(
  repoPath: string,
  dirStats: Map<string, DirStats>,
): Promise<Map<string, number>> {
  const minCommitTime = new Map<string, number>()
  const trackedDirs = new Set(dirStats.keys())

  for await (const { commitTime, path } of streamAddedFiles(repoPath)) {
    const posix = path.replace(/\\/g, '/')
    for (const ancestor of ancestorDirs(posix)) {
      if (!trackedDirs.has(ancestor)) continue
      const prev = minCommitTime.get(ancestor)
      if (prev === undefined || commitTime < prev) {
        minCommitTime.set(ancestor, commitTime)
      }
    }
    const fileDir = fileParentDir(posix)
    if (trackedDirs.has(fileDir)) {
      const prev = minCommitTime.get(fileDir)
      if (prev === undefined || commitTime < prev) {
        minCommitTime.set(fileDir, commitTime)
      }
    }
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const ages = new Map<string, number>()
  for (const dir of trackedDirs) {
    const t = minCommitTime.get(dir)
    ages.set(dir, t === undefined ? 0 : Math.max(0, Math.floor((nowSec - t) / SECONDS_PER_DAY)))
  }
  return ages
}
