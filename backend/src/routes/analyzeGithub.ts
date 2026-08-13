import type { FastifyInstance } from 'fastify'
import { analyzeGithubRepo } from '../github/analyzeGithub.js'
import { saveRepo } from '../store.js'

const bodySchema = {
  type: 'object',
  required: ['owner', 'repo'],
  additionalProperties: false,
  properties: {
    owner: { type: 'string', minLength: 1 },
    repo: { type: 'string', minLength: 1 },
  },
} as const

interface AnalyzeGithubBody {
  owner: string
  repo: string
}

export async function analyzeGithubRoute(server: FastifyInstance): Promise<void> {
  server.post<{ Body: AnalyzeGithubBody }>(
    '/api/analyze/github',
    { schema: { body: bodySchema } },
    async (request, reply) => {
      try {
        const analysis = await analyzeGithubRepo(request.body.owner, request.body.repo)
        saveRepo(analysis)
        return analysis
      } catch (err) {
        request.log.warn({ err }, 'analyze/github failed')
        reply.code(400)
        return { error: err instanceof Error ? err.message : String(err) }
      }
    },
  )
}
