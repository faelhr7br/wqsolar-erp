'use client';

import React, { useEffect, useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  HardHat, 
  Users, 
  Clock,
  MapPin,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import api from '../../utils/api';

interface CalendarDayLog {
  id: string;
  data: string;
  obraNome: string;
  obraId: string;
  equipe: string[];
}

interface Movimentacao {
  id: string;
  valor: number;
  tipo: string;
  categoriaEntrada: string | null;
  categoriaSaida: string | null;
  descricao: string;
  data: string;
  obra: { nome: string };
  socio: { user: { nome: string } } | null;
}

interface Obra {
  obraId: string;
  obraNome: string;
}

export default function CalendarioPage() {
  const [logs, setLogs] = useState<CalendarDayLog[]>([]);
  const [ledger, setLedger] = useState<Movimentacao[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Day details modal states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quick transaction form fields inside modal
  const [quickTipo, setQuickTipo] = useState('SAIDA');
  const [quickValor, setQuickValor] = useState('');
  const [quickObraId, setQuickObraId] = useState('');
  const [quickCategoria, setQuickCategoria] = useState('UBER');
  const [quickDescricao, setQuickDescricao] = useState('');

  const fetchCalendar = async () => {
    try {
      const res = await api.get('/api/obras');
      setObras(res.data.map((o: any) => ({ obraId: o.obraId, obraNome: o.obraNome })));
      
      const allLogs: CalendarDayLog[] = [];
      for (const o of res.data) {
        const detail = await api.get(`/api/obras/${o.obraId}`);
        for (const c of detail.data.calendario) {
          allLogs.push({
            id: c.id,
            data: c.data,
            obraNome: o.obraNome,
            obraId: o.obraId,
            equipe: c.equipe.map((e: any) => e.nome)
          });
        }
      }
      allLogs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setLogs(allLogs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async () => {
    try {
      const res = await api.get('/api/financeiro/ledger');
      setLedger(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchCalendar(), fetchLedger()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Monthly grid helper computations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Dom, 1 = Seg ...
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const daysGrid = [];
  // Empty blocks for days of previous month
  for (let i = 0; i < startDayOfWeek; i++) {
    daysGrid.push(null);
  }
  // Days of current month
  for (let i = 1; i <= totalDaysInMonth; i++) {
    daysGrid.push(new Date(year, month, i));
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getLogsForDate = (date: Date) => {
    return logs.filter(log => {
      const logDate = new Date(log.data);
      return (
        logDate.getUTCFullYear() === date.getFullYear() &&
        logDate.getUTCMonth() === date.getMonth() &&
        logDate.getUTCDate() === date.getDate()
      );
    });
  };

  const getTransactionsForDate = (date: Date) => {
    return ledger.filter(item => {
      const itemDate = new Date(item.data);
      return (
        itemDate.getUTCFullYear() === date.getFullYear() &&
        itemDate.getUTCMonth() === date.getMonth() &&
        itemDate.getUTCDate() === date.getDate()
      );
    });
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleQuickTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !quickValor || !quickObraId) {
      alert('Favor preencher o valor e selecionar a obra.');
      return;
    }

    try {
      await api.post('/api/financeiro/transaction', {
        valor: parseFloat(quickValor),
        tipo: quickTipo,
        categoriaEntrada: quickTipo === 'ENTRADA' ? 'PARCIAL' : null,
        categoriaSaida: quickTipo === 'SAIDA' ? quickCategoria : null,
        descricao: quickDescricao || 'Lançado via calendário',
        obraId: quickObraId,
        data: selectedDate.toISOString()
      });

      // reset
      setQuickValor('');
      setQuickDescricao('');
      
      // refresh ledger
      await fetchLedger();
      alert('Lançamento registrado com sucesso no dia de hoje!');
    } catch (err) {
      alert('Erro ao registrar transação.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento financeiro?')) return;
    try {
      await api.delete(`/api/financeiro/transaction/${id}`);
      await fetchLedger();
    } catch (err) {
      alert('Erro ao excluir transação.');
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solar-blue border-t-transparent"></div>
      </div>
    );
  }

  // Details calculation if modal is open
  const dayTransactions = selectedDate ? getTransactionsForDate(selectedDate) : [];
  const dayLogs = selectedDate ? getLogsForDate(selectedDate) : [];
  const dayEntradas = dayTransactions.filter(t => t.tipo === 'ENTRADA');
  const daySaidas = dayTransactions.filter(t => t.tipo === 'SAIDA');
  const totalDayEntradas = dayEntradas.reduce((acc, curr) => acc + Number(curr.valor), 0);
  const totalDaySaidas = daySaidas.reduce((acc, curr) => acc + Number(curr.valor), 0);
  const dayBalance = totalDayEntradas - totalDaySaidas;

  return (
    <div className="space-y-8 text-slate-800 animate-fade-in">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Calendário de Instalação</h2>
        <p className="text-slate-500 text-sm mt-1">Escalamento de equipes e histórico de visitas técnicas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MONTHLY CALENDAR GRID BOARD */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 space-y-6 bg-white border border-slate-200 shadow-sm">
          
          {/* Header selectors */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-700">
              {monthNames[month]} de {year}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Week days labels */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Days board */}
          <div className="grid grid-cols-7 gap-2">
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-20 bg-slate-50/20 border border-transparent rounded-lg"></div>;
              }

              const dateLogs = getLogsForDate(day);
              const dateTrans = getTransactionsForDate(day);
              const isToday = new Date().toDateString() === day.toDateString();

              return (
                <div 
                  key={day.toISOString()} 
                  onClick={() => handleDayClick(day)}
                  className={`h-20 p-2 border bg-white rounded-lg flex flex-col justify-between overflow-hidden relative cursor-pointer transition ${
                    isToday 
                      ? 'border-solar-blue shadow-md shadow-sky-500/10' 
                      : 'border-slate-200 hover:border-solar-blue/50 hover:bg-slate-50/55'
                  }`}
                >
                  <span className={`text-[10px] font-bold ${isToday ? 'text-solar-blue font-extrabold' : 'text-slate-400'}`}>
                    {day.getDate()}
                  </span>
                  
                  <div className="space-y-1 overflow-y-auto">
                    {dateLogs.map(log => (
                      <div 
                        key={log.id} 
                        className="text-[8px] bg-sky-50 border border-sky-100 text-solar-blue font-bold px-1 py-0.5 rounded truncate"
                        title={`${log.obraNome} - Equipe: ${log.equipe.join(', ')}`}
                      >
                        {log.obraNome}
                      </div>
                    ))}
                    
                    {dateTrans.length > 0 && (
                      <div className="text-[7px] bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.5 rounded truncate font-medium flex items-center gap-0.5">
                        <DollarSign className="h-2 w-2" />
                        {dateTrans.length} transações
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* CHRONOLOGICAL WORK LOG CHANNELS */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-slate-700 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Agenda Cronológica ({logs.length} dias logs)
          </h3>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                Nenhum log operacional gravado ainda.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="glass-card rounded-xl p-4 bg-white border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-solar-blue uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                      Instalação Solar
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(log.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <HardHat className="h-4 w-4 text-slate-500 shrink-0" />
                    {log.obraNome}
                  </h4>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                    <span>Equipe: <span className="font-semibold text-slate-700">{log.equipe.join(', ')}</span></span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-solar-emerald font-bold pt-1 border-t border-slate-100">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Status do dia: Concluído e faturado</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* WORKDAY DETAILS MODAL (CLIQUE NO DIA) */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div className="glass-panel w-full max-w-3xl rounded-2xl p-6 md:p-8 relative z-10 mx-4 bg-white border border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-bold">Detalhamento Operacional & Financeiro</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dia: <span className="font-semibold text-solar-blue">{selectedDate.toLocaleDateString('pt-BR')}</span>
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* OPERATIONAL LOGS AND STATS */}
              <div className="space-y-6">
                
                {/* 1. Worker Team on site */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-solar-blue" />
                    Equipes em Campo
                  </h4>
                  {dayLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhum trabalhador escalado para este dia.</p>
                  ) : (
                    <div className="space-y-3">
                      {dayLogs.map(log => (
                        <div key={log.id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                          <span className="font-bold text-slate-700">{log.obraNome}</span>
                          <span className="text-slate-500 font-medium">Equipe: {log.equipe.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Financial Balance for the Day */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-solar-emerald" />
                    Balanço Líquido do Dia
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Entradas:</span>
                      <span className="font-bold text-solar-emerald">{formatCurrency(totalDayEntradas)}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Gastos:</span>
                      <span className="font-bold text-red-500">{formatCurrency(totalDaySaidas)}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-500">Saldo Final do Dia:</span>
                    <span className={dayBalance >= 0 ? 'text-solar-emerald' : 'text-red-500'}>
                      {formatCurrency(dayBalance)}
                    </span>
                  </div>
                </div>

                {/* 3. Transaction list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-bold">Lançamentos da Data</h4>
                  {dayTransactions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-xl">
                      Nenhum faturamento ou despesa registrado nesta data.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                      {dayTransactions.map(trans => (
                        <div key={trans.id} className="text-xs bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
                          <div>
                            <p className="font-bold text-slate-800">{trans.obra.nome}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {trans.tipo === 'ENTRADA' ? `Recebimento (${trans.categoriaEntrada})` : `${trans.descricao} (${trans.categoriaSaida})`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-bold ${trans.tipo === 'ENTRADA' ? 'text-solar-emerald' : 'text-slate-800'}`}>
                              {trans.tipo === 'ENTRADA' ? '+' : '-'} {formatCurrency(trans.valor)}
                            </span>
                            <button
                              onClick={() => handleDeleteTransaction(trans.id)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded border border-transparent hover:border-red-100 transition"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* DIRECT QUICK TRANSACTION LOG FORM */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 font-bold">
                  <Plus className="h-4 w-4 text-solar-blue" />
                  Lançar Movimentação para esta Data
                </h4>
                <form onSubmit={handleQuickTransaction} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setQuickTipo('SAIDA')}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                        quickTipo === 'SAIDA' 
                          ? 'bg-red-50 border-red-200 text-red-500' 
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      Despesa / Saída
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTipo('ENTRADA')}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                        quickTipo === 'ENTRADA' 
                          ? 'bg-emerald-50 border-emerald-200 text-solar-emerald' 
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      Recebimento / Entrada
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Obra Vinculada</label>
                    <select
                      required
                      value={quickObraId}
                      onChange={(e) => setQuickObraId(e.target.value)}
                      className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                    >
                      <option value="">Selecione...</option>
                      {obras.map(o => (
                        <option key={o.obraId} value={o.obraId}>{o.obraNome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Valor (R$)</label>
                      <input
                        type="number"
                        required
                        value={quickValor}
                        onChange={(e) => setQuickValor(e.target.value)}
                        placeholder="Ex: 150"
                        className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Categoria</label>
                      {quickTipo === 'ENTRADA' ? (
                        <select className="premium-input text-xs bg-white border border-slate-200 text-slate-800" disabled>
                          <option value="PARCIAL">Parcial</option>
                        </select>
                      ) : (
                        <select
                          value={quickCategoria}
                          onChange={(e) => setQuickCategoria(e.target.value)}
                          className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                        >
                          <option value="UBER">Uber</option>
                          <option value="DIARIA">Diária</option>
                          <option value="ALIMENTACAO">Alimentação</option>
                          <option value="MATERIAL">Material</option>
                          <option value="COMBUSTIVEL">Combustível</option>
                          <option value="FERRAMENTAS">Ferramentas</option>
                          <option value="HOSPEDAGEM">Hospedagem</option>
                          <option value="OUTROS">Outros</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Descrição / Observações</label>
                    <input
                      type="text"
                      value={quickDescricao}
                      onChange={(e) => setQuickDescricao(e.target.value)}
                      placeholder="Ex: Uber ida do Carlos até Niterói..."
                      className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                    />
                  </div>

                  <button type="submit" className="premium-button-blue w-full py-2 text-xs font-bold shadow-sm">
                    Lançar Movimentação no Dia
                  </button>
                </form>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
