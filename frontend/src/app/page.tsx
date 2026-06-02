'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  HardHat, 
  Clock, 
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Percent,
  Sparkles,
  Target,
  AlertTriangle,
  Terminal,
  Send,
  History
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import api from '../utils/api';

interface DashboardMetrics {
  faturamentoMensal: number;
  lucroLiquido: number;
  entradas: number;
  saidas: number;
  saldoCaixa: number;
  obrasEmAndamento: number;
  obrasFinalizadas: number;
  totalReembolsoPendenteRafael: number;
  totalReembolsoPendenteWilson: number;
  diasTrabalhadosTotal: number;
  custoOperacionalTotal: number;
}

interface ChartItem {
  name: string;
  entradas: number;
  saidas: number;
  lucro: number;
}

interface WeeklyChartItem {
  name: string;
  entradas: number;
  saidas: number;
}

interface CategorySpend {
  [key: string]: number;
}

interface RankingItem {
  name: string;
  valor: number;
}

interface AiLog {
  id: string;
  mensagemId: string;
  remetente: string;
  conteudo: string;
  comandoValido: boolean;
  comandoTipo: string | null;
  respostaEnviada: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartMensal, setChartMensal] = useState<ChartItem[]>([]);
  const [chartSemanal, setChartSemanal] = useState<WeeklyChartItem[]>([]);
  const [despesasCategorias, setDespesasCategorias] = useState<CategorySpend>({});
  const [rankingGastos, setRankingGastos] = useState<RankingItem[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [simulatedCommand, setSimulatedCommand] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await api.get('/api/dashboard/stats');
        const { metrics, chartMensal, chartSemanal, despesasPorCategoria, rankingGastos } = response.data;
        setMetrics(metrics);
        setChartMensal(chartMensal);
        setChartSemanal(chartSemanal);
        setDespesasCategorias(despesasPorCategoria);
        setRankingGastos(rankingGastos);

        try {
          const aiLogsRes = await api.get('/api/dashboard/ai-logs');
          setAiLogs(aiLogsRes.data);
        } catch (aiErr) {
          console.error('Error fetching AI logs:', aiErr);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);


  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSimulateCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedCommand) return;
    setSimulating(true);
    try {
      const response = await api.post('/api/webhook/whatsapp', {
        sender: '5521959416126',
        message: simulatedCommand,
        messageId: 'sim-' + Math.random().toString(36).substring(2, 9)
      });
      
      alert(`Resposta do Agente de IA:\n\n${response.data.responseText || response.data.message || 'Comando executado.'}`);
      setSimulatedCommand('');
      
      // recarregar
      const responseStats = await api.get('/api/dashboard/stats');
      const { metrics, chartMensal, chartSemanal, despesasPorCategoria, rankingGastos } = responseStats.data;
      setMetrics(metrics);
      setChartMensal(chartMensal);
      setChartSemanal(chartSemanal);
      setDespesasCategorias(despesasPorCategoria);
      setRankingGastos(rankingGastos);

      const aiLogsRes = await api.get('/api/dashboard/ai-logs');
      setAiLogs(aiLogsRes.data);
    } catch (err: any) {
      alert(err.response?.data?.responseText || err.response?.data?.message || 'Erro ao simular comando.');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solar-blue border-t-transparent"></div>
      </div>
    );
  }

  // Calculate global margin
  const faturamento = metrics?.entradas || 0;
  const lucro = metrics?.lucroLiquido || 0;
  const margemGlobal = faturamento > 0 ? ((lucro / faturamento) * 100).toFixed(1) : '0';

  // Target goal progress calculations
  const targetMonthlyGoal = 100000; // default 100k BRL monthly target goal
  const goalProgressPercentage = Math.min(100, Math.round((faturamento / targetMonthlyGoal) * 100));

  // Determine if out-of-pocket balance is critical
  const totalPendingRefunds = (metrics?.totalReembolsoPendenteRafael || 0) + (metrics?.totalReembolsoPendenteWilson || 0);
  const isCaixaCritical = (metrics?.saldoCaixa || 0) < totalPendingRefunds;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">Painel Consolidado</h2>
          <p className="text-zinc-500 text-sm mt-1">Gestão operacional de obras e fluxos de caixa de sócios</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900/80 px-4 py-2 rounded-xl border border-zinc-805 text-xs font-semibold text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
            WhatsApp Ativo (Agente de IA no n8n)
          </div>
        </div>
      </div>

      {/* METRICS CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* FATURAMENTO */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-solar-blue/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Faturamento (Entradas)</span>
            <div className="p-2 bg-solar-blue/10 rounded-lg text-solar-blue border border-solar-blue/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">{formatCurrency(metrics?.faturamentoMensal || 0)}</h3>
            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-400" />
              Soma total de recebimentos de obras
            </p>
          </div>
        </div>

        {/* LUCRO LIQUIDO */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-solar-emerald/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Lucro Líquido</span>
            <div className="p-2 bg-solar-emerald/10 rounded-lg text-solar-emerald border border-solar-emerald/20">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">{formatCurrency(metrics?.lucroLiquido || 0)}</h3>
            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-solar-emerald/10 text-solar-emerald border border-solar-emerald/25 rounded font-bold text-[10px]">
                {margemGlobal}% margem
              </span>
              Entradas menos despesas reais
            </p>
          </div>
        </div>

        {/* SALDO EM CAIXA */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-solar-blue/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Saldo Caixa (Disponível)</span>
            <div className="p-2 bg-solar-blue/10 rounded-lg text-solar-blue border border-solar-blue/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">{formatCurrency(metrics?.saldoCaixa || 0)}</h3>
            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-solar-blue" />
              Retido após reembolsos pagos
            </p>
          </div>
        </div>

        {/* PROJETOS COUNTERS */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-solar-yellow/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Projetos / Obras</span>
            <div className="p-2 bg-solar-yellow/10 rounded-lg text-solar-yellow border border-solar-yellow/20">
              <HardHat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">
              {metrics?.obrasEmAndamento} <span className="text-sm font-normal text-zinc-500">em andamento</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-solar-yellow" />
              {metrics?.obrasFinalizadas} obras concluídas no total
            </p>
          </div>
        </div>

      </div>

      {/* AI RECOMMENDATIONS & TARGETS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* EXECUTIVE TARGETS */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
            <Target className="h-4.5 w-4.5 text-solar-blue" />
            Meta Mensal de Vendas
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-zinc-400">
              <span>Progresso da meta</span>
              <span>{goalProgressPercentage}% ({formatCurrency(faturamento)} / {formatCurrency(targetMonthlyGoal)})</span>
            </div>
            <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-solar-blue h-full transition-all duration-300"
                style={{ width: `${goalProgressPercentage}%` }}
              ></div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500">A meta mensal ajuda a dimensionar a capacidade de instalação das equipes de campo.</p>
        </div>

        {/* AI STRATEGIC RECOMMENDATIONS (CO-OP PARTNER) */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 space-y-4 border-l-4 border-l-solar-blue">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-solar-steel animate-pulse" />
              Recomendações e Dicas da IA (n8n Agent)
            </h4>
            <span className="text-[9px] bg-solar-blue/10 border border-solar-blue/20 text-solar-steel px-2 py-0.5 rounded uppercase font-bold">
              Análise Inteligente
            </span>
          </div>

          <div className="space-y-3 text-xs text-zinc-400">
            {isCaixaCritical ? (
              <div className="flex items-start gap-2 text-amber-400 bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/10">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  *Aviso de Liquidez*: O valor dos reembolsos pendentes societários ({formatCurrency(totalPendingRefunds)}) excede o saldo em caixa disponível ({formatCurrency(metrics?.saldoCaixa || 0)}). Recomendo cobrar pagamentos parciais de obras ativas.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-emerald-400 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  *Saúde Financeira*: Caixa está saudável e cobre com folga todas as despesas e reembolsos operacionais pendentes dos sócios.
                </p>
              </div>
            )}
            
            <p>
              💡 *Dica de Equipe*: Victor e Carlos estão alocados juntos em 3 obras ativas. Considere reconfigurar as diárias em projetos de menor porte para manter a margem de lucro operacional acima de 30%.
            </p>
          </div>
        </div>

      </div>

      {/* WATERFALL REFUNDS / PARTNERS EQUITY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* REFUND METER: RAFAEL */}
        <div className="glass-card rounded-2xl p-6 border-l-4 border-l-solar-blue">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-zinc-300">Reembolsos Pendentes - Rafael</h4>
              <p className="text-xs text-zinc-500 mt-1">Despesas pessoais adiantadas do bolso em obras</p>
            </div>
            <span className="text-lg font-bold text-solar-blue">
              {formatCurrency(metrics?.totalReembolsoPendenteRafael || 0)}
            </span>
          </div>
          <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-solar-blue h-full transition-all duration-300"
              style={{ width: `${Math.min(100, ((metrics?.totalReembolsoPendenteRafael || 0) > 0 ? 60 : 0))}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2">
            <span>Prioridade Máxima no Waterfall</span>
            <span>A pagar conforme recebimento</span>
          </div>
        </div>

        {/* REFUND METER: WILSON */}
        <div className="glass-card rounded-2xl p-6 border-l-4 border-l-zinc-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-zinc-300">Reembolsos Pendentes - Wilson</h4>
              <p className="text-xs text-zinc-500 mt-1">Despesas pessoais adiantadas do bolso em obras</p>
            </div>
            <span className="text-lg font-bold text-zinc-400">
              {formatCurrency(metrics?.totalReembolsoPendenteWilson || 0)}
            </span>
          </div>
          <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-zinc-650 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, ((metrics?.totalReembolsoPendenteWilson || 0) > 0 ? 40 : 0))}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2">
            <span>Prioridade Máxima no Waterfall</span>
            <span>A pagar conforme recebimento</span>
          </div>
        </div>

      </div>

      {/* CHART SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MONTHLY BUSINESS PERFORMANCE AREA CHART */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-zinc-200">Faturamento vs Custos Mensais</h3>
              <p className="text-xs text-zinc-500 mt-1">Evolução do faturamento e custos globais da empresa</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartMensal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121214', borderColor: '#27272a', borderRadius: '8px', color: '#f4f4f5' }} 
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="entradas" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorEntradas)" name="Faturamento" />
                <Area type="monotone" dataKey="saidas" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#colorSaidas)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WEEKLY TRENDS BAR CHART */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-zinc-200">Despesas Semanais</h3>
              <p className="text-xs text-zinc-500 mt-1">Gasto total de campo nos últimos 7 dias</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartSemanal} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121214', borderColor: '#27272a', borderRadius: '8px', color: '#f4f4f5' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="saidas" fill="#0284c7" radius={[4, 4, 0, 0]} name="Custo Operacional" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* EXPENDITURE ANALYSIS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RANKING OF OBRAS EXPENSES DENSITY */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-zinc-200">Ranking de Gastos por Obra</h3>
              <p className="text-xs text-zinc-500 mt-1">Projetos com maior volume de despesa operacional</p>
            </div>
          </div>
          <div className="space-y-4">
            {rankingGastos.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-4 text-center">Nenhum gasto registrado em nenhuma obra.</p>
            ) : (
              rankingGastos.slice(0, 5).map((item, index) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-300 flex items-center gap-2">
                      <span className="text-[10px] bg-zinc-800 text-zinc-500 rounded h-5 w-5 flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      {item.name}
                    </span>
                    <span className="text-zinc-400">{formatCurrency(item.valor)}</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-solar-blue h-full"
                      style={{ width: `${Math.min(100, (item.valor / (rankingGastos[0]?.valor || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* EXPENSES BY CATEGORY */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-zinc-200">Despesas por Categoria</h3>
              <p className="text-xs text-zinc-500 mt-1">Distribuição de saídas de caixa operacionais</p>
            </div>
          </div>
          <div className="space-y-3.5">
            {Object.keys(despesasCategorias).length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-4 text-center">Nenhuma despesa registrada.</p>
            ) : (
              Object.keys(despesasCategorias).map((cat) => {
                const colors: { [key: string]: string } = {
                  UBER: 'bg-indigo-400',
                  DIARIA: 'bg-emerald-400',
                  ALIMENTACAO: 'bg-amber-400',
                  MATERIAL: 'bg-red-400',
                  COMBUSTIVEL: 'bg-orange-400',
                  FERRAMENTAS: 'bg-pink-400',
                  HOSPEDAGEM: 'bg-sky-400',
                  OUTROS: 'bg-zinc-500'
                };
                
                return (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2.5 font-medium text-zinc-300">
                      <span className={`h-2.5 w-2.5 rounded-full ${colors[cat] || 'bg-zinc-500'}`}></span>
                      {cat}
                    </span>
                    <span className="font-bold text-zinc-400">
                      {formatCurrency(despesasCategorias[cat])}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* CONSOLE DE MONITORAMENTO DA IA & SIMULADOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SIMULADOR DE COMANDO WHATSAPP */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
            <Terminal className="h-4.5 w-4.5 text-solar-steel animate-pulse" />
            Simulador de Comando WhatsApp (IA)
          </h4>
          <p className="text-xs text-zinc-500">
            Teste interativamente como a IA do n8n processa mensagens de texto e atualiza o banco de dados.
          </p>
          
          <form onSubmit={handleSimulateCommand} className="space-y-3">
            <input
              type="text"
              value={simulatedCommand}
              onChange={(e) => setSimulatedCommand(e.target.value)}
              placeholder="Ex: Uber obra João 130"
              className="premium-input text-xs"
              required
            />
            <button
              type="submit"
              disabled={simulating}
              className="premium-button-blue w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              {simulating ? 'Processando...' : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Enviar Comando de Teste
                </>
              )}
            </button>
          </form>

          <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 text-[10px] text-zinc-500 space-y-1">
            <p className="font-bold text-zinc-400">💡 Exemplos de comandos:</p>
            <p>• "Nova obra Galpão valor 45000"</p>
            <p>• "Recebido obra Galpão 15000"</p>
            <p>• "Material obra Galpão 750"</p>
            <p>• "Diária Carlos obra Galpão 150"</p>
          </div>
        </div>

        {/* AUDITORIA DE MENSAGENS (LOGS DO WHATSAPP) */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
              <History className="h-4.5 w-4.5 text-solar-blue" />
              Auditoria de Comandos WhatsApp (n8n IA)
            </h4>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-450 px-2 py-0.5 rounded font-semibold">
              Últimas interações
            </span>
          </div>

          <div className="max-h-[250px] overflow-y-auto space-y-3 pr-1">
            {aiLogs.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-8 text-center bg-zinc-900/10 rounded-xl border border-dashed border-zinc-850">
                Nenhum comando processado recentemente pelo n8n.
              </p>
            ) : (
              aiLogs.map((log) => (
                <div key={log.id} className="bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-850/80 space-y-2 text-xs transition-all hover:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 uppercase ${
                      log.comandoValido 
                        ? 'bg-solar-emerald/10 border-solar-emerald/20 text-solar-emerald' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {log.comandoValido ? 'Sucesso' : 'Comando Inválido'} ({log.comandoTipo || 'N/A'})
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-zinc-300"><span className="text-zinc-500 font-bold uppercase text-[9px] mr-1">Mensagem:</span> "{log.conteudo}"</p>
                    {log.respostaEnviada && (
                      <p className="text-zinc-400 pl-3 border-l border-solar-blue/30 italic"><span className="text-zinc-500 font-bold uppercase text-[9px] font-sans mr-1">Retorno:</span> {log.respostaEnviada}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
