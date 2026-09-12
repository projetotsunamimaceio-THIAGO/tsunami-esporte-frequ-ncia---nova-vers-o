import React from 'react';
import { useApp } from '../context/AppContext';
import { Users, UsersRound, CalendarDays, ScanFace, Activity, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function Dashboard() {
  const { user, navigate, logout } = useApp();

  const cards = [
    {
      id: 'turmas',
      title: 'Gestão de Turmas',
      desc: 'Cadastro e horários',
      icon: Users,
      color: 'tsunami-cyan',
      borderColor: 'neon-border-cyan',
      textColor: 'text-tsunami-cyan',
      bgHover: 'hover:bg-tsunami-cyan/10'
    },
    {
      id: 'alunos',
      title: 'Base de Alunos',
      desc: 'Matrículas e perfis',
      icon: UsersRound,
      color: 'tsunami-fuchsia',
      borderColor: 'neon-border-fuchsia',
      textColor: 'text-tsunami-fuchsia',
      bgHover: 'hover:bg-tsunami-fuchsia/10'
    },
    {
      id: 'arena',
      title: 'Arena Precision',
      desc: 'Chamada interativa',
      icon: CalendarDays,
      color: 'tsunami-emerald',
      borderColor: 'neon-border-emerald',
      textColor: 'text-tsunami-emerald',
      bgHover: 'hover:bg-tsunami-emerald/10'
    },
    {
      id: 'facial',
      title: 'Facial Arena',
      desc: 'Simulador biométrico',
      icon: ScanFace,
      color: 'tsunami-blue',
      borderColor: 'border-tsunami-blue/40 shadow-[0_0_10px_rgba(37,99,235,0.2)]', // custom blue neon
      textColor: 'text-tsunami-blue',
      bgHover: 'hover:bg-tsunami-blue/10'
    },
    {
      id: 'reports',
      title: 'Estatísticas',
      desc: 'Relatórios e Gamificação',
      icon: Activity,
      color: 'tsunami-violet',
      borderColor: 'neon-border-violet',
      textColor: 'text-tsunami-violet',
      bgHover: 'hover:bg-tsunami-violet/10'
    }
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-full border border-tsunami-cyan flex items-center justify-center relative shadow-[0_0_15px_rgba(0,255,255,0.3)]">
             <div className="absolute inset-0 rounded-full border-t-2 border-tsunami-fuchsia animate-orbital" />
             <div className="absolute inset-2 rounded-full border-b-2 border-tsunami-emerald animate-[orbital_4s_linear_reverse_infinite]" />
             <span className="font-bold text-white text-xl">TS</span>
           </div>
           <div>
             <h1 className="text-3xl font-black tracking-widest text-white uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
               TSUNAMI
             </h1>
             <p className="text-gray-400 text-sm tracking-widest uppercase">Central de Comando</p>
           </div>
        </div>

        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <span className="text-sm text-gray-300">Operador: <strong className="text-tsunami-cyan uppercase">{user?.nome}</strong></span>
          <div className="w-px h-4 bg-white/20" />
          <button onClick={logout} className="text-gray-400 hover:text-tsunami-fuchsia transition-colors flex items-center gap-2 text-sm">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => navigate(card.id)}
              className={cn(
                "glass-panel p-6 text-left group transition-all duration-300 hover:-translate-y-1 relative overflow-hidden",
                card.borderColor,
                card.bgHover
              )}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6">
                <div className={cn("p-3 rounded-lg bg-white/5 border border-white/10", card.textColor)}>
                  <Icon className="w-8 h-8" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors transform group-hover:translate-x-1" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">{card.title}</h3>
              <p className="text-gray-400 text-sm">{card.desc}</p>
            </button>
          )
        })}
      </div>
    </div>
  );
}
