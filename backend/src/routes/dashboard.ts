import { FastifyInstance } from 'fastify';
import { PrismaClient, MovimentacaoTipo } from '@prisma/client';
import { FinanceService } from '../services/FinanceService';

const prisma = new PrismaClient();

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/stats', async (request, reply) => {
    const userPayload = request.user as { tenantId: string };
    
    try {
      const stats = await FinanceService.getGlobalDashboard(userPayload.tenantId);

      // Fetch all transactions to generate time-series chart data dynamically
      const transactions = await prisma.movimentacao.findMany({
        where: { tenantId: userPayload.tenantId },
        orderBy: { data: 'asc' }
      });

      // 1. Monthly Chart Dataset (e.g. last 6 months)
      const monthlyData: { [key: string]: { entradas: number; saidas: number; lucro: number } } = {};
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      // Default seed current month and previous month so the chart is never empty
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const label = `${months[d.getMonth()]}/${d.getFullYear().toString().substring(2)}`;
        monthlyData[label] = { entradas: 0, saidas: 0, lucro: 0 };
      }

      // Group actual transactions
      for (const t of transactions) {
        const date = new Date(t.data);
        const label = `${months[date.getMonth()]}/${date.getFullYear().toString().substring(2)}`;
        
        if (monthlyData[label] !== undefined) {
          const val = Number(t.valor);
          if (t.tipo === 'ENTRADA') {
            monthlyData[label].entradas += val;
          } else {
            monthlyData[label].saidas += val;
          }
          monthlyData[label].lucro = monthlyData[label].entradas - monthlyData[label].saidas;
        }
      }

      const chartMensal = Object.keys(monthlyData).map(key => ({
        name: key,
        entradas: monthlyData[key].entradas,
        saidas: monthlyData[key].saidas,
        lucro: monthlyData[key].lucro
      }));

      // 2. Weekly Chart Dataset (last 7 days)
      const weeklyData: { [key: string]: { entradas: number; saidas: number } } = {};
      const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = weekdayNames[d.getDay()];
        weeklyData[label] = { entradas: 0, saidas: 0 };
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const t of transactions) {
        const tDate = new Date(t.data);
        if (tDate >= sevenDaysAgo) {
          const label = weekdayNames[tDate.getDay()];
          if (weeklyData[label] !== undefined) {
            const val = Number(t.valor);
            if (t.tipo === 'ENTRADA') {
              weeklyData[label].entradas += val;
            } else {
              weeklyData[label].saidas += val;
            }
          }
        }
      }

      const chartSemanal = Object.keys(weeklyData).map(key => ({
        name: key,
        entradas: weeklyData[key].entradas,
        saidas: weeklyData[key].saidas
      }));

      // 3. Ranking of expenditures by project
      const rankingGastos: { name: string; valor: number }[] = stats.obrasSummaries.map(s => ({
        name: s.obraNome,
        valor: s.totalSaidas
      })).sort((a, b) => b.valor - a.valor);

      return reply.send({
        metrics: {
          faturamentoMensal: stats.faturamentoMensal,
          lucroLiquido: stats.lucroLiquido,
          entradas: stats.entradas,
          saidas: stats.saidas,
          saldoCaixa: stats.saldoCaixa,
          obrasEmAndamento: stats.obrasEmAndamento,
          obrasFinalizadas: stats.obrasFinalizadas,
          totalReembolsoPendenteRafael: stats.totalReembolsoPendenteRafael,
          totalReembolsoPendenteWilson: stats.totalReembolsoPendenteWilson,
          diasTrabalhadosTotal: stats.diasTrabalhadosTotal,
          custoOperacionalTotal: stats.custoOperacionalTotal
        },
        despesasPorCategoria: stats.despesasPorCategoria,
        rankingGastos,
        chartMensal,
        chartSemanal,
        obras: stats.obrasSummaries
      });
    } catch (err: any) {
      console.error(err);
      return reply.code(500).send({ message: 'Erro ao gerar dados do painel.' });
    }
  });
}
