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
  CheckCircle2
} from 'lucide-react';
import api from '../../utils/api';

interface CalendarDayLog {
  id: string;
  data: string;
  obraNome: string;
  equipe: string[];
}

export default function CalendarioPage() {
  const [logs, setLogs] = useState<CalendarDayLog[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchCalendar = async () => {
    try {
      const res = await api.get('/api/obras');
      // Extract and normalize calendar logs from all obras
      const allLogs: CalendarDayLog[] = [];
      
      for (const o of res.data) {
        // Fetch detailed calendar for each obra
        const detail = await api.get(`/api/obras/${o.obraId}`);
        for (const c of detail.data.calendario) {
          allLogs.push({
            id: c.id,
            data: c.data,
            obraNome: o.obraNome,
            equipe: c.equipe.map((e: any) => e.nome)
          });
        }
      }

      // Sort logs chronologically descending
      allLogs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setLogs(allLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
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

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solar-blue border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Calendário de Instalação</h2>
        <p className="text-zinc-500 text-sm mt-1">Escalamento de equipes e histórico de visitas técnicas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MONTHLY CALENDAR GRID BOARD */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 space-y-6">
          
          {/* Header selectors */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-200">
              {monthNames[month]} de {year}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Week days labels */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
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
                return <div key={`empty-${idx}`} className="h-20 bg-zinc-950/20 border border-transparent rounded-lg"></div>;
              }

              const dateLogs = getLogsForDate(day);
              const isToday = new Date().toDateString() === day.toDateString();

              return (
                <div 
                  key={day.toISOString()} 
                  className={`h-20 p-2 border bg-zinc-900/30 rounded-lg flex flex-col justify-between overflow-hidden relative ${
                    isToday 
                      ? 'border-solar-blue shadow-md shadow-solar-blue/5' 
                      : 'border-zinc-850/80 hover:border-zinc-700'
                  }`}
                >
                  <span className={`text-[10px] font-bold ${isToday ? 'text-solar-blue font-extrabold' : 'text-zinc-500'}`}>
                    {day.getDate()}
                  </span>
                  
                  <div className="space-y-1 overflow-y-auto">
                    {dateLogs.map(log => (
                      <div 
                        key={log.id} 
                        className="text-[8px] bg-solar-blue/10 border border-solar-blue/25 text-zinc-200 font-bold px-1 py-0.5 rounded truncate"
                        title={`${log.obraNome} - Equipe: ${log.equipe.join(', ')}`}
                      >
                        {log.obraNome}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* CHRONOLOGICAL WORK LOG CHANNELS */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-zinc-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-500" />
            Agenda Cronológica ({logs.length} dias logs)
          </h3>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-8 text-center bg-zinc-900/10 rounded-2xl border border-dashed border-zinc-850">
                Nenhum log operacional gravado ainda.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="glass-card rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-solar-steel uppercase bg-solar-steel/10 px-2 py-0.5 rounded border border-solar-steel/20">
                      Instalação Solar
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {new Date(log.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                    <HardHat className="h-4 w-4 text-zinc-400 shrink-0" />
                    {log.obraNome}
                  </h4>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Users className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span>Equipe: <span className="font-semibold text-zinc-300">{log.equipe.join(', ')}</span></span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-solar-emerald font-semibold pt-1 border-t border-zinc-850/60">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Status do dia: Concluído e faturado</span>
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
