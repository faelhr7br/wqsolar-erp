'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  DollarSign, 
  ArrowUpRight, 
  Coins, 
  CalendarDays,
  UserCheck,
  TrendingUp,
  Receipt
} from 'lucide-react';
import api from '../../utils/api';

interface Partner {
  id: string;
  nome: string;
  email: string;
  percentualSplit: number;
  totalInvestidoBolso: number;
  totalReembolsado: number;
  reembolsoPendente: number;
  divisaoLucroGlobal: number;
  saldoSocio: number;
}

interface RefundLog {
  id: string;
  valor: number;
  data: string;
  socio: { user: { nome: string } };
  obra: { nome: string };
}

export default function SociosPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [refunds, setRefunds] = useState<RefundLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = async () => {
    try {
      const res = await api.get('/api/financeiro/socios');
      setPartners(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRefunds = async () => {
    try {
      const res = await api.get('/api/financeiro/reembolsos');
      setRefunds(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    async function loadData() {
      await Promise.all([fetchPartners(), fetchRefunds()]);
      setLoading(false);
    }
    loadData();
  }, []);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solar-violet border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Controle de Sócios & Waterfall</h2>
        <p className="text-zinc-500 text-sm mt-1">Divisão societária de 50/50 com prioridade de reembolso sobre custos de campo</p>
      </div>

      {/* COMPARATIVE CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {partners.map((partner) => {
          const isRafael = partner.nome.toLowerCase() === 'rafael';
          
          return (
            <div 
              key={partner.id} 
              className={`glass-card rounded-2xl p-6 relative overflow-hidden border-t-4 ${
                isRafael ? 'border-t-solar-violet' : 'border-t-solar-blue'
              }`}
            >
              
              {/* Profile header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${
                    isRafael 
                      ? 'bg-solar-violet/10 border-solar-violet/20 text-solar-violet' 
                      : 'bg-solar-blue/10 border-solar-blue/20 text-solar-blue'
                  }`}>
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100 tracking-tight">{partner.nome}</h3>
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase">Participação societária: {partner.percentualSplit}%</p>
                  </div>
                </div>
                
                <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg">
                  Sócio Ativo
                </span>
              </div>

              {/* Multi-variable waterflow listing */}
              <div className="space-y-3.5 mt-4">
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-medium">1. Financiou do Bolso (Despesas Obras):</span>
                  <span className="font-bold text-zinc-300">{formatCurrency(partner.totalInvestidoBolso)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-medium">2. Reembolsos Já Recebidos:</span>
                  <span className="font-bold text-zinc-300 text-red-400">-{formatCurrency(partner.totalReembolsado)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-solar-violet font-semibold">3. Reembolso Pendente (A Receber):</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    partner.reembolsoPendente > 0 ? 'bg-solar-violet/15 text-solar-violet' : 'bg-zinc-900 text-zinc-500'
                  }`}>
                    {formatCurrency(partner.reembolsoPendente)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-zinc-850 pt-3">
                  <span className="text-zinc-500 font-medium">4. Participação Teórica nos Lucros:</span>
                  <span className="font-bold text-zinc-300">{formatCurrency(partner.divisaoLucroGlobal)}</span>
                </div>

                <div className="flex justify-between items-center text-sm border-t border-zinc-850 pt-3">
                  <span className="text-zinc-400 font-bold uppercase">Saldo Atual do Sócio:</span>
                  <span className={`text-base font-extrabold ${partner.saldoSocio >= 0 ? 'text-solar-emerald' : 'text-red-400'}`}>
                    {formatCurrency(partner.saldoSocio)}
                  </span>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* REFUND HISTORY */}
      <div className="space-y-4">
        <h3 className="font-bold text-base text-zinc-200 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-zinc-500" />
          Histórico de Pagamentos de Reembolso (Vouchers)
        </h3>
        
        {refunds.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-zinc-500 text-xs italic">
            Nenhum reembolso pago ainda. Pagamentos de reembolsos são feitos a partir do caixa recebido das obras.
          </div>
        ) : (
          <div className="glass-panel rounded-2xl overflow-hidden border border-zinc-850">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-900/30 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Sócio</th>
                    <th className="px-6 py-4">Obra de Origem</th>
                    <th className="px-6 py-4">Valor Pago</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/60 text-xs">
                  {refunds.map((reemb) => (
                    <tr key={reemb.id} className="hover:bg-zinc-900/30 transition">
                      <td className="px-6 py-4 text-zinc-400">
                        {new Date(reemb.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-200">
                        {reemb.socio.user.nome}
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {reemb.obra.nome}
                      </td>
                      <td className="px-6 py-4 font-bold text-solar-emerald">
                        {formatCurrency(reemb.valor)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-solar-emerald/10 border border-solar-emerald/20 text-solar-emerald rounded font-bold text-[10px] uppercase">
                          Liquidado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
