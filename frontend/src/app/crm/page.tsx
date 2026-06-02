'use client';

import React, { useEffect, useState } from 'react';
import { 
  Target, 
  Plus, 
  DollarSign, 
  Phone, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Trash2, 
  User, 
  Calendar,
  X,
  FileText,
  TrendingUp
} from 'lucide-react';
import api from '../../utils/api';

interface Lead {
  id: string;
  nome: string;
  cliente: string;
  telefone: string | null;
  endereco: string | null;
  kwpEstimado: number | null;
  valorProposta: number | null;
  status: string;
  observacoes: string | null;
  createdAt: string;
}

const STAGES = [
  { id: 'NOVO_LEAD', name: 'Novo Lead', color: 'border-t-sky-400 bg-sky-50/50' },
  { id: 'VISITA_TECNICA', name: 'Visita Técnica', color: 'border-t-amber-400 bg-amber-50/50' },
  { id: 'PROPOSTA_ENVIADA', name: 'Proposta Enviada', color: 'border-t-indigo-400 bg-indigo-50/50' },
  { id: 'NEGOCIACAO', name: 'Em Negociação', color: 'border-t-purple-400 bg-purple-50/50' },
  { id: 'CONTRATO_FECHADO', name: 'Fechado (Ganho)', color: 'border-t-emerald-400 bg-emerald-50/50' },
  { id: 'PERDIDO', name: 'Perdido', color: 'border-t-red-400 bg-red-50/50' }
];

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [kwpEstimado, setKwpEstimado] = useState('');
  const [valorProposta, setValorProposta] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Conversion state
  const [valorFechado, setValorFechado] = useState('');
  const [observacoesObra, setObservacoesObra] = useState('');

  const fetchLeads = async () => {
    try {
      const res = await api.get('/api/crm/leads');
      setLeads(res.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cliente) return;

    try {
      await api.post('/api/crm/leads', {
        nome,
        cliente,
        telefone: telefone || null,
        endereco: endereco || null,
        kwpEstimado: kwpEstimado ? parseFloat(kwpEstimado) : null,
        valorProposta: valorProposta ? parseFloat(valorProposta) : null,
        status: 'NOVO_LEAD',
        observacoes: observacoes || null
      });

      // Reset
      setNome('');
      setCliente('');
      setTelefone('');
      setEndereco('');
      setKwpEstimado('');
      setValorProposta('');
      setObservacoes('');
      setIsCreateOpen(false);
      
      // Reload
      fetchLeads();
    } catch (err) {
      alert('Erro ao criar lead.');
    }
  };

  const handleMoveStage = async (id: string, newStatus: string) => {
    try {
      await api.put(`/api/crm/leads/${id}`, {
        status: newStatus
      });
      fetchLeads();
    } catch (err) {
      alert('Erro ao mover lead.');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Deseja realmente remover este lead?')) return;
    try {
      await api.delete(`/api/crm/leads/${id}`);
      fetchLeads();
    } catch (err) {
      alert('Erro ao remover lead.');
    }
  };

  const openConvertModal = (lead: Lead) => {
    setSelectedLead(lead);
    setValorFechado(lead.valorProposta?.toString() || '');
    setObservacoesObra(`Obra convertida do lead: ${lead.nome}.`);
    setIsConvertOpen(true);
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      const res = await api.post(`/api/crm/leads/${selectedLead.id}/convert`, {
        valorFechado: parseFloat(valorFechado),
        observacoesObra
      });

      alert(res.data.message || 'Conversão concluída com sucesso!');
      setIsConvertOpen(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (err) {
      alert('Erro ao converter lead para obra.');
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

  return (
    <div className="space-y-8 text-slate-800 animate-fade-in">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-solar-blue" />
            Funil de Prospecção CRM (Leads)
          </h2>
          <p className="text-slate-500 text-sm mt-1">Acompanhe leads, elabore propostas e converta contratos fechados em obras instantaneamente</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="premium-button-blue flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo Lead
        </button>
      </div>

      {/* KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter(l => l.status === stage.id);
          const totalProposals = stageLeads.reduce((acc, curr) => acc + Number(curr.valorProposta || 0), 0);

          return (
            <div 
              key={stage.id} 
              className={`flex flex-col min-w-[200px] bg-white rounded-xl border border-slate-200 border-t-4 ${stage.color} p-4 space-y-4 max-h-[70vh] overflow-y-auto shadow-sm`}
            >
              
              {/* Column Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{stage.name}</h3>
                  <span className="text-[9px] text-slate-400 font-bold">{stageLeads.length} leads</span>
                </div>
                {totalProposals > 0 && (
                  <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                    {formatCurrency(totalProposals)}
                  </span>
                )}
              </div>

              {/* Column Cards */}
              <div className="space-y-3">
                {stageLeads.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-6">Sem registros</p>
                ) : (
                  stageLeads.map((lead) => (
                    <div 
                      key={lead.id} 
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs hover:shadow transition relative group space-y-2.5 text-xs text-slate-700"
                    >
                      {/* Name / Options */}
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-slate-800 break-words">{lead.nome}</span>
                        <button 
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1 text-slate-350 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100"
                          title="Remover Lead"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Client Name */}
                      <p className="text-[10px] text-slate-500">Cliente: <span className="font-medium text-slate-650">{lead.cliente}</span></p>

                      {/* Telefone / Local */}
                      {lead.telefone && (
                        <p className="text-[9px] text-slate-500 flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                          {lead.telefone}
                        </p>
                      )}
                      {lead.kwpEstimado && (
                        <p className="text-[9px] text-slate-500 flex items-center gap-1 font-medium">
                          <TrendingUp className="h-2.5 w-2.5 shrink-0 text-solar-blue" />
                          {Number(lead.kwpEstimado)} kWp estimado
                        </p>
                      )}

                      {/* Proposal Value */}
                      {lead.valorProposta && (
                        <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100 font-bold text-[10px] text-slate-700">
                          <span>Proposta:</span>
                          <span>{formatCurrency(Number(lead.valorProposta))}</span>
                        </div>
                      )}

                      {/* Drag Stage Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[9px] font-bold text-slate-500">
                        {lead.status !== 'CONTRATO_FECHADO' ? (
                          <select 
                            value={lead.status}
                            onChange={(e) => handleMoveStage(lead.id, e.target.value)}
                            className="bg-transparent border-0 p-0 text-[9px] text-slate-500 focus:ring-0 font-bold cursor-pointer"
                          >
                            {STAGES.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-solar-emerald flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            Fechado
                          </span>
                        )}

                        {lead.status !== 'CONTRATO_FECHADO' && lead.status !== 'PERDIDO' && (
                          <button
                            onClick={() => openConvertModal(lead)}
                            className="text-solar-blue hover:text-sky-600 font-bold flex items-center gap-0.5 bg-sky-50 px-1 py-0.5 rounded border border-sky-100"
                            title="Converter em Obra"
                          >
                            Firmei
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* CREATE LEAD MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
          <div className="glass-panel w-full max-w-md rounded-2xl p-8 relative z-10 mx-4 bg-white border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 font-bold">Novo Lead de Prospecção</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nome da Oportunidade / Obra</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Telhado do Galpão"
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nome do Cliente</label>
                <input
                  type="text"
                  required
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ex: Wilson da Silva"
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Telefone</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="Ex: 5521999999999"
                    className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">kWp Estimado</label>
                  <input
                    type="number"
                    step="0.01"
                    value={kwpEstimado}
                    onChange={(e) => setKwpEstimado(e.target.value)}
                    placeholder="Ex: 12.5"
                    className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Valor da Proposta (R$)</label>
                <input
                  type="number"
                  value={valorProposta}
                  onChange={(e) => setValorProposta(e.target.value)}
                  placeholder="Ex: 24000"
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Endereço da Instalação</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Niterói, RJ"
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais..."
                  rows={2}
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <button type="submit" className="premium-button-blue w-full py-2.5 font-bold mt-2 shadow-sm">
                Salvar Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT LEAD TO PROJECT MODAL */}
      {isConvertOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsConvertOpen(false)} />
          <div className="glass-panel w-full max-w-md rounded-2xl p-8 relative z-10 mx-4 bg-white border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 font-bold">Converter Lead em Obra (Ativa)</h3>
              <button onClick={() => setIsConvertOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConvertLead} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <p>O Lead **{selectedLead.nome}** será promovido a Obra ativa no painel do ERP.</p>
                <p>Cliente: **{selectedLead.cliente}**</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Valor Final Fechado (R$)</label>
                <input
                  type="number"
                  required
                  value={valorFechado}
                  onChange={(e) => setValorFechado(e.target.value)}
                  placeholder="Ex: 24000"
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Instruções / Notas da Obra</label>
                <textarea
                  value={observacoesObra}
                  onChange={(e) => setObservacoesObra(e.target.value)}
                  rows={3}
                  className="premium-input text-sm bg-white border border-slate-200 text-slate-800"
                />
              </div>

              <button type="submit" className="premium-button-emerald w-full py-2.5 font-bold mt-2 shadow-sm">
                Confirmar e Iniciar Instalação
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
