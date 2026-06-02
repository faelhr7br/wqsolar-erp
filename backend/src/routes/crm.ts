import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function crmRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  // List all leads
  fastify.get('/leads', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    try {
      const leads = await prisma.lead.findMany({
        where: { tenantId: userPayload.tenantId },
        orderBy: { createdAt: 'desc' }
      });
      return reply.send(leads);
    } catch (err: any) {
      console.error(err);
      return reply.code(500).send({ message: 'Erro ao buscar leads.' });
    }
  });

  // Create new lead
  fastify.post('/leads', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    const { nome, cliente, telefone, endereco, kwpEstimado, valorProposta, status, observacoes } = request.body as {
      nome: string;
      cliente: string;
      telefone?: string;
      endereco?: string;
      kwpEstimado?: number;
      valorProposta?: number;
      status?: string;
      observacoes?: string;
    };

    if (!nome || !cliente) {
      return reply.code(400).send({ message: 'Nome e Cliente são obrigatórios.' });
    }

    try {
      const lead = await prisma.lead.create({
        data: {
          nome,
          cliente,
          telefone,
          endereco,
          kwpEstimado: kwpEstimado ? Number(kwpEstimado) : null,
          valorProposta: valorProposta ? Number(valorProposta) : null,
          status: status || 'NOVO_LEAD',
          observacoes,
          tenantId: userPayload.tenantId
        }
      });
      return reply.code(201).send(lead);
    } catch (err: any) {
      console.error(err);
      return reply.code(500).send({ message: 'Erro ao criar lead.' });
    }
  });

  // Update lead
  fastify.put('/leads/:id', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    const { id } = request.params as { id: string };
    const { nome, cliente, telefone, endereco, kwpEstimado, valorProposta, status, observacoes } = request.body as {
      nome?: string;
      cliente?: string;
      telefone?: string;
      endereco?: string;
      kwpEstimado?: number;
      valorProposta?: number;
      status?: string;
      observacoes?: string;
    };

    try {
      const existing = await prisma.lead.findFirst({
        where: { id, tenantId: userPayload.tenantId }
      });

      if (!existing) {
        return reply.code(404).send({ message: 'Lead não encontrado.' });
      }

      const updated = await prisma.lead.update({
        where: { id },
        data: {
          nome: nome ?? existing.nome,
          cliente: cliente ?? existing.cliente,
          telefone: telefone ?? existing.telefone,
          endereco: endereco ?? existing.endereco,
          kwpEstimado: kwpEstimado !== undefined ? (kwpEstimado ? Number(kwpEstimado) : null) : existing.kwpEstimado,
          valorProposta: valorProposta !== undefined ? (valorProposta ? Number(valorProposta) : null) : existing.valorProposta,
          status: status ?? existing.status,
          observacoes: observacoes ?? existing.observacoes
        }
      });

      return reply.send(updated);
    } catch (err: any) {
      console.error(err);
      return reply.code(500).send({ message: 'Erro ao atualizar lead.' });
    }
  });

  // Delete lead
  fastify.delete('/leads/:id', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    const { id } = request.params as { id: string };

    try {
      const existing = await prisma.lead.findFirst({
        where: { id, tenantId: userPayload.tenantId }
      });

      if (!existing) {
        return reply.code(404).send({ message: 'Lead não encontrado.' });
      }

      await prisma.lead.delete({
        where: { id }
      });

      return reply.send({ message: 'Lead removido com sucesso.' });
    } catch (err: any) {
      console.error(err);
      return reply.code(500).send({ message: 'Erro ao remover lead.' });
    }
  });

  // Convert Lead to Obra (Project)
  fastify.post('/leads/:id/convert', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    const { id } = request.params as { id: string };
    const { valorFechado, observacoesObra } = request.body as {
      valorFechado: number;
      observacoesObra?: string;
    };

    try {
      const lead = await prisma.lead.findFirst({
        where: { id, tenantId: userPayload.tenantId }
      });

      if (!lead) {
        return reply.code(404).send({ message: 'Lead não encontrado.' });
      }

      const finalVal = valorFechado !== undefined ? Number(valorFechado) : Number(lead.valorProposta || 0);

      // Create new Obra
      const newObra = await prisma.obra.create({
        data: {
          nome: lead.nome,
          cliente: lead.cliente,
          valorFechado: finalVal,
          status: 'EM_ANDAMENTO',
          observacoes: observacoesObra || lead.observacoes || `Obra convertida a partir do Lead CRM: ${lead.nome}`,
          tenantId: userPayload.tenantId
        }
      });

      // Update Lead status to WON / CONTRATO_FECHADO
      await prisma.lead.update({
        where: { id },
        data: {
          status: 'CONTRATO_FECHADO'
        }
      });

      return reply.send({
        message: 'Lead convertido com sucesso em Obra!',
        obra: newObra
      });
    } catch (err: any) {
      console.error('Error converting lead to project:', err);
      return reply.code(500).send({ message: 'Erro ao converter lead para obra.' });
    }
  });
}
