import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DataService } from '../services/dataService';
import { Aluno, Frequencia, Turma } from '../types';
import { ArrowLeft, Trophy, Medal } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const COLORS = ['#00ffff', '#e040fb', '#8b5cf6', '#00e676', '#2563eb'];

export function ReportsView() {
  const { navigate } = useApp();
  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [a, t, f] = await Promise.all([
      DataService.getAlunos(),
      DataService.getTurmas(),
      DataService.getFrequenciasGerais()
    ]);
    setAlunos(a);
    setTurmas(t);
    setFrequencias(f);
    setLoading(false);
  };

  // --- Gráfico 1: Alunos por Turma ---
  const alunosPorTurmaData = useMemo(() => {
    return turmas.map(t => ({
      name: t.nome,
      value: alunos.filter(a => a.turma_id === t.id).length
    })).filter(d => d.value > 0);
  }, [alunos, turmas]);

  // --- Gráfico 2: Presenças vs Faltas Gerais ---
  const presencasVFaltas = useMemo(() => {
    let p = 0, a = 0, j = 0, f = 0;
    frequencias.forEach(freq => {
      if (freq.status === 'P') p++;
      else if (freq.status === 'A') a++;
      else if (freq.status === 'J') j++;
      else if (freq.status === 'F') f++;
    });
    return [
      { name: 'Presentes', value: p, fill: '#00e676' },
      { name: 'Atrasos', value: a, fill: '#eab308' },
      { name: 'Faltas', value: f, fill: '#ef4444' },
      { name: 'Justificados', value: j, fill: '#00ffff' },
    ];
  }, [frequencias]);

  // --- Gráfico 3: Linha de tempo de presenças (simplificado por data) ---
  const evolucaoTemporal = useMemo(() => {
    const datas: Record<string, number> = {};
    frequencias.forEach(freq => {
      if (freq.status === 'P' || freq.status === 'A') {
        datas[freq.data_aula] = (datas[freq.data_aula] || 0) + 1;
      }
    });
    return Object.entries(datas)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [frequencias]);

  // --- Gamificação Leaderboard ---
  const leaderboard = useMemo(() => {
    const pontuacao = alunos.map(aluno => {
      let pts = 0;
      let p = 0, a = 0, f = 0, j = 0;
      let minTimes: number[] = [];

      frequencias.filter(freq => freq.aluno_id === aluno.id).forEach(freq => {
        if (freq.status === 'P') { pts += 5; p++; }
        else if (freq.status === 'A') { pts += 2; a++; }
        else if (freq.status === 'J') { pts -= 1; j++; }
        else if (freq.status === 'F') { pts -= 3; f++; }

        if ((freq.status === 'P' || freq.status === 'A') && freq.hora) {
          const [hh, mm, ss] = freq.hora.split(':').map(Number);
          minTimes.push(hh * 3600 + mm * 60 + ss);
        }
      });

      const avgTime = minTimes.length > 0 ? minTimes.reduce((acc, v) => acc + v, 0) / minTimes.length : 999999;
      const freqPercentage = frequencias.filter(freq => freq.aluno_id === aluno.id).length > 0 
        ? ((p + a) / (p + a + f + j)) * 100 
        : 0;

      return { aluno, pts, p, a, f, j, avgTime, freqPercentage };
    });

    return pontuacao.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts; // Maior pontuação
      if (a.avgTime !== b.avgTime) return a.avgTime - b.avgTime; // Menor tempo de chegada
      if (b.p !== a.p) return b.p - a.p; // Mais presenças
      if (a.a !== b.a) return a.a - b.a; // Menos atrasos
      return a.f - b.f; // Menos faltas
    });
  }, [alunos, frequencias]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('dashboard')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold uppercase text-white flex items-center gap-3">
           <span className="w-3 h-3 rounded-full bg-tsunami-violet animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
           Estatísticas & Ranking
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-tsunami-violet">
          <div className="w-8 h-8 border-4 border-tsunami-violet/30 border-t-tsunami-violet rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pie Chart */}
            <div className="glass-panel neon-border-violet p-4">
               <h3 className="text-sm font-bold uppercase text-gray-400 mb-4 text-center">Alunos por Turma</h3>
               <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={alunosPorTurmaData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                       {alunosPorTurmaData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip contentStyle={{ backgroundColor: '#0a0c16', border: '1px solid rgba(255,255,255,0.1)' }} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Bar Chart */}
            <div className="glass-panel neon-border-fuchsia p-4">
               <h3 className="text-sm font-bold uppercase text-gray-400 mb-4 text-center">Balanço de Frequência</h3>
               <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={presencasVFaltas}>
                     <XAxis dataKey="name" stroke="#fff" opacity={0.5} fontSize={10} />
                     <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0a0c16', border: '1px solid rgba(255,255,255,0.1)' }} />
                     <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                       {presencasVFaltas.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.fill} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Line Chart */}
            <div className="glass-panel neon-border-cyan p-4">
               <h3 className="text-sm font-bold uppercase text-gray-400 mb-4 text-center">Presenças ao Longo do Tempo</h3>
               <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={evolucaoTemporal}>
                     <XAxis dataKey="date" stroke="#fff" opacity={0.5} fontSize={10} />
                     <YAxis stroke="#fff" opacity={0.5} fontSize={10} />
                     <Tooltip contentStyle={{ backgroundColor: '#0a0c16', border: '1px solid rgba(255,255,255,0.1)' }} />
                     <Line type="monotone" dataKey="count" stroke="#00ffff" strokeWidth={3} dot={{ fill: '#00ffff', strokeWidth: 0 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
            
          </div>

          {/* Gamification Leaderboard */}
          <div className="glass-panel neon-border-violet p-6">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
              <h2 className="text-lg font-bold text-white uppercase">Ranking de Frequência (Top 15)</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-gray-400 uppercase font-bold border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 w-16">Pos</th>
                    <th className="px-4 py-3">Atleta</th>
                    <th className="px-4 py-3 text-center">Freq %</th>
                    <th className="px-4 py-3 text-center text-tsunami-emerald">P</th>
                    <th className="px-4 py-3 text-center text-yellow-500">A</th>
                    <th className="px-4 py-3 text-center text-tsunami-cyan">J</th>
                    <th className="px-4 py-3 text-center text-red-500">F</th>
                    <th className="px-4 py-3 text-right text-tsunami-violet">Pontos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboard.slice(0, 15).map((l, index) => (
                    <tr key={l.aluno.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-lg font-bold">
                        {index === 0 && <Medal className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />}
                        {index === 1 && <Medal className="w-6 h-6 text-gray-300 drop-shadow-[0_0_5px_rgba(209,213,219,0.8)]" />}
                        {index === 2 && <Medal className="w-6 h-6 text-amber-700 drop-shadow-[0_0_5px_rgba(180,83,9,0.8)]" />}
                        {index > 2 && <span className="text-gray-500 text-sm ml-1">{index + 1}º</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-200 uppercase">{l.aluno.nome}</div>
                        <div className="text-[10px] text-gray-500 uppercase">{l.aluno.turma_nome}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                           <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden w-20">
                             <div className="h-full bg-tsunami-emerald" style={{ width: `${l.freqPercentage}%` }} />
                           </div>
                           <span className="text-[10px] text-gray-400 w-6">{Math.round(l.freqPercentage)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-tsunami-emerald">{l.p}</td>
                      <td className="px-4 py-3 text-center font-mono text-yellow-500">{l.a}</td>
                      <td className="px-4 py-3 text-center font-mono text-tsunami-cyan">{l.j}</td>
                      <td className="px-4 py-3 text-center font-mono text-red-500">{l.f}</td>
                      <td className="px-4 py-3 text-right font-black text-tsunami-violet text-lg drop-shadow-[0_0_5px_rgba(139,92,246,0.5)]">
                        {l.pts}
                      </td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">Nenhum dado registrado para gerar o ranking.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
