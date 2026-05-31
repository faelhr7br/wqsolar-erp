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
  Trash2
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
        return 'bg-solar-violet/10 text-solar-violet border border-solar-violet/20';
      case 'FINALIZADA':
        return 'bg-solar-emerald/10 text-solar-emerald border border-solar-emerald/20';
      case 'PENDENTE_RECEBIMENTO':
        return 'bg-solar-yellow/10 text-solar-yellow border border-solar-yellow/20';
      case 'CANCELADA':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Obras & Operações</h2>
          <p className="text-zinc-500 text-sm mt-1">Status de instalações solares e custos reais de campo</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="premium-button-violet flex items-center gap-2 text-sm shadow-lg shadow-solar-violet/10"
        >
          <Plus className="h-4 w-4" />
          Nova Obra
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex items-center gap-3 bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800/80 max-w-md">
        <Search className="h-4 w-4 text-zinc-500 ml-3" />
        <input
          type="text"
          placeholder="Buscar obra pelo nome ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-0 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-0"
        />
      </div>

      {/* WORKS GRID LIST */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solar-violet border-t-transparent"></div>
        </div>
      ) : filteredObras.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-zinc-500">
          <HardHat className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
          <p className="text-sm font-semibold">Nenhuma obra cadastrada ou encontrada.</p>
          <p className="text-xs text-zinc-600 mt-1">Cadastre via sistema ou envie "Nova obra João valor 34000" no WhatsApp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredObras.map((obra) => (
            <div key={obra.obraId} className="glass-card rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${getStatusColor(obra.status)}`}>
                    {obra.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">{obra.diasTrabalhados} dias em campo</span>
                </div>

                <h3 className="text-lg font-bold text-zinc-100 tracking-tight">{obra.obraNome}</h3>
                <p className="text-xs text-zinc-400 mt-1">Cliente: {obra.cliente}</p>

                {/* Micro operational ledger */}
                <div className="mt-5 space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Valor Fechado:</span>
                    <span className="font-semibold text-zinc-300">{formatCurrency(obra.valorFechado)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Faturado:</span>
                    <span className="font-semibold text-solar-violet">{formatCurrency(obra.totalEntradas)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Custo Total:</span>
                    <span className="font-semibold text-red-400">{formatCurrency(obra.totalSaidas)}</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-3">
                    <div 
                      className="bg-solar-emerald h-full"
                      style={{ width: `${Math.min(100, (obra.totalEntradas > 0 ? (obra.lucroLiquido / obra.totalEntradas) * 100 : 0))}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500 mt-1">
                    <span>LUCRO LÍQUIDO PARCIAL</span>
                    <span className={obra.lucroLiquido >= 0 ? 'text-solar-emerald' : 'text-red-400'}>
                      {formatCurrency(obra.lucroLiquido)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-card-border/80 flex gap-2">
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <div className="glass-panel w-full max-w-md rounded-2xl p-8 relative z-10 mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-zinc-100">Criar Nova Obra</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Nome da Obra</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João Solar"
                  className="premium-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Cliente</label>
                <input
                  type="text"
                  required
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="premium-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Valor Fechado (R$)</label>
                <input
                  type="number"
                  required
                  value={valorFechado}
                  onChange={(e) => setValorFechado(e.target.value)}
                  placeholder="34000"
                  className="premium-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Especificações de painéis e inversores..."
                  rows={3}
                  className="premium-input text-sm"
                />
              </div>

              <button type="submit" className="premium-button-violet w-full py-2.5 font-bold mt-2">
                Criar Obra
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED PROJECT PERFORMANCE MODAL */}
      {selectedObra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedObra(null)} />
          <div className="glass-panel w-full max-w-4xl rounded-2xl p-6 md:p-8 relative z-10 mx-4 my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${getStatusColor(selectedObra.status)}`}>
                  {selectedObra.status.replace('_', ' ')}
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight mt-2">{selectedObra.obraNome}</h3>
                <p className="text-xs text-zinc-500">Controle analítico de receitas, sócios e calendário</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDeleteObra(selectedObra.obraId)}
                  className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition"
                  title="Deletar Obra"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={() => setSelectedObra(null)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-zinc-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Status Control */}
            <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 mb-6 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-zinc-500 font-bold uppercase tracking-wider">Alterar Status:</span>
              {['EM_ANDAMENTO', 'FINALIZADA', 'PENDENTE_RECEBIMENTO', 'CANCELADA'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    selectedObra.status === st 
                      ? 'bg-solar-violet text-white shadow' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              
              {/* Box 1: Money values */}
              <div className="bg-zinc-900/30 p-5 rounded-xl border border-zinc-800/80 space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Métricas Financeiras</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500">Contratado:</span><span className="font-semibold text-zinc-200">{formatCurrency(selectedObra.valorFechado)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Entradas (Faturamento):</span><span className="font-semibold text-solar-violet">{formatCurrency(selectedObra.totalEntradas)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Custos Totais:</span><span className="font-semibold text-red-400">{formatCurrency(selectedObra.totalSaidas)}</span></div>
                  <div className="border-t border-zinc-850 pt-2 flex justify-between font-bold"><span className="text-zinc-400">LUCRO LÍQUIDO:</span><span className={selectedObra.lucroLiquido >= 0 ? 'text-solar-emerald' : 'text-red-400'}>{formatCurrency(selectedObra.lucroLiquido)}</span></div>
                </div>
              </div>

              {/* Box 2: Sócio Refund Rafael */}
              <div className="bg-zinc-900/30 p-5 rounded-xl border border-zinc-800/80 space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Reembolso Rafael</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500">Pago do Bolso:</span><span className="font-semibold text-zinc-200">{formatCurrency(selectedObra.gastoSocioRafael)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Reembolsado:</span><span className="font-semibold text-zinc-200">{formatCurrency(selectedObra.reembolsadoRafael)}</span></div>
                  <div className="border-t border-zinc-850 pt-2 flex justify-between font-bold text-solar-violet">
                    <span>A REEMBOLSAR:</span>
                    <span>{formatCurrency(selectedObra.reembolsoPendenteRafael)}</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Sócio Refund Wilson */}
              <div className="bg-zinc-900/30 p-5 rounded-xl border border-zinc-800/80 space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Reembolso Wilson</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500">Pago do Bolso:</span><span className="font-semibold text-zinc-200">{formatCurrency(selectedObra.gastoSocioWilson)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Reembolsado:</span><span className="font-semibold text-zinc-200">{formatCurrency(selectedObra.reembolsadoWilson)}</span></div>
                  <div className="border-t border-zinc-850 pt-2 flex justify-between font-bold text-solar-blue">
                    <span>A REEMBOLSAR:</span>
                    <span>{formatCurrency(selectedObra.reembolsoPendenteWilson)}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* COLUMN A: REEMBOLSO EXECUTION FORM */}
              <div className="space-y-6">
                <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800">
                  <h4 className="font-bold text-sm text-zinc-200 mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-solar-emerald" />
                    Pagar Reembolso (Com caixa da obra)
                  </h4>
                  <form onSubmit={handleExecuteRefund} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase">Sócio Reembolsado</label>
                      <select
                        required
                        value={refundSocioId}
                        onChange={(e) => setRefundSocioId(e.target.value)}
                        className="premium-input text-xs"
                      >
                        <option value="">Selecione o sócio...</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase">Valor do Payout (R$)</label>
                      <input
                        type="number"
                        required
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        placeholder="Ex: 500"
                        className="premium-input text-xs"
                      />
                    </div>
                    <button type="submit" className="premium-button-emerald w-full py-2 text-xs font-bold">
                      Confirmar Payout de Reembolso
                    </button>
                  </form>
                </div>

                {/* ADD CALENDAR LOG */}
                <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800">
                  <h4 className="font-bold text-sm text-zinc-200 mb-4 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-solar-violet" />
                    Registrar Dia de Trabalho (Calendário)
                  </h4>
                  <form onSubmit={handleAddCalendarDay} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase">Data do Lançamento</label>
                      <input
                        type="date"
                        required
                        value={calendarDate}
                        onChange={(e) => setCalendarDate(e.target.value)}
                        className="premium-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 uppercase">Selecionar Equipe Presente</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {workers.map(w => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => toggleWorkerSelection(w.id)}
                            className={`px-3 py-2 rounded-lg text-left text-xs transition border flex items-center justify-between ${
                              selectedWorkers.includes(w.id)
                                ? 'bg-solar-violet/10 border-solar-violet/40 text-zinc-100 font-bold'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                            }`}
                          >
                            <span>{w.nome}</span>
                            <span className="text-[9px] text-zinc-500">R$ {w.valorDiariaPadrao}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="premium-button-violet w-full py-2 text-xs font-bold">
                      Logar Dia de Serviço
                    </button>
                  </form>
                </div>
              </div>

              {/* COLUMN B: CALENDAR SERVICE LOGS HISTORY */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  Histórico de Trabalho no Campo ({calendarHistory.length} dias)
                </h4>
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {calendarHistory.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-6 text-center bg-zinc-900/10 rounded-xl border border-dashed border-zinc-850">
                      Nenhum dia de trabalho registrado nesta obra ainda.
                    </p>
                  ) : (
                    calendarHistory.map((day) => (
                      <div key={day.id} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-850/80 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-solar-emerald shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-zinc-200">
                              {new Date(day.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">
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
