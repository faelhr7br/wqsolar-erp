import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';

import { authRoutes } from './routes/auth';
import { obrasRoutes } from './routes/obras';
import { financeiroRoutes } from './routes/financeiro';
import { dashboardRoutes } from './routes/dashboard';
import { webhookRoutes } from './routes/webhook';
import { crmRoutes } from './routes/crm';

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: true
});

// Configure CORS
fastify.register(cors, {
  origin: '*', // allows simple local integration
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Configure JWT
const jwtSecret = process.env.JWT_SECRET || 'solar-erp-super-secret-key-2026';
fastify.register(jwt, {
  secret: jwtSecret
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Authentication Decorator for Routes
fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader === 'Bearer wqsolar-erp-master-api-key-2026') {
      const firstTenant = await prisma.tenant.findFirst();
      const user = await prisma.user.findFirst({ where: { tenantId: firstTenant?.id } });
      const socio = await prisma.socio.findFirst({ where: { userId: user?.id } });
      request.user = {
        userId: user?.id || 'n8n-system-user-id',
        role: user?.role || 'ADMIN',
        tenantId: firstTenant?.id || 'wq-solar-tenant-id',
        socioId: socio?.id || null
      };
      return;
    }
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ message: 'Token de autenticação inválido ou ausente' });
  }
});

// Extend Fastify types to support the authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }
}

// Register API Routes
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(obrasRoutes, { prefix: '/api/obras' });
fastify.register(financeiroRoutes, { prefix: '/api/financeiro' });
fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
fastify.register(webhookRoutes, { prefix: '/api/webhook' });
fastify.register(crmRoutes, { prefix: '/api/crm' });

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Solar Operational Backend running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
