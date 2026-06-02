'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, ShieldAlert } from 'lucide-react';
import api from '../../utils/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If user is already authenticated, send them to dashboard
    const token = localStorage.getItem('wqsolar_token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', {
        email,
        password
      });

      const { token, user } = response.data;
      
      localStorage.setItem('wqsolar_token', token);
      localStorage.setItem('wqsolar_user', JSON.stringify(user));
      
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Erro ao conectar com o servidor. Verifique suas credenciais.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      
      {/* GLOWING AMBIENT ARTIFICIAL LIGHT EFFECTS */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-solar-blue/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-[250px] h-[250px] bg-solar-emerald/5 rounded-full blur-[90px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        
        {/* LOGO AREA */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="p-3 bg-solar-blue/10 rounded-2xl border border-solar-blue/20 shadow-lg shadow-solar-blue/5">
            <Sun className="h-10 w-10 text-solar-blue animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight">WQ Solar</h1>
            <p className="mt-1 text-sm text-zinc-400">ERP Financeiro e Operacional Solar</p>
          </div>
        </div>

        {/* GLASS CARD FORM CONTAINER */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-zinc-100">Bem-vindo</h2>
            <p className="text-xs text-zinc-500 mt-1">Insira suas credenciais corporativas para acessar</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* EMAIL INPUT */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rafael@wqsolar.com"
                className="premium-input"
              />
            </div>

            {/* PASSWORD INPUT */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="premium-input"
              />
            </div>

            {/* ERRORS LOG */}
            {error && (
              <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="premium-button-blue w-full flex items-center justify-center gap-2 py-2.5 font-bold shadow-lg shadow-solar-blue/20"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Entrar no Painel'
              )}
            </button>

          </form>
        </div>

        {/* SEED NOTICE INFO FOOTER */}
        <div className="text-center">
          <p className="text-[10px] text-zinc-600">
            Acesso administrativo seguro. Use as credenciais cadastradas na inicialização.
          </p>
        </div>

      </div>
    </main>
  );
}
