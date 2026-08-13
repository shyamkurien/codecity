import { availableParallelism } from 'node:os'
import type { FastifyInstance } from 'fastify'
import pLimit from 'p-limit'
import { analyzeRepository } from '../analysis/analyzeRepository.js'
import { findRepositories } from '../analysis/findRepositories.js'
import { saveRepo } from '../store.js'
import type { RepoAnalysis } from '../types.js'

const bodySchema = {
  type: 'object',
  required: ['path'],
  additionalProperties: false,
  properties: {
    path: { type: 'string', minLength: 1 },
  },
} as const

interface ScanBody {
  path: string
}

interface ScanResponse {
  repos: RepoAnalysis[]
  total_found: number
  total_analyzed: number
}

export async function scanRoute(server: FastifyInstance): Promise<void> {
  const concurrency = Math.max(1, availableParallelism())

  server.post<{ Body: ScanBody }>(
    '/api/scan',
    { schema: { body: bodySchema } },
    async (request, reply): Promise<ScanResponse | { error: string }> => {
      let repoPaths: string[]
      try {
        repoPaths = await findRepositories(request.body.path)
      } catch (err) {
        request.log.warn({ err }, 'scan: findRepositories failed')
        reply.code(400)
        return { error: err instanceof Error ? err.message : String(err) }
      }

      const total_found = repoPaths.length
      if (total_found === 0) {
        return { repos: [], total_found: 0, total_analyzed: 0 }
      }

      request.log.info({ total_found, concurrency }, 'scan: analyzing repositories')
      const limit = pLimit(concurrency)
      const results = await Promise.all(
        repoPaths.map((p) =>
          limit(async () => {
            try {
              return await analyzeRepository(p)
            } catch (err) {
              request.log.warn({ err, path: p }, 'scan: analyze failed for repo')
              return null
            }
          }),
        ),
      )

      const repos: RepoAnalysis[] = []
      for (const r of results) {
        if (r) {
          saveRepo(r)
          repos.push(r)
        }
      }

      return { repos, total_found, total_analyzed: repos.length }
    },
  )
}
