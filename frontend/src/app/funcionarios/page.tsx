'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  Phone, 
  DollarSign, 
  Calendar, 
  CheckCircle,
  HardHat,
  Search,
  X,
  Edit,
  Trash2,
  Coins,
  AlertCircle
} from 'lucide-react';
import api from '../../utils/api';

interface Worker {
  id: string;
  nome: string;
  telefone: string | null;
  valorDiariaPadrao: number;
  ativo: boolean;
  _count?: {
    diasTrabalho: number;
  };
  movimentacoesPago?: {
    valor: number;
  }[];
}

interface Obra {
  obraId: string;
  obraNome: string;
  cliente: string;
}

interface Partner {
  id: string;
  nome: string;
}

export default function FuncionariosPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);

  // Form states - Create
  const [createNome, setCreateNome] = useState('');
  const [createTelefone, setCreateTelefone] = useState('');
  const [createValorDiariaPadrao, setCreateValorDiariaPadrao] = useState('');

  // Form states - Edit
  const [editWorkerId, setEditWorkerId] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editValorDiariaPadrao, setEditValorDiariaPadrao] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);

  // Form states - Pay
  const [payWorker, setPayWorker] = useState<Worker | null>(null);
  const [payValor, setPayValor] = useState('');
  const [payObraId, setPayObraId] = useState('');
  const [paySocioId, setPaySocioId] = useState(''); // Empty string = Caixa da Empresa
  const [payDescricao, setPayDescricao] = useState('');
  const [payData, setPayData] = useState('');

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/api/obras/funcionarios?includeInactive=true');
      setWorkers(res.data);
    } catch (err) {
      console.error('Error fetching workers:', err);
    }
  };

  const fetchObras = async () => {
    try {
      const res = await api.get('/api/obras');
      setObras(res.data);
    } catch (err) {
      console.error('Error fetching obras:', err);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await api.get('/api/financeiro/socios');
      setPartners(res.data.map((p: any) => ({ id: p.id, nome: p.nome })));
    } catch (err) {
      console.error('Error fetching partners:', err);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchWorkers(), fetchObras(), fetchPartners()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  // Handler - Create Worker
  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createNome || !createValorDiariaPadrao) return;

    try {
      await api.post('/api/obras/funcionarios', {
        nome: createNome,
        telefone: createTelefone || null,
        valorDiariaPadrao: parseFloat(createValorDiariaPadrao)
      });
      setCreateNome('');
      setCreateTelefone('');
      setCreateValorDiariaPadrao('');
      setIsCreateOpen(false);
      fetchWorkers();
    } catch (err) {
      alert('Erro ao cadastrar instalador.');
    }
  };

  // Handler - Edit Worker
  const handleEditWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWorkerId || !editNome || !editValorDiariaPadrao) return;

    try {
      await api.put(`/api/obras/funcionarios/${editWorkerId}`, {
        nome: editNome,
        telefone: editTelefone || null,
        valorDiariaPadrao: parseFloat(editValorDiariaPadrao),
        ativo: editAtivo
      });
      setIsEditOpen(false);
      fetchWorkers();
    } catch (err) {
      alert('Erro ao atualizar dados do instalador.');
    }
  };

  // Handler - Deactivate/Delete Worker
  const handleDeactivateWorker = async (workerId: string, name: string) => {
    if (!confirm(`Deseja realmente desativar o colaborador ${name}?`)) return;

    try {
      await api.delete(`/api/obras/funcionarios/${workerId}`);
      fetchWorkers();
    } catch (err) {
      alert('Erro ao desativar instalador.');
    }
  };

  // Handler - Register Payment
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payWorker || !payValor || !payObraId) {
      alert('Preencha os campos obrigatórios (Valor e Obra).');
      return;
    }

    try {
      await api.post('/api/financeiro/transaction', {
        valor: parseFloat(payValor),
        tipo: 'SAIDA',
        categoriaSaida: 'DIARIA',
        obraId: payObraId,
        funcionarioId: payWorker.id,
        socioId: paySocioId || null,
        descricao: payDescricao || `Pagamento de diária - ${payWorker.nome}`,
        data: payData ? new Date(payData).toISOString() : new Date().toISOString()
      });
      setIsPayOpen(false);
      setPayWorker(null);
      setPayValor('');
      setPayObraId('');
      setPaySocioId('');
      setPayDescricao('');
      setPayData('');
      fetchWorkers();
      alert('Pagamento registrado com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao registrar pagamento.');
    }
  };

  const openEditModal = (worker: Worker) => {
    setEditWorkerId(worker.id);
    setEditNome(worker.nome);
    setEditTelefone(worker.telefone || '');
    setEditValorDiariaPadrao(worker.valorDiariaPadrao.toString());
    setEditAtivo(worker.ativo);
    setIsEditOpen(true);
  };

  const openPayModal = (worker: Worker, pendingAmount: number) => {
    setPayWorker(worker);
    setPayValor(pendingAmount > 0 ? pendingAmount.toString() : worker.valorDiariaPadrao.toString());
    setPayObraId(obras[0]?.obraId || ''); // default to first project
    setPaySocioId('');
    setPayDescricao(`Pagamento de diárias - ${worker.nome}`);
    
    // Set default date to today in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    setPayData(today);
    
    setIsPayOpen(true);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Calculations for general dashboard stats
  const globalTotalDevido = workers.reduce((acc, w) => {
    const dt = w._count?.diasTrabalho || 0;
    const dp = Number(w.valorDiariaPadrao) || 0;
    return acc + (dt * dp);
  }, 0);

  const globalTotalPago = workers.reduce((acc, w) => {
    const tp = (w.movimentacoesPago || []).reduce((sum, m) => sum + Number(m.valor), 0);
    return acc + tp;
  }, 0);

  const globalTotalPendente = globalTotalDevido - globalTotalPago;
  const totalInstaladoresAtivos = workers.filter(w => w.ativo).length;

  const filteredWorkers = workers.filter(w => 
    w.nome.toLowerCase().includes(search.toLowerCase()) ||
    (w.telefone && w.telefone.includes(search))
  );

  // Order active workers first, then sort by name
  const sortedWorkers = [...filteredWorkers].sort((a, b) => {
    if (a.ativo && !b.ativo) return -1;
    if (!a.ativo && b.ativo) return 1;
    return a.nome.localeCompare(b.nome);
  });

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Equipe & Diárias</h2>
          <p className="text-slate-500 text-sm mt-1">Controle de colaboradores de campo, diárias e saldo financeiro pendente</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="premium-button-blue flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Cadastrar Colaborador
        </button>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="glass-card rounded-xl p-5 flex items-center gap-4 bg-white border border-slate-200 shadow-sm">
          <div className="p-3 bg-sky-50 text-solar-blue border border-sky-100 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instaladores Ativos</span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">{totalInstaladoresAtivos} ativos</h3>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4 bg-white border border-slate-200 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Diárias Devidas</span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(globalTotalDevido)}</h3>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4 bg-white border border-slate-200 shadow-sm">
          <div className="p-3 bg-emerald-50 text-solar-emerald border border-emerald-100 rounded-xl">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pago (Diárias)</span>
            <h3 className="text-lg font-bold text-slate-800 mt-1 text-solar-emerald">{formatCurrency(globalTotalPago)}</h3>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex items-center gap-4 bg-white border border-slate-200 shadow-sm">
          <div className="p-3 bg-red-50 text-red-500 border border-red-100 rounded-xl">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Pendente Geral</span>
            <h3 className={`text-lg font-bold mt-1 ${globalTotalPendente > 0 ? 'text-red-500 font-extrabold' : 'text-slate-800'}`}>
              {formatCurrency(globalTotalPendente)}
            </h3>
          </div>
        </div>

      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 max-w-md shadow-xs">
        <Search className="h-4 w-4 text-slate-400 ml-3" />
        <input
          type="text"
          placeholder="Buscar instalador pelo nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-0 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
      </div>

      {/* TEAM MEMBERS GRID */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solar-blue border-t-transparent"></div>
        </div>
      ) : sortedWorkers.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 bg-white border border-slate-200 shadow-sm">
          <HardHat className="h-10 w-10 text-slate-400 mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-700">Nenhum colaborador encontrado.</p>
          <p className="text-xs text-slate-400 mt-1">Adicione um novo instalador para gerenciar suas diárias no painel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedWorkers.map((worker) => {
            const diasTrabalhados = worker._count?.diasTrabalho || 0;
            const diariaPadrao = Number(worker.valorDiariaPadrao) || 0;
            const totalDevido = diasTrabalhados * diariaPadrao;
            const totalPago = (worker.movimentacoesPago || []).reduce((acc, curr) => acc + Number(curr.valor), 0);
            const saldoPendente = totalDevido - totalPago;

            return (
              <div 
                key={worker.id} 
                className={`glass-card rounded-2xl p-6 relative overflow-hidden bg-white border shadow-sm transition ${
                  worker.ativo 
                    ? 'border-slate-200 hover:border-solar-blue/40' 
                    : 'border-slate-200 opacity-60 hover:opacity-100 bg-slate-50/50'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold text-sm ${
                      worker.ativo 
                        ? 'bg-slate-100 border-slate-200 text-slate-700' 
                        : 'bg-slate-200 border-slate-300 text-slate-500'
                    }`}>
                      {worker.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 truncate max-w-[140px]">{worker.nome}</h3>
                      <span className="text-[9px] text-slate-400 font-bold tracking-wider block uppercase">INSTALADOR SOLAR</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(worker)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                      title="Editar instalador"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    {worker.ativo && (
                      <button
                        onClick={() => handleDeactivateWorker(worker.id, worker.nome)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                        title="Desativar instalador"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[8px] uppercase tracking-wider border ${
                      worker.ativo 
                        ? 'bg-emerald-50 border-emerald-200 text-solar-emerald' 
                        : 'bg-slate-100 border-slate-300 text-slate-500'
                    }`}>
                      {worker.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                {/* Worker Metrics & Details */}
                <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone:</span>
                    <span className="font-semibold text-slate-700">{worker.telefone || 'Não cadastrado'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Diária Padrão:</span>
                    <span className="font-bold text-slate-700">{formatCurrency(diariaPadrao)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Dias Trabalhados:</span>
                    <span className="font-semibold text-slate-700">{diasTrabalhados} dias ativos</span>
                  </div>

                  {/* Financial rate breakdown box */}
                  <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Total Devido:</span>
                      <span className="font-bold text-slate-700">{formatCurrency(totalDevido)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Total Pago:</span>
                      <span className="font-bold text-solar-emerald">{formatCurrency(totalPago)}</span>
                    </div>
                    <div className="border-t border-slate-200/80 pt-1.5 flex justify-between text-xs font-bold">
                      <span className="text-slate-600">Saldo Pendente:</span>
                      <span className={saldoPendente > 0 ? 'text-red-500 font-extrabold' : 'text-solar-emerald'}>
                        {formatCurrency(saldoPendente)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Payment Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex">
                  <button
                    onClick={() => openPayModal(worker, saldoPendente)}
                    disabled={!worker.ativo && saldoPendente <= 0}
                    className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      saldoPendente > 0 
                        ? 'bg-solar-blue text-white hover:bg-sky-600 shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Coins className="h-3.5 w-3.5" />
                    Registrar Pagamento
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE WORKER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
          <div className="glass-panel w-full max-w-md rounded-2xl p-8 relative z-10 mx-4 bg-white border border-slate-200 shadow-xl">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Cadastrar Instalador</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nome do Colaborador</label>
                <input
                  type="text"
                  required
                  value={createNome}
                  onChange={(e) => setCreateNome(e.target.value)}
                  placeholder="Ex: Victor Montador"
                  className="premium-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Telefone</label>
                <input
                  type="text"
                  value={createTelefone}
                  onChange={(e) => setCreateTelefone(e.target.value)}
                  placeholder="Ex: 5521988888888"
                  className="premium-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Valor da Diária Padrão (R$)</label>
                <input
                  type="number"
                  required
                  value={createValorDiariaPadrao}
                  onChange={(e) => setCreateValorDiariaPadrao(e.target.value)}
                  placeholder="150"
                  className="premium-input text-sm"
                />
              </div>

              <button type="submit" className="premium-button-blue w-full py-2.5 font-bold mt-2 shadow-sm">
                Salvar Colaborador
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WORKER MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsEditOpen(false)} />
          <div className="glass-panel w-full max-w-md rounded-2xl p-8 relative z-10 mx-4 bg-white border border-slate-200 shadow-xl">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Editar Instalador</h3>
              <button onClick={() => setIsEditOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditWorker} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nome do Colaborador</label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="premium-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Telefone</label>
                <input
                  type="text"
                  value={editTelefone}
                  onChange={(e) => setEditTelefone(e.target.value)}
                  className="premium-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Valor da Diária Padrão (R$)</label>
                <input
                  type="number"
                  required
                  value={editValorDiariaPadrao}
                  onChange={(e) => setEditValorDiariaPadrao(e.target.value)}
                  className="premium-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Status do Colaborador</label>
                <select
                  value={editAtivo ? 'true' : 'false'}
                  onChange={(e) => setEditAtivo(e.target.value === 'true')}
                  className="premium-input text-sm"
                >
                  <option value="true">Ativo (Disponível para agenda)</option>
                  <option value="false">Inativo (Desativado)</option>
                </select>
              </div>

              <button type="submit" className="premium-button-blue w-full py-2.5 font-bold mt-2 shadow-sm">
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER PAYMENT (DIARIA) MODAL */}
      {isPayOpen && payWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => { setIsPayOpen(false); setPayWorker(null); }} />
          <div className="glass-panel w-full max-w-md rounded-2xl p-8 relative z-10 mx-4 bg-white border border-slate-200 shadow-xl">
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-solar-emerald animate-pulse" />
                <h3 className="text-lg font-bold text-slate-900">Pagar Diária</h3>
              </div>
              <button onClick={() => { setIsPayOpen(false); setPayWorker(null); }} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-100 text-xs text-slate-600 mb-4 space-y-1">
              <p>Colaborador: <span className="font-bold text-slate-800">{payWorker.nome}</span></p>
              <p>Diária Padrão: <span className="font-semibold">{formatCurrency(Number(payWorker.valorDiariaPadrao))}</span></p>
              <p>Trabalhos no Campo: <span className="font-semibold">{payWorker._count?.diasTrabalho || 0} dias</span></p>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Valor do Pagamento (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payValor}
                  onChange={(e) => setPayValor(e.target.value)}
                  placeholder="Ex: 300"
                  className="premium-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Apropriar para Obra (Custo)</label>
                <select
                  required
                  value={payObraId}
                  onChange={(e) => setPayObraId(e.target.value)}
                  className="premium-input text-sm"
                >
                  <option value="">Selecione a obra correspondente...</option>
                  {obras.map((obra) => (
                    <option key={obra.obraId} value={obra.obraId}>
                      {obra.obraNome} ({obra.cliente})
                    </option>
                  ))}
                </select>
                {obras.length === 0 && (
                  <span className="text-[10px] text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> É necessário ter uma obra cadastrada para alocar o custo.
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Origem do Recurso</label>
                <select
                  value={paySocioId}
                  onChange={(e) => setPaySocioId(e.target.value)}
                  className="premium-input text-sm"
                >
                  <option value="">Caixa da Empresa (Conta PJ)</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      Pago do bolso do Sócio: {partner.nome} (Adiantamento)
                    </option>
                  ))}
                </select>
                {paySocioId !== '' && (
                  <span className="text-[10px] text-solar-blue flex items-center gap-1 mt-1 font-medium">
                    <AlertCircle className="h-3 w-3" /> Isso gerará um reembolso pendente da obra a este sócio.
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Data do Lançamento</label>
                <input
                  type="date"
                  required
                  value={payData}
                  onChange={(e) => setPayData(e.target.value)}
                  className="premium-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Descrição / Observações</label>
                <input
                  type="text"
                  value={payDescricao}
                  onChange={(e) => setPayDescricao(e.target.value)}
                  className="premium-input text-sm"
                />
              </div>

              <button 
                type="submit" 
                disabled={obras.length === 0}
                className="premium-button-emerald w-full py-2.5 font-bold mt-2 shadow-sm disabled:opacity-50"
              >
                Confirmar Lançamento de Diária
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
