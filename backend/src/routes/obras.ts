import { FastifyInstance } from 'fastify';
import { PrismaClient, ObraStatus } from '@prisma/client';
import { z } from 'zod';
import { FinanceService } from '../services/FinanceService';

const prisma = new PrismaClient();

const createObraSchema = z.object({
  nome: z.string().min(3),
  cliente: z.string().min(2),
  valorFechado: z.number().positive(),
  observacoes: z.string().optional()
});

const updateObraSchema = z.object({
  nome: z.string().optional(),
  cliente: z.string().optional(),
  valorFechado: z.number().positive().optional(),
  status: z.nativeEnum(ObraStatus).optional(),
  observacoes: z.string().optional(),
  dataFinalizacao: z.string().datetime().nullable().optional()
});

const addCalendarSchema = z.object({
  data: z.string().datetime(),
  funcionarioIds: z.array(z.string())
});

export async function obrasRoutes(fastify: FastifyInstance) {
  // Apply authentication to all routes here
  fastify.addHook('preValidation', fastify.authenticate);

  // GET /api/obras - List all works
  fastify.get('/', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    
    const obras = await prisma.obra.findMany({
      where: { tenantId: userPayload.tenantId },
      orderBy: { dataCriacao: 'desc' }
    });

    // Populate financial summaries for each
    const list = [];
    for (const o of obras) {
      const summary = await FinanceService.getObraSummary(o.id);
      list.push(summary);
    }

    return reply.send(list);
  });

  // GET /api/obras/:id - Get single work detail
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const summary = await FinanceService.getObraSummary(id);
      
      // Also fetch calendar history
      const calendario = await prisma.diaTrabalhado.findMany({
        where: { obraId: id },
        include: {
          equipe: {
            include: { funcionario: true }
          }
        },
        orderBy: { data: 'desc' }
      });

      return reply.send({
        summary,
        calendario: calendario.map(c => ({
          id: c.id,
          data: c.data,
          equipe: c.equipe.map(e => ({
            id: e.funcionario.id,
            nome: e.funcionario.nome,
            telefone: e.funcionario.telefone,
            diaria: e.funcionario.valorDiariaPadrao
          }))
        }))
      });
    } catch (err: any) {
      return reply.code(404).send({ message: err.message || 'Obra não encontrada' });
    }
  });

  // POST /api/obras - Create new work
  fastify.post('/', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    try {
      const data = createObraSchema.parse(request.body);

      const newObra = await prisma.obra.create({
        data: {
          nome: data.nome,
          cliente: data.cliente,
          valorFechado: data.valorFechado,
          observacoes: data.observacoes,
          status: ObraStatus.EM_ANDAMENTO,
          tenantId: userPayload.tenantId
        }
      });

      return reply.code(201).send(newObra);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ message: 'Campos inválidos', errors: error.errors });
      }
      return reply.code(500).send({ message: 'Erro ao criar obra' });
    }
  });

  // PUT /api/obras/:id - Update existing work
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const data = updateObraSchema.parse(request.body);

      const updateData: any = { ...data };
      if (data.dataFinalizacao) {
        updateData.dataFinalizacao = new Date(data.dataFinalizacao);
      }

      const updatedObra = await prisma.obra.update({
        where: { id },
        data: updateData
      });

      return reply.send(updatedObra);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ message: 'Campos inválidos', errors: error.errors });
      }
      return reply.code(500).send({ message: 'Erro ao atualizar obra' });
    }
  });

  // DELETE /api/obras/:id - Delete work
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await prisma.obra.delete({
        where: { id }
      });
      return reply.send({ message: 'Obra excluída com sucesso' });
    } catch (error) {
      return reply.code(500).send({ message: 'Erro ao excluir obra' });
    }
  });

  // POST /api/obras/:id/calendario - Add work operational log (DiaTrabalhado)
  fastify.post('/:id/calendario', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userPayload = request.user as { tenantId: string };
    try {
      const { data, funcionarioIds } = addCalendarSchema.parse(request.body);

      const calendarDate = new Date(data);
      calendarDate.setHours(0, 0, 0, 0);

      // Create DiaTrabalhado entry
      const diaTrabalhado = await prisma.diaTrabalhado.upsert({
        where: {
          data_obraId: {
            data: calendarDate,
            obraId: id
          }
        },
        update: {},
        create: {
          data: calendarDate,
          obraId: id
        }
      });

      // Clear previous employees for this day (to enable re-saving)
      await prisma.diaTrabalhadoFuncionario.deleteMany({
        where: { diaTrabalhadoId: diaTrabalhado.id }
      });

      // Connect new employees list
      for (const fId of funcionarioIds) {
        await prisma.diaTrabalhadoFuncionario.create({
          data: {
            diaTrabalhadoId: diaTrabalhado.id,
            funcionarioId: fId
          }
        });
      }

      return reply.send({ message: 'Calendário atualizado com sucesso' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ message: 'Campos inválidos', errors: error.errors });
      }
      return reply.code(500).send({ message: 'Erro ao registrar calendário' });
    }
  });

  // GET /api/obras/funcionarios - List available workers
  fastify.get('/funcionarios', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    const { includeInactive } = request.query as { includeInactive?: string };
    
    const employees = await prisma.funcionario.findMany({
      where: { 
        tenantId: userPayload.tenantId,
        ...(includeInactive === 'true' ? {} : { ativo: true })
      },
      include: {
        _count: {
          select: { diasTrabalho: true }
        },
        movimentacoesPago: {
          where: {
            tipo: 'SAIDA',
            categoriaSaida: 'DIARIA'
          },
          select: {
            valor: true
          }
        }
      },
      orderBy: { nome: 'asc' }
    });
    return reply.send(employees);
  });

  // POST /api/obras/funcionarios - Create new worker
  fastify.post('/funcionarios', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    const { nome, telefone, valorDiariaPadrao } = request.body as {
      nome: string;
      telefone?: string;
      valorDiariaPadrao: number;
    };

    if (!nome || !valorDiariaPadrao) {
      return reply.code(400).send({ message: 'Nome e Diária Padrão são obrigatórios.' });
    }

    try {
      const employee = await prisma.funcionario.create({
        data: {
          nome,
          telefone: telefone || null,
          valorDiariaPadrao: Number(valorDiariaPadrao),
          tenantId: userPayload.tenantId,
          ativo: true
        }
      });
      return reply.code(201).send(employee);
    } catch (err: any) {
      console.error(err);
      return reply.code(500).send({ message: 'Erro ao cadastrar colaborador.' });
    }
  });

  // PUT /api/obras/funcionarios/:id - Update worker details
  fastify.put('/funcionarios/:id', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    const { id } = request.params as { id: string };
    const { nome, telefone, valorDiariaPadrao, ativo } = request.body as {
      nome?: string;
      telefone?: string;
      valorDiariaPadrao?: number;
      ativo?: boolean;
    };

    try {
      const existing = await prisma.funcionario.findFirst({
        where: { id, tenantId: userPayload.tenantId }
      });

      if (!existing) {
        return reply.code(404).send({ message: 'Colaborador não encontrado.' });
      }

      const updated = await prisma.funcionario.update({
        where: { id },
        data: {
          nome: nome ?? existing.nome,
          telefone: telefone !== undefined ? telefone : existing.telefone,
          valorDiariaPadrao: valorDiariaPadrao !== undefined ? Number(valorDiariaPadrao) : existing.valorDiariaPadrao,
          ativo: ativo !== undefined ? ativo : existing.ativo
        }
      });

      return reply.send(updated);
    } catch (err: any) {
      console.error(err);
      return reply.code(500).send({ message: 'Erro ao atualizar colaborador.' });
    }
  });

  // DELETE /api/obras/funcionarios/:id - Deactivate worker
  fastify.delete('/funcionarios/:id', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    const { id } = request.params as { id: string };

    try {
      const existing = await prisma.funcionario.findFirst({
        where: { id, tenantId: userPayload.tenantId }
      });

      if (!existing) {
        return reply.code(404).send({ message: 'Colaborador não encontrado.' });
      }

      // Soft delete by deactivating
      const deactivated = await prisma.funcionario.update({
        where: { id },
        data: { ativo: false }
      });

      return reply.send({ message: 'Colaborador desativado com sucesso.', worker: deactivated });
    } catch (err: any) {
      console.error(err);
      return reply.code(500).send({ message: 'Erro ao desativar colaborador.' });
    }
  });
}
