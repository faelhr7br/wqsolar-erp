'use client';

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  HardHat, 
  Eye, 
  DollarSign, 
  User, 
  CalendarDays, 
  ArrowRight,
  TrendingUp,
  X,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import api from '../../utils/api';

interface ObraSummary {
  obraId: string;
  obraNome: string;
  cliente: string;
  valorFechado: number;
  status: string;
  totalEntradas: number;
  totalSaidas: number;
  lucroLiquido: number;
  margemLucro: number;
  custoOperacional: number;
  gastoSocioRafael: number;
  gastoSocioWilson: number;
  gastoCaixaEmpresa: number;
  reembolsadoRafael: number;
  reembolsadoWilson: number;
  reembolsoPendenteRafael: number;
  reembolsoPendenteWilson: number;
  lucroIndividualTeorico: number;
  saldoSocioRafael: number;
  saldoSocioWilson: number;
  diasTrabalhados: number;
  equipeNomes: string[];
}

interface Worker {
  id: string;
  nome: string;
  valorDiariaPadrao: number;
}

interface CalendarLog {
  id: string;
  data: string;
  equipe: { id: string; nome: string }[];
}

export default function ObrasPage() {
  const [obras, setObras] = useState<ObraSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [valorFechado, setValorFechado] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Details Modal States
  const [selectedObra, setSelectedObra] = useState<ObraSummary | null>(null);
  const [calendarHistory, setCalendarHistory] = useState<CalendarLog[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  
  // Refund / Calendar log inside modal
  const [refundAmount, setRefundAmount] = useState('');
  const [refundSocioId, setRefundSocioId] = useState('');
  const [partners, setPartners] = useState<{ id: string; nome: string }[]>([]);
  const [calendarDate, setCalendarDate] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);

  // Instant Expense Log Inside Modal
  const [expenseVal, setExpenseVal] = useState('');
  const [expenseCat, setExpenseCat] = useState('MATERIAL');
  const [expensePaidBy, setExpensePaidBy] = useState(''); // Empty = Caixa da Empresa
  const [expenseDesc, setExpenseDesc] = useState('');

  const fetchObras = async () => {
    try {
      const res = await api.get('/api/obras');
      setObras(res.data);
    } catch (err) {
      console.error('Error fetching obras:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/api/obras/funcionarios');
      setWorkers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await api.get('/api/financeiro/socios');
      setPartners(res.data.map((p: any) => ({ id: p.id, nome: p.nome })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchObras();
    fetchWorkers();
    fetchPartners();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/obras', {
        nome,
        cliente,
        valorFechado: parseFloat(valorFechado),
        observacoes
      });
      setNome('');
      setCliente('');
      setValorFechado('');
      setObservacoes('');
      setIsCreateOpen(false);
      fetchObras();
    } catch (err) {
      alert('Erro ao criar obra.');
    }
  };

  const openDetails = async (obra: ObraSummary) => {
    setSelectedObra(obra);
    try {
      const res = await api.get(`/api/obras/${obra.obraId}`);
      setCalendarHistory(res.data.calendario);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedObra) return;
    try {
      await api.put(`/api/obras/${selectedObra.obraId}`, {
        status: newStatus
      });
      // Refresh summaries
      const updatedList = await api.get('/api/obras');
      setObras(updatedList.data);
      const newlyFetched = updatedList.data.find((o: any) => o.obraId === selectedObra.obraId);
      if (newlyFetched) setSelectedObra(newlyFetched);
    } catch (err) {
      alert('Erro ao alterar status da obra.');
    }
  };

  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObra || !refundSocioId || !refundAmount) return;

    try {
      await api.post('/api/financeiro/reembolsar', {
        valor: parseFloat(refundAmount),
        socioId: refundSocioId,
        obraId: selectedObra.obraId
      });
      setRefundAmount('');
      // refresh details
      const updatedList = await api.get('/api/obras');
      setObras(updatedList.data);
      const newlyFetched = updatedList.data.find((o: any) => o.obraId === selectedObra.obraId);
      if (newlyFetched) setSelectedObra(newlyFetched);
      alert('Reembolso pago com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao processar reembolso.');
    }
  };

  const handleAddCalendarDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObra || !calendarDate || selectedWorkers.length === 0) return;

    try {
      await api.post(`/api/obras/${selectedObra.obraId}/calendario`, {
        data: new Date(calendarDate).toISOString(),
        funcionarioIds: selectedWorkers
      });
      setCalendarDate('');
      setSelectedWorkers([]);
      // refresh calendar history
      const res = await api.get(`/api/obras/${selectedObra.obraId}`);
      setCalendarHistory(res.data.calendario);
      // refresh global summary stats
      const updatedList = await api.get('/api/obras');
      setObras(updatedList.data);
    } catch (err) {
      alert('Erro ao agendar equipe.');
    }
  };

  const handleLogInstantExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObra || !expenseVal) return;

    try {
      await api.post('/api/financeiro/transaction', {
        valor: parseFloat(expenseVal),
        tipo: 'SAIDA',
        categoriaSaida: expenseCat,
        descricao: expenseDesc || 'Lançado no modal da obra',
        obraId: selectedObra.obraId,
        socioId: expensePaidBy || null
      });

      setExpenseVal('');
      setExpenseDesc('');
      
      // refresh details
      const updatedList = await api.get('/api/obras');
      setObras(updatedList.data);
      const newlyFetched = updatedList.data.find((o: any) => o.obraId === selectedObra.obraId);
      if (newlyFetched) setSelectedObra(newlyFetched);
      alert('Despesa lançada com sucesso!');
    } catch (err) {
      alert('Erro ao lançar despesa.');
    }
  };

  const handleDeleteObra = async (id: string) => {
    if (!confirm('Deseja realmente deletar esta obra? Todos os lançamentos serão perdidos.')) return;
    try {
      await api.delete(`/api/obras/${id}`);
      fetchObras();
      setSelectedObra(null);
    } catch (err) {
      alert('Erro ao deletar obra.');
    }
  };

  const toggleWorkerSelection = (id: string) => {
    if (selectedWorkers.includes(id)) {
      setSelectedWorkers(selectedWorkers.filter(wId => wId !== id));
    } else {
      setSelectedWorkers([...selectedWorkers, id]);
    }
  };

  const filteredObras = obras.filter(o => 
    o.obraNome.toLowerCase().includes(search.toLowerCase()) || 
    o.cliente.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EM_ANDAMENTO':
        return 'bg-sky-50 text-solar-blue border border-sky-100';
      case 'FINALIZADA':
        return 'bg-emerald-50 text-solar-emerald border border-emerald-100';
      case 'PENDENTE_RECEBIMENTO':
        return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'CANCELADA':
        return 'bg-red-50 text-red-500 border border-red-100';
      default:
        return 'bg-slate-100 text-slate-500 border border-slate-200';
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Obras & Operações</h2>
          <p className="text-slate-500 text-sm mt-1">Status de instalações solares e custos reais de campo</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="premium-button-blue flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova Obra
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm max-w-md">
        <Search className="h-4 w-4 text-slate-400 ml-3" />
        <input
          type="text"
          placeholder="Buscar obra pelo nome ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-0 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
      </div>

      {/* WORKS GRID LIST */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solar-blue border-t-transparent"></div>
        </div>
      ) : filteredObras.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 bg-white border border-slate-200 shadow-sm">
          <HardHat className="h-10 w-10 text-slate-400 mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-700">Nenhuma obra cadastrada ou encontrada.</p>
          <p className="text-xs text-slate-400 mt-1">Cadastre via sistema ou envie "Nova obra João valor 34000" no WhatsApp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredObras.map((obra) => (
            <div key={obra.obraId} className="glass-card rounded-2xl p-6 flex flex-col justify-between bg-white border border-slate-200 shadow-sm">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${getStatusColor(obra.status)}`}>
                    {obra.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{obra.diasTrabalhados} dias em campo</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{obra.obraNome}</h3>
                <p className="text-xs text-slate-500 mt-1">Cliente: {obra.cliente}</p>

                {/* Micro operational ledger */}
                <div className="mt-5 space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Valor Fechado:</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(obra.valorFechado)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Faturado:</span>
                    <span className="font-semibold text-solar-blue">{formatCurrency(obra.totalEntradas)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Custo Total:</span>
                    <span className="font-semibold text-red-500">{formatCurrency(obra.totalSaidas)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
                    <div 
                      className="bg-solar-emerald h-full"
                      style={{ width: `${Math.min(100, (obra.totalEntradas > 0 ? (obra.lucroLiquido / obra.totalEntradas) * 100 : 0))}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                    <span>LUCRO LÍQUIDO PARCIAL</span>
                    <span className={`font-bold ${obra.lucroLiquido >= 0 ? 'text-solar-emerald' : 'text-red-500'}`}>
                      {formatCurrency(obra.lucroLiquido)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => openDetails(obra)}
                  className="premium-button-zinc flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE WORK DRAWER/MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
          <div className="glass-panel w-full max-w-md rounded-2xl p-8 relative z-10 mx-4 bg-white border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 font-bold">Criar Nova Obra</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nome da Obra</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João Solar"
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Cliente</label>
                <input
                  type="text"
                  required
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Valor Fechado (R$)</label>
                <input
                  type="number"
                  required
                  value={valorFechado}
                  onChange={(e) => setValorFechado(e.target.value)}
                  placeholder="34000"
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Especificações de painéis e inversores..."
                  rows={3}
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <button type="submit" className="premium-button-blue w-full py-2.5 font-bold mt-2 shadow-sm">
                Criar Obra
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED PROJECT PERFORMANCE MODAL */}
      {selectedObra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setSelectedObra(null)} />
          <div className="glass-panel w-full max-w-4xl rounded-2xl p-6 md:p-8 relative z-10 mx-4 my-8 max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${getStatusColor(selectedObra.status)}`}>
                  {selectedObra.status.replace('_', ' ')}
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-2">{selectedObra.obraNome}</h3>
                <p className="text-xs text-slate-400">Controle analítico de receitas, sócios e calendário</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDeleteObra(selectedObra.obraId)}
                  className="p-2 bg-red-50 border border-red-100 text-red-500 rounded-lg hover:bg-red-100 transition"
                  title="Deletar Obra"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={() => setSelectedObra(null)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Status Control */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap items-center gap-3 text-xs shadow-sm">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Alterar Status:</span>
              {['EM_ANDAMENTO', 'FINALIZADA', 'PENDENTE_RECEBIMENTO', 'CANCELADA'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    selectedObra.status === st 
                      ? 'bg-solar-blue text-white shadow-sm' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              
              {/* Box 1: Money values */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-bold">Métricas Financeiras</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Contratado:</span><span className="font-semibold text-slate-700">{formatCurrency(selectedObra.valorFechado)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Entradas (Faturamento):</span><span className="font-semibold text-solar-blue">{formatCurrency(selectedObra.totalEntradas)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Custos Totais:</span><span className="font-semibold text-red-500">{formatCurrency(selectedObra.totalSaidas)}</span></div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold"><span className="text-slate-500">LUCRO LÍQUIDO:</span><span className={selectedObra.lucroLiquido >= 0 ? 'text-solar-emerald' : 'text-red-500'}>{formatCurrency(selectedObra.lucroLiquido)}</span></div>
                </div>
              </div>

              {/* Box 2: Sócio Refund Rafael */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-bold">Reembolso Rafael</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Pago do Bolso:</span><span className="font-semibold text-slate-700">{formatCurrency(selectedObra.gastoSocioRafael)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Reembolsado:</span><span className="font-semibold text-slate-700">{formatCurrency(selectedObra.reembolsadoRafael)}</span></div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-solar-blue">
                    <span>A REEMBOLSAR:</span>
                    <span>{formatCurrency(selectedObra.reembolsoPendenteRafael)}</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Sócio Refund Wilson */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-bold">Reembolso Wilson</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Pago do Bolso:</span><span className="font-semibold text-slate-700">{formatCurrency(selectedObra.gastoSocioWilson)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Reembolsado:</span><span className="font-semibold text-slate-700">{formatCurrency(selectedObra.reembolsadoWilson)}</span></div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-500">
                    <span>A REEMBOLSAR:</span>
                    <span>{formatCurrency(selectedObra.reembolsoPendenteWilson)}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* COLUMN A: REEMBOLSO EXECUTION FORM */}
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-solar-emerald" />
                    Pagar Reembolso (Caixa Obra)
                  </h4>
                  <form onSubmit={handleExecuteRefund} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Sócio Reembolsado</label>
                      <select
                        required
                        value={refundSocioId}
                        onChange={(e) => setRefundSocioId(e.target.value)}
                        className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                      >
                        <option value="">Selecione o sócio...</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Valor do Payout (R$)</label>
                      <input
                        type="number"
                        required
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        placeholder="Ex: 500"
                        className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                      />
                    </div>
                    <button type="submit" className="premium-button-emerald w-full py-2 text-xs font-bold shadow-sm">
                      Confirmar Reembolso
                    </button>
                  </form>
                </div>

                {/* ADD CALENDAR LOG */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-solar-blue" />
                    Registrar Dia de Serviço
                  </h4>
                  <form onSubmit={handleAddCalendarDay} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Data do Lançamento</label>
                      <input
                        type="date"
                        required
                        value={calendarDate}
                        onChange={(e) => setCalendarDate(e.target.value)}
                        className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Selecionar Equipe</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {workers.map(w => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => toggleWorkerSelection(w.id)}
                            className={`px-2 py-1.5 rounded-lg text-left text-[11px] transition border flex items-center justify-between ${
                              selectedWorkers.includes(w.id)
                                ? 'bg-sky-50 border-solar-blue/40 text-solar-blue font-bold'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span>{w.nome}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="premium-button-blue w-full py-2 text-xs font-bold shadow-sm">
                      Logar Dia
                    </button>
                  </form>
                </div>
              </div>

              {/* COLUMN B: DIRECT INSTANT EXPENSE LOGGER */}
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2 font-bold">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Lançar Custo de Campo
                  </h4>
                  <form onSubmit={handleLogInstantExpense} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Valor Custo (R$)</label>
                      <input
                        type="number"
                        required
                        value={expenseVal}
                        onChange={(e) => setExpenseVal(e.target.value)}
                        placeholder="Ex: 130"
                        className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Categoria do Custo</label>
                      <select
                        value={expenseCat}
                        onChange={(e) => setExpenseCat(e.target.value)}
                        className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                      >
                        <option value="UBER">Uber</option>
                        <option value="ALIMENTACAO">Alimentação</option>
                        <option value="MATERIAL">Material</option>
                        <option value="COMBUSTIVEL">Combustível</option>
                        <option value="FERRAMENTAS">Ferramentas</option>
                        <option value="HOSPEDAGEM">Hospedagem</option>
                        <option value="OUTROS">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Quem adiantou o valor?</label>
                      <select
                        value={expensePaidBy}
                        onChange={(e) => setExpensePaidBy(e.target.value)}
                        className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                      >
                        <option value="">Caixa da Empresa (Caixa)</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Descrição / Info</label>
                      <input
                        type="text"
                        value={expenseDesc}
                        onChange={(e) => setExpenseDesc(e.target.value)}
                        placeholder="Ex: Uber ida buscar inversores..."
                        className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                      />
                    </div>
                    <button type="submit" className="premium-button-blue w-full py-2 text-xs font-bold shadow-sm">
                      Salvar Custo
                    </button>
                  </form>
                </div>
              </div>

              {/* COLUMN C: CALENDAR SERVICE LOGS HISTORY */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Histórico de Trabalho no Campo ({calendarHistory.length} dias)
                </h4>
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {calendarHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Nenhum dia de trabalho registrado nesta obra ainda.
                    </p>
                  ) : (
                    calendarHistory.map((day) => (
                      <div key={day.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-solar-emerald shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {new Date(day.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Presentes: {day.equipe.map(e => e.nome).join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
