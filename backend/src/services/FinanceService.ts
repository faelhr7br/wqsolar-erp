import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ObraFinanceSummary {
  obraId: string;
  obraNome: string;
  cliente: string;
  valorFechado: number;
  status: string;
  
  // Totals
  totalEntradas: number;
  totalSaidas: number;
  lucroLiquido: number;
  margemLucro: number;
  custoOperacional: number;

  // Sócio Spent Out-Of-Pocket
  gastoSocioRafael: number;
  gastoSocioWilson: number;
  gastoCaixaEmpresa: number;

  // Reimbursements
  reembolsadoRafael: number;
  reembolsadoWilson: number;
  reembolsoPendenteRafael: number;
  reembolsoPendenteWilson: number;

  // Profit Split Math
  lucroIndividualTeorico: number; // 50% of (totalEntradas - totalSaidas)
  saldoSocioRafael: number;       // spentA + profitTeorico - reimbursedA
  saldoSocioWilson: number;       // spentB + profitTeorico - reimbursedB
  
  // Operational Details
  diasTrabalhados: number;
  equipeNomes: string[];
}

export class FinanceService {
  /**
   * Calculates the full financial waterfall summary for a specific Obra
   */
  static async getObraSummary(obraId: string): Promise<ObraFinanceSummary> {
    const obra = await prisma.obra.findUnique({
      where: { id: obraId },
      include: {
        movimentacoes: {
          include: {
            socio: {
              include: { user: true }
            }
          }
        },
        reembolsos: {
          include: {
            socio: {
              include: { user: true }
            }
          }
        },
        diasTrabalho: {
          include: {
            equipe: {
              include: { funcionario: true }
            }
          }
        }
      }
    });

    if (!obra) {
      throw new Error(`Obra com ID ${obraId} não encontrada`);
    }

    const valorFechado = Number(obra.valorFechado);

    // Summing financial records
    let totalEntradas = 0;
    let totalSaidas = 0;

    let gastoSocioRafael = 0;
    let gastoSocioWilson = 0;
    let gastoCaixaEmpresa = 0;

    for (const mov of obra.movimentacoes) {
      const valor = Number(mov.valor);
      if (mov.tipo === 'ENTRADA') {
        totalEntradas += valor;
      } else {
        totalSaidas += valor;
        if (mov.socioId) {
          const socioNome = mov.socio?.user?.nome?.toLowerCase();
          if (socioNome === 'rafael') {
            gastoSocioRafael += valor;
          } else if (socioNome === 'wilson') {
            gastoSocioWilson += valor;
          } else {
            // fallback
            gastoSocioRafael += valor;
          }
        } else {
          gastoCaixaEmpresa += valor;
        }
      }
    }

    // Summing refunds already paid out
    let reembolsadoRafael = 0;
    let reembolsadoWilson = 0;

    for (const reemb of obra.reembolsos) {
      const valor = Number(reemb.valor);
      const socioNome = reemb.socio?.user?.nome?.toLowerCase();
      if (socioNome === 'rafael') {
        reembolsadoRafael += valor;
      } else if (socioNome === 'wilson') {
        reembolsadoWilson += valor;
      }
    }

    // Reimbursements outstanding
    const reembolsoPendenteRafael = Math.max(0, gastoSocioRafael - reembolsadoRafael);
    const reembolsoPendenteWilson = Math.max(0, gastoSocioWilson - reembolsadoWilson);

    // Net profit calculations (Real profit is based on closed value vs actual expenses)
    const lucroLiquido = totalEntradas - totalSaidas;
    const margemLucro = totalEntradas > 0 ? (lucroLiquido / totalEntradas) * 100 : 0;
    const custoOperacional = totalSaidas;

    // 50/50 division calculations
    const lucroIndividualTeorico = Math.max(0, lucroLiquido) / 2;

    // Saldo por Sócio represents what the company owes the partner (Out-of-pocket + profit portion - what was already refunded)
    const saldoSocioRafael = gastoSocioRafael + lucroIndividualTeorico - reembolsadoRafael;
    const saldoSocioWilson = gastoSocioWilson + lucroIndividualTeorico - reembolsadoWilson;

    // Extracting worker log statistics
    const diasTrabalhados = obra.diasTrabalho.length;
    const equipeSet = new Set<string>();
    for (const dia of obra.diasTrabalho) {
      for (const func of dia.equipe) {
        equipeSet.add(func.funcionario.nome);
      }
    }
    const equipeNomes = Array.from(equipeSet);

    return {
      obraId: obra.id,
      obraNome: obra.nome,
      cliente: obra.cliente,
      valorFechado,
      status: obra.status,
      totalEntradas,
      totalSaidas,
      lucroLiquido,
      margemLucro,
      custoOperacional,
      gastoSocioRafael,
      gastoSocioWilson,
      gastoCaixaEmpresa,
      reembolsadoRafael,
      reembolsadoWilson,
      reembolsoPendenteRafael,
      reembolsoPendenteWilson,
      lucroIndividualTeorico,
      saldoSocioRafael,
      saldoSocioWilson,
      diasTrabalhados,
      equipeNomes
    };
  }

  /**
   * Generates a global dashboard summary aggregating all obras and tenant-level finance indicators
   */
  static async getGlobalDashboard(tenantId: string) {
    const obras = await prisma.obra.findMany({
      where: { tenantId },
      select: { id: true }
    });

    let faturamentoMensal = 0;
    let lucroLiquidoGlobal = 0;
    let totalEntradasGlobal = 0;
    let totalSaidasGlobal = 0;
    let obrasEmAndamentoCount = 0;
    let obrasFinalizadasCount = 0;

    let totalPendReembolsoRafael = 0;
    let totalPendReembolsoWilson = 0;
    let globalDiasTrabalhados = 0;

    const summaries: ObraFinanceSummary[] = [];

    for (const o of obras) {
      const summary = await this.getObraSummary(o.id);
      summaries.push(summary);

      totalEntradasGlobal += summary.totalEntradas;
      totalSaidasGlobal += summary.totalSaidas;
      lucroLiquidoGlobal += summary.lucroLiquido;
      
      totalPendReembolsoRafael += summary.reembolsoPendenteRafael;
      totalPendReembolsoWilson += summary.reembolsoPendenteWilson;
      globalDiasTrabalhados += summary.diasTrabalhados;

      if (summary.status === 'EM_ANDAMENTO') {
        obrasEmAndamentoCount++;
      } else if (summary.status === 'FINALIZADA') {
        obrasFinalizadasCount++;
      }
    }

    // Company Box Balance: absolute entries minus absolute exits and minus cash paid out as partner out-of-pocket reimbursements
    const totalReembolsosPagos = summaries.reduce((acc, curr) => acc + curr.reembolsadoRafael + curr.reembolsadoWilson, 0);
    const saldoCaixaGlobal = totalEntradasGlobal - totalSaidasGlobal - totalReembolsosPagos;

    // Get expenditures categorized
    const movimentacoes = await prisma.movimentacao.findMany({
      where: { tenantId, tipo: 'SAIDA' },
      select: { categoriaSaida: true, valor: true }
    });

    const despesasPorCategoria: { [key: string]: number } = {};
    for (const mov of movimentacoes) {
      if (mov.categoriaSaida) {
        const cat = mov.categoriaSaida.toString();
        despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + Number(mov.valor);
      }
    }

    return {
      faturamentoMensal: totalEntradasGlobal, // all incoming amounts
      lucroLiquido: lucroLiquidoGlobal,
      entradas: totalEntradasGlobal,
      saidas: totalSaidasGlobal,
      saldoCaixa: Math.max(0, saldoCaixaGlobal),
      obrasEmAndamento: obrasEmAndamentoCount,
      obrasFinalizadas: obrasFinalizadasCount,
      totalReembolsoPendenteRafael,
      totalReembolsoPendenteWilson,
      diasTrabalhadosTotal: globalDiasTrabalhados,
      custoOperacionalTotal: totalSaidasGlobal,
      despesasPorCategoria,
      obrasSummaries: summaries
    };
  }
}
