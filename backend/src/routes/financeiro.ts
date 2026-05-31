import { FastifyInstance } from 'fastify';
import { PrismaClient, MovimentacaoTipo, CategoriaEntrada, CategoriaSaida } from '@prisma/client';
import { z } from 'zod';
import { FinanceService } from '../services/FinanceService';

const prisma = new PrismaClient();

const createMovimentacaoSchema = z.object({
  valor: z.number().positive(),
  tipo: z.nativeEnum(MovimentacaoTipo),
  categoriaEntrada: z.nativeEnum(CategoriaEntrada).optional().nullable(),
  categoriaSaida: z.nativeEnum(CategoriaSaida).optional().nullable(),
  descricao: z.string().optional().nullable(),
  obraId: z.string(),
  socioId: z.string().optional().nullable(), // Null = Company box, string = partner who paid out-of-pocket
  funcionarioId: z.string().optional().nullable(), // Null = default expense, string = paid to worker
  data: z.string().optional().nullable()
});

const createReembolsoSchema = z.object({
  valor: z.number().positive(),
  socioId: z.string(),
  obraId: z.string()
});

export async function financeiroRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  // GET /api/financeiro/ledger - List all financial entries and exits
  fastify.get('/ledger', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    
    const movimentacoes = await prisma.movimentacao.findMany({
      where: { tenantId: userPayload.tenantId },
      include: {
        obra: { select: { nome: true } },
        socio: { include: { user: { select: { nome: true } } } },
        funcionario: { select: { nome: true } }
      },
      orderBy: { data: 'desc' }
    });

    return reply.send(movimentacoes);
  });

  // POST /api/financeiro/transaction - Create a financial entry or exit
  fastify.post('/transaction', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    try {
      const body = createMovimentacaoSchema.parse(request.body);

      const mov = await prisma.movimentacao.create({
        data: {
          valor: body.valor,
          tipo: body.tipo,
          categoriaEntrada: body.tipo === 'ENTRADA' ? (body.categoriaEntrada || CategoriaEntrada.PARCIAL) : null,
          categoriaSaida: body.tipo === 'SAIDA' ? (body.categoriaSaida || CategoriaSaida.OUTROS) : null,
          descricao: body.descricao || '',
          obraId: body.obraId,
          socioId: body.socioId || null,
          funcionarioId: body.funcionarioId || null,
          data: body.data ? new Date(body.data) : new Date(),
          tenantId: userPayload.tenantId
        },
        include: {
          obra: { select: { nome: true } },
          socio: { include: { user: { select: { nome: true } } } },
          funcionario: { select: { nome: true } }
        }
      });

      return reply.code(201).send(mov);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ message: 'Lançamento inválido', errors: error.errors });
      }
      console.error(error);
      return reply.code(500).send({ message: 'Erro ao criar movimentação' });
    }
  });

  // DELETE /api/financeiro/transaction/:id - Void a transaction
  fastify.delete('/transaction/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await prisma.movimentacao.delete({
        where: { id }
      });
      return reply.send({ message: 'Movimentação excluída com sucesso' });
    } catch (error) {
      return reply.code(500).send({ message: 'Erro ao excluir movimentação' });
    }
  });

  // GET /api/financeiro/reembolsos - List all reimbursements history
  fastify.get('/reembolsos', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };

    const reembolsos = await prisma.reembolso.findMany({
      where: { tenantId: userPayload.tenantId },
      include: {
        socio: { include: { user: { select: { nome: true } } } },
        obra: { select: { nome: true } }
      },
      orderBy: { data: 'desc' }
    });

    return reply.send(reembolsos);
  });

  // POST /api/financeiro/reembolsar - Payout out-of-pocket refund to partner
  fastify.post('/reembolsar', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    try {
      const { valor, socioId, obraId } = createReembolsoSchema.parse(request.body);

      // Verify the partner actually has this pending refund amount on this project
      const summary = await FinanceService.getObraSummary(obraId);
      const partner = await prisma.socio.findUnique({
        where: { id: socioId },
        include: { user: true }
      });

      if (!partner) {
        return reply.code(404).send({ message: 'Sócio não localizado' });
      }

      const partnerName = partner.user.nome.toLowerCase();
      const currentPending = partnerName === 'rafael' ? summary.reembolsoPendenteRafael : summary.reembolsoPendenteWilson;

      if (valor > currentPending + 0.01) { // buffer check
        return reply.code(400).send({
          message: `Valor solicitado (R$ ${valor}) excede o saldo pendente de reembolso do sócio (R$ ${currentPending}) para esta obra.`
        });
      }

      // Create the refund payout voucher
      const reemb = await prisma.reembolso.create({
        data: {
          valor,
          socioId,
          obraId,
          tenantId: userPayload.tenantId
        },
        include: {
          socio: { include: { user: { select: { nome: true } } } },
          obra: { select: { nome: true } }
        }
      });

      return reply.code(201).send(reemb);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ message: 'Reembolso inválido', errors: error.errors });
      }
      console.error(error);
      return reply.code(500).send({ message: 'Erro ao processar reembolso' });
    }
  });

  // GET /api/financeiro/socios - Get partners profiles and totals
  fastify.get('/socios', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };

    const socios = await prisma.socio.findMany({
      include: {
        user: { select: { nome: true, email: true, role: true } }
      }
    });

    const globalDashboard = await FinanceService.getGlobalDashboard(userPayload.tenantId);

    const partners = socios.map(s => {
      const isRafael = s.user.nome.toLowerCase() === 'rafael';
      const pendingRefund = isRafael ? globalDashboard.totalReembolsoPendenteRafael : globalDashboard.totalReembolsoPendenteWilson;
      
      // Calculate total out-of-pocket funded globally
      const totalFunded = globalDashboard.obrasSummaries.reduce((acc, curr) => {
        return acc + (isRafael ? curr.gastoSocioRafael : curr.gastoSocioWilson);
      }, 0);

      // Calculate total refunded globally
      const totalRefunded = globalDashboard.obrasSummaries.reduce((acc, curr) => {
        return acc + (isRafael ? curr.reembolsadoRafael : curr.reembolsadoWilson);
      }, 0);

      // Profit split entitlement (50% of positive cash flow)
      const globalProfitShare = globalDashboard.obrasSummaries.reduce((acc, curr) => {
        return acc + curr.lucroIndividualTeorico;
      }, 0);

      // Current Net balance
      const currentNetEquity = totalFunded + globalProfitShare - totalRefunded;

      return {
        id: s.id,
        nome: s.user.nome,
        email: s.user.email,
        percentualSplit: s.percentualLucro,
        totalInvestidoBolso: totalFunded,
        totalReembolsado: totalRefunded,
        reembolsoPendente: pendingRefund,
        divisaoLucroGlobal: globalProfitShare,
        saldoSocio: currentNetEquity
      };
    });

    return reply.send(partners);
  });
}
