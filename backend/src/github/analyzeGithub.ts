import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Octokit } from '@octokit/rest'
import { analyzeRepository } from '../analysis/analyzeRepository.js'
import type { RepoAnalysis } from '../types.js'

const execFile = promisify(execFileCb)

function makeOctokit(): Octokit {
  const auth = process.env.GITHUB_TOKEN
  return new Octokit(auth ? { auth } : {})
}

export async function analyzeGithubRepo(owner: string, repo: string): Promise<RepoAnalysis> {
  const octokit = makeOctokit()

  let cloneUrl: string
  try {
    const { data } = await octokit.repos.get({ owner, repo })
    if (!data.clone_url) throw new Error('No clone URL available')
    cloneUrl = data.clone_url
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`GitHub API error: ${msg}`)
  }

  const tmp = await mkdtemp(join(tmpdir(), 'codecity-'))
  try {
    try {
      await execFile('git', ['clone', '--depth', '1', '--single-branch', cloneUrl, tmp], {
        maxBuffer: 16 * 1024 * 1024,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Git clone failed: ${msg}`)
    }

    // Best-effort: recover the initial commit so age-days is meaningful.
    // Matches the Rust implementation, which also ignores this call's exit
    // code. Some remotes reject deepen fetches on shallow clones — fine.
    try {
      await execFile('git', ['-C', tmp, 'fetch', '--deepen=2147483647'], {
        maxBuffer: 16 * 1024 * 1024,
      })
    } catch {
      // ignore
    }

    const analysis = await analyzeRepository(tmp)
    analysis.name = `${owner}/${repo}`
    analysis.path = cloneUrl
    return analysis
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined)
  }
}
