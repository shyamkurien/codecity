import type { FastifyInstance } from 'fastify'
import { analyzeRepository } from '../analysis/analyzeRepository.js'
import { saveRepo } from '../store.js'

const bodySchema = {
  type: 'object',
  required: ['path'],
  additionalProperties: false,
  properties: {
    path: { type: 'string', minLength: 1 },
  },
} as const

interface AnalyzeLocalBody {
  path: string
}

export async function analyzeLocalRoute(server: FastifyInstance): Promise<void> {
  server.post<{ Body: AnalyzeLocalBody }>(
    '/api/analyze/local',
    { schema: { body: bodySchema } },
    async (request, reply) => {
      try {
        const analysis = await analyzeRepository(request.body.path)
        saveRepo(analysis)
        return analysis
      } catch (err) {
        request.log.warn({ err }, 'analyze/local failed')
        reply.code(400)
        return { error: err instanceof Error ? err.message : String(err) }
      }
    },
  )
}
