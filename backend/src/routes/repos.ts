import type { FastifyInstance } from 'fastify'
import { getRepo, listRepos } from '../store.js'

export async function reposRoutes(server: FastifyInstance): Promise<void> {
  server.get('/api/repos', async () => listRepos())

  server.get<{ Params: { id: string } }>('/api/repo/:id', async (request, reply) => {
    const repo = getRepo(request.params.id)
    if (!repo) {
      reply.code(404)
      return { error: 'Repository not found' }
    }
    return repo
  })

  server.get<{ Params: { id: string } }>('/api/repo/:id/tree', async (request, reply) => {
    const repo = getRepo(request.params.id)
    if (!repo) {
      reply.code(404)
      return { error: 'Repository not found' }
    }
    return repo.directories
  })
}
