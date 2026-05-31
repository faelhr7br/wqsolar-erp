import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email },
        include: { tenant: true, socio: true }
      });

      if (!user) {
        return reply.code(401).send({ message: 'Credenciais inválidas' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.senhaHash);
      if (!isPasswordValid) {
        return reply.code(401).send({ message: 'Credenciais inválidas' });
      }

      // Generate signed JWT token
      const token = fastify.jwt.sign(
        {
          userId: user.id,
          role: user.role,
          tenantId: user.tenantId,
          socioId: user.socio?.id || null
        },
        { expiresIn: '7d' }
      );

      return reply.send({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
          tenant: {
            id: user.tenant.id,
            nome: user.tenant.nome,
            slug: user.tenant.slug
          },
          socioId: user.socio?.id || null
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ message: 'Campos inválidos', errors: error.errors });
      }
      console.error(error);
      return reply.code(500).send({ message: 'Erro interno no servidor' });
    }
  });

  // Verify token validation route
  fastify.get('/me', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const payload = request.user as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { tenant: true, socio: true }
    });

    if (!user) {
      return reply.code(404).send({ message: 'Usuário não encontrado' });
    }

    return reply.send({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        tenant: {
          id: user.tenant.id,
          nome: user.tenant.nome,
          slug: user.tenant.slug
        },
        socioId: user.socio?.id || null
      }
    });
  });
}
