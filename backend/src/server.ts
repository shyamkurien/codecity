import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import cors from '@fastify/cors'
import { analyzeGithubRoute } from './routes/analyzeGithub.js'
import { analyzeLocalRoute } from './routes/analyzeLocal.js'
import { reposRoutes } from './routes/repos.js'
import { scanRoute } from './routes/scan.js'

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
    bodyLimit: 1024 * 1024,
  })

  const corsOrigin = process.env.CORS_ORIGIN
  await server.register(cors, {
    origin: corsOrigin ? corsOrigin.split(',').map((s) => s.trim()) : true,
    methods: ['GET', 'POST', 'OPTIONS'],
  })

  // The frontend expects error bodies as { error: string } on non-2xx. Fastify
  // defaults to { statusCode, error, message } — reshape here.
  server.setErrorHandler((err: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.warn({ err }, 'request error')
    const status = err.statusCode ?? 500
    reply.code(status)
    return { error: err.message }
  })

  server.get('/api/health', async () => ({ status: 'ok' }))
  await analyzeLocalRoute(server)
  await analyzeGithubRoute(server)
  await scanRoute(server)
  await reposRoutes(server)

  return server
}

async function main(): Promise<void> {
  const server = await buildServer()
  const port = Number(process.env.PORT ?? 3001)
  const host = process.env.HOST ?? '0.0.0.0'

  try {
    await server.listen({ port, host })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  await main()
}
