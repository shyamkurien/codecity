import { spawn } from 'node:child_process'
import * as readline from 'node:readline'
import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'

const execFile = promisify(execFileCb)

async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFile('git', args, { cwd, maxBuffer: 32 * 1024 * 1024 })
  return stdout.toString()
}

export async function assertGitRepo(repoPath: string): Promise<void> {
  try {
    await execFile('git', ['-C', repoPath, 'rev-parse', '--git-dir'])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Not a git repository: ${repoPath} (${msg})`)
  }
}

// Oldest commit timestamp in seconds since epoch.
// Uses root commits (--max-parents=0) so merge histories still produce the
// true birth of the tree.
export async function getOldestCommitSeconds(repoPath: string): Promise<number> {
  const out = await runGit(['log', '--max-parents=0', '--format=%ct', 'HEAD'], repoPath)
  const stamps = out
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n))
  if (stamps.length === 0) throw new Error('Repository has no commits')
  return Math.min(...stamps)
}

// For every commit (newest to oldest) that added a file, yield the pair
// { commitTime, addedPath }. Streamed line-by-line so large histories don't
// buffer in memory.
export async function* streamAddedFiles(
  repoPath: string,
): AsyncGenerator<{ commitTime: number; path: string }> {
  const args = [
    'log',
    '--format=__CT %ct',
    '--name-only',
    '--diff-filter=A',
    '--no-renames',
    'HEAD',
  ]
  const child = spawn('git', args, { cwd: repoPath, stdio: ['ignore', 'pipe', 'pipe'] })

  const errChunks: Buffer[] = []
  child.stderr.on('data', (c: Buffer) => errChunks.push(c))

  const closed = new Promise<number>((resolve, reject) => {
    child.on('close', (code) => resolve(code ?? 0))
    child.on('error', reject)
  })

  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity })
  let currentTime = 0

  try {
    for await (const rawLine of rl) {
      const line = rawLine.trim()
      if (line === '') continue
      if (line.startsWith('__CT ')) {
        currentTime = Number(line.slice(5))
        continue
      }
      if (currentTime > 0) {
        yield { commitTime: currentTime, path: line }
      }
    }
    const code = await closed
    if (code !== 0) {
      throw new Error(`git log failed: ${Buffer.concat(errChunks).toString()}`)
    }
  } finally {
    if (child.exitCode === null && !child.killed) child.kill()
  }
}
