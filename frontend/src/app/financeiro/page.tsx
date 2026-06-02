'use client';

import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Search, 
  Filter, 
  HardHat, 
  Trash2,
  CalendarDays,
  User,
  Tags,
  BookOpen,
  X
} from 'lucide-react';
import api from '../../utils/api';

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
  funcionario: { nome: string } | null;
}

interface Obra {
  obraId: string;
  obraNome: string;
}

interface Worker {
  id: string;
  nome: string;
}

export default function FinanceiroPage() {
  const [ledger, setLedger] = useState<Movimentacao[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [partners, setPartners] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Filters
  const [filterTipo, setFilterTipo] = useState('ALL');
  const [searchObra, setSearchObra] = useState('');

  // Form fields
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('SAIDA');
  const [categoriaEntrada, setCategoriaEntrada] = useState('PARCIAL');
  const [categoriaSaida, setCategoriaSaida] = useState('UBER');
  const [descricao, setDescricao] = useState('');
  const [obraId, setObraId] = useState('');
  const [socioId, setSocioId] = useState(''); // Empty = Caixa da Empresa
  const [funcionarioId, setFuncionarioId] = useState(''); // Empty = None
  const [data, setData] = useState('');

  const fetchLedger = async () => {
    try {
      const res = await api.get('/api/financeiro/ledger');
      setLedger(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchObras = async () => {
    try {
      const res = await api.get('/api/obras');
      setObras(res.data.map((o: any) => ({ obraId: o.obraId, obraNome: o.obraNome })));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/api/obras/funcionarios');
      setWorkers(res.data.map((w: any) => ({ id: w.id, nome: w.nome })));
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
    fetchLedger();
    fetchObras();
    fetchWorkers();
    fetchPartners();
  }, []);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor || !obraId) {
      alert('Favor preencher o valor e selecionar a obra.');
      return;
    }

    try {
      await api.post('/api/financeiro/transaction', {
        valor: parseFloat(valor),
        tipo,
        categoriaEntrada: tipo === 'ENTRADA' ? categoriaEntrada : null,
        categoriaSaida: tipo === 'SAIDA' ? categoriaSaida : null,
        descricao,
        obraId,
        socioId: socioId || null,
        funcionarioId: tipo === 'SAIDA' && categoriaSaida === 'DIARIA' ? funcionarioId : null,
        data: data ? new Date(data).toISOString() : null
      });

      // Reset
      setValor('');
      setDescricao('');
      setObraId('');
      setSocioId('');
      setFuncionarioId('');
      setData('');
      setIsFormOpen(false);
      
      // Refresh
      fetchLedger();
    } catch (err) {
      alert('Erro ao registrar transação.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento financeiro?')) return;
    try {
      await api.delete(`/api/financeiro/transaction/${id}`);
      fetchLedger();
    } catch (err) {
      alert('Erro ao excluir transação.');
    }
  };

  // Calculations
  const totalEntradas = ledger.filter(l => l.tipo === 'ENTRADA').reduce((a, b) => a + Number(b.valor), 0);
  const totalSaidas = ledger.filter(l => l.tipo === 'SAIDA').reduce((a, b) => a + Number(b.valor), 0);
  const saldoCaixa = totalEntradas - totalSaidas;

  const filteredLedger = ledger.filter(item => {
    const matchesTipo = filterTipo === 'ALL' || item.tipo === filterTipo;
    const matchesObra = item.obra.nome.toLowerCase().includes(searchObra.toLowerCase());
    return matchesTipo && matchesObra;
  });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Fluxo de Caixa & Livro Caixa</h2>
          <p className="text-slate-500 text-sm mt-1">Livro de lançamentos financeiros de obras, rateios e diárias</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="premium-button-blue flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Lançar Movimentação
        </button>
      </div>

      {/* QUICK STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* TOTAL ENTRADAS */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 bg-white border border-slate-200 shadow-sm">
          <div className="p-3 bg-emerald-50 text-solar-emerald border border-emerald-100 rounded-xl">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entradas Globais</span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(totalEntradas)}</h3>
          </div>
        </div>

        {/* TOTAL SAIDAS */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 bg-white border border-slate-200 shadow-sm">
          <div className="p-3 bg-red-50 text-red-500 border border-red-100 rounded-xl">
            <ArrowDownRight className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saídas Globais</span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(totalSaidas)}</h3>
          </div>
        </div>

        {/* SALDO CAIXA */}
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 bg-white border border-slate-200 shadow-sm">
          <div className="p-3 bg-sky-50 text-solar-blue border border-sky-100 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo em Caixa</span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(saldoCaixa)}</h3>
          </div>
        </div>

      </div>

      {/* FILTERS PANEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filtrar por:
          </span>
          {['ALL', 'ENTRADA', 'SAIDA'].map((tp) => (
            <button
              key={tp}
              onClick={() => setFilterTipo(tp)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                filterTipo === tp 
                  ? 'bg-solar-blue border-solar-blue text-white font-bold' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tp === 'ALL' ? 'Todos' : tp === 'ENTRADA' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 max-w-xs w-full">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por obra..."
            value={searchObra}
            onChange={(e) => setSearchObra(e.target.value)}
            className="w-full bg-transparent border-0 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0"
          />
        </div>

      </div>

      {/* LEDGER DATA TABLE */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solar-blue border-t-transparent"></div>
        </div>
      ) : filteredLedger.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 bg-white border border-slate-200 shadow-sm">
          <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-700">Nenhuma movimentação registrada.</p>
          <p className="text-xs text-slate-400 mt-1">Registre despesas de Uber, Material ou Alimentação para as obras.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Obra</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Fundo / Origem</th>
                  <th className="px-6 py-4">Detalhes</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLedger.map((mov) => {
                  const isEntrada = mov.tipo === 'ENTRADA';
                  
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-medium text-slate-500">
                        {new Date(mov.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {mov.obra.nome}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                          isEntrada 
                            ? 'bg-emerald-50 border-emerald-100 text-solar-emerald' 
                            : 'bg-red-50 border-red-100 text-red-500'
                        }`}>
                          {isEntrada ? mov.categoriaEntrada : mov.categoriaSaida}
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-bold ${isEntrada ? 'text-solar-emerald' : 'text-slate-800'}`}>
                        {isEntrada ? '+' : '-'} {formatCurrency(mov.valor)}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {mov.socio 
                          ? `Sócio (${mov.socio.user.nome})` 
                          : 'Caixa da Empresa'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate">
                        {mov.descricao || (mov.funcionario ? `Pago a ${mov.funcionario.nome}` : '-')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(mov.id)}
                          className="p-1.5 bg-red-50/5 hover:bg-red-50/10 border border-transparent hover:border-red-100 text-red-500 rounded-lg transition"
                          title="Excluir Lançamento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE TRANSACTION DIALOG/DRAWER */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsFormOpen(false)} />
          <div className="glass-panel w-full max-w-lg rounded-2xl p-8 relative z-10 mx-4 bg-white border border-slate-200 shadow-xl">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Lançar Movimentação Financeira</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              
              {/* SELECT TYPE (ENTRADA VS SAIDA) */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipo('SAIDA')}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    tipo === 'SAIDA' 
                      ? 'bg-red-50 border-red-200 text-red-500' 
                      : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Saída / Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('ENTRADA')}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    tipo === 'ENTRADA' 
                      ? 'bg-emerald-50 border-emerald-200 text-solar-emerald' 
                      : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Entrada / Recebimento
                </button>
              </div>

              {/* VALUE & DATE */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="150"
                    className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Data do Lançamento</label>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              {/* DYNAMIC CATEGORY AND OBRA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Obra Associada</label>
                  <select
                    required
                    value={obraId}
                    onChange={(e) => setObraId(e.target.value)}
                    className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                  >
                    <option value="">Selecione...</option>
                    {obras.map(o => (
                      <option key={o.obraId} value={o.obraId}>{o.obraNome}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Categoria</label>
                  {tipo === 'ENTRADA' ? (
                    <select
                      value={categoriaEntrada}
                      onChange={(e) => setCategoriaEntrada(e.target.value)}
                      className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                    >
                      <option value="SINAL">Sinal</option>
                      <option value="PARCIAL">Parcial</option>
                      <option value="PAGAMENTO_FINAL">Pagamento Final</option>
                    </select>
                  ) : (
                    <select
                      value={categoriaSaida}
                      onChange={(e) => setCategoriaSaida(e.target.value)}
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

              {/* WHO PAID (WATERFALL TRIGGER) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Quem Pagou? (Origem)</label>
                  <select
                    value={socioId}
                    onChange={(e) => setSocioId(e.target.value)}
                    className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                  >
                    <option value="">Caixa da Empresa (Empresa)</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} (Sócio)</option>
                    ))}
                  </select>
                </div>

                {/* EMPLOYEE SELECT IF CATEGORY DIARIA */}
                {tipo === 'SAIDA' && categoriaSaida === 'DIARIA' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Vincular Funcionário</label>
                    <select
                      value={funcionarioId}
                      onChange={(e) => setFuncionarioId(e.target.value)}
                      className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                    >
                      <option value="">Nenhum...</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Descrição / Observações</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Uber ida até o galpão para buscar painéis..."
                  rows={2}
                  className="premium-input text-xs bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <button type="submit" className="premium-button-blue w-full py-2.5 font-bold mt-2 shadow-sm">
                Efetuar Lançamento
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
