import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DataService } from '../services/dataService';
import { Aluno, Frequencia, PresencaStatus, Turma } from '../types';
import { ArrowLeft, ChevronLeft, ChevronRight, Share2, Users, FileText } from 'lucide-react';
import { cn, getCurrentTime, generateSnakeDraft, formatDataBR } from '../lib/utils';

export function ArenaView() {
  const { navigate } = useApp();
  const [loading, setLoading] = useState(true);
  
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);
  
  const [selectedTurma, setSelectedTurma] = useState<string>('all');
  
  // Controle de Mês/Ano
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Force to first of month
    return d;
  });

  const [modalJustificativa, setModalJustificativa] = useState<{aluno_id: string, data_aula: string, nome: string} | null>(null);
  const [justificativaText, setJustificativaText] = useState('');

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    const [t, a, f] = await Promise.all([
      DataService.getTurmas(),
      DataService.getAlunos(),
      DataService.getFrequenciasGerais()
    ]);
    setTurmas(t);
    setAlunos(a);
    setFrequencias(f);
    setLoading(false);
  };

  const getSaturdays = (year: number, month: number) => {
    const saturdays: string[] = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      if (date.getDay() === 6) { // 6 = Saturday
        // Format YYYY-MM-DD local logic safely
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        saturdays.push(`${y}-${m}-${d}`);
      }
      date.setDate(date.getDate() + 1);
    }
    return saturdays;
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed
  const saturdays = useMemo(() => getSaturdays(currentYear, currentMonth), [currentYear, currentMonth]);

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const filteredAlunos = useMemo(() => {
    let base = alunos;
    if (selectedTurma !== 'all') {
      base = base.filter(a => a.turma_id === selectedTurma);
    }
    
    // Filtrar para exibir APENAS alunos que estejam ativos no mês selecionado.
    // O aluno só aparece se seu contrato abranger pelo menos 1 dia de aula (sábado) no mês visualizado.
    base = base.filter(a => {
      if (!a.matricula || !a.vencimento) return false;
      const dMatricula = new Date(a.matricula);
      const dVenc = new Date(a.vencimento);
      
      // Checa se ele está ativo em algum sábado deste mês
      return saturdays.some(sat => {
         const dAula = new Date(sat);
         return dAula >= dMatricula && dAula <= dVenc;
      });
    });

    return base.sort((a,b) => a.nome.localeCompare(b.nome));
  }, [alunos, selectedTurma, saturdays]);

  const getFreq = (aluno_id: string, data_aula: string) => {
    return frequencias.find(f => f.aluno_id === aluno_id && f.data_aula === data_aula);
  };

  const handleCellClick = async (aluno: Aluno, data_aula: string) => {
    // Check if aluno is active at this date
    const dAula = new Date(data_aula);
    const dMatricula = new Date(aluno.matricula);
    const dVenc = new Date(aluno.vencimento);
    if (dAula < dMatricula || dAula > dVenc) {
      return; // Not matriculated on this date
    }

    const current = getFreq(aluno.id, data_aula);
    const cycle: PresencaStatus[] = ['', 'F', 'P', 'A', 'J'];
    let currentIndex = cycle.indexOf(current?.status || '');
    let nextIndex = (currentIndex + 1) % cycle.length;
    let nextStatus = cycle[nextIndex];

    if (nextStatus === 'J') {
      setModalJustificativa({ aluno_id: aluno.id, data_aula, nome: aluno.nome });
      return;
    }

    await saveStatus(aluno, data_aula, nextStatus);
  };

  const handleCellDoubleClick = async (aluno: Aluno, data_aula: string) => {
    // Permite apagar o registro completamente (útil para testes)
    const dAula = new Date(data_aula);
    const dMatricula = new Date(aluno.matricula);
    const dVenc = new Date(aluno.vencimento);
    if (dAula < dMatricula || dAula > dVenc) return;

    if (window.confirm(`Deseja APAGAR o registro de frequência de ${aluno.nome} do dia ${formatDataBR(data_aula)}?`)) {
       await saveStatus(aluno, data_aula, '' as PresencaStatus);
    }
  };

  const saveStatus = async (aluno: Aluno, data_aula: string, status: PresencaStatus, justificativa = '') => {
    const hora = (status === 'P' || status === 'A') ? getCurrentTime() : '';
    
    // Optimistic UI update
    setFrequencias(prev => {
      const idx = prev.findIndex(f => f.aluno_id === aluno.id && f.data_aula === data_aula);
      const newFreq: Frequencia = {
        id: prev[idx]?.id || crypto.randomUUID(),
        aluno_id: aluno.id,
        aluno_nome: aluno.nome,
        data_aula,
        status,
        justificativa,
        hora
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newFreq;
        return copy;
      }
      return [...prev, newFreq];
    });

    await DataService.setFrequencia({
      aluno_id: aluno.id,
      aluno_nome: aluno.nome,
      data_aula,
      status,
      justificativa,
      hora
    });
  };

  const handleSaveJustificativa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalJustificativa) return;
    const aluno = alunos.find(a => a.id === modalJustificativa.aluno_id);
    if (aluno) {
      await saveStatus(aluno, modalJustificativa.data_aula, 'J', justificativaText);
    }
    setModalJustificativa(null);
    setJustificativaText('');
  };

  const handleMarkAll = async (data_aula: string) => {
    if (!window.confirm(`Marcar Presença (P) para todos os alunos filtrados em ${data_aula}?`)) return;
    
    setLoading(true);
    for (const a of filteredAlunos) {
      const dAula = new Date(data_aula);
      const dMatricula = new Date(a.matricula);
      const dVenc = new Date(a.vencimento);
      if (dAula >= dMatricula && dAula <= dVenc) {
         const current = getFreq(a.id, data_aula);
         if (!current || current.status === '') {
             await saveStatus(a, data_aula, 'P');
         }
      }
    }
    setLoading(false);
  };

  const renderStatus = (status?: PresencaStatus) => {
    switch(status) {
      case 'P': return <div className="w-full h-full bg-tsunami-emerald/20 text-tsunami-emerald flex items-center justify-center font-bold">P</div>;
      case 'F': return <div className="w-full h-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold">F</div>;
      case 'A': return <div className="w-full h-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold">A</div>;
      case 'J': return <div className="w-full h-full bg-tsunami-cyan/20 text-tsunami-cyan flex items-center justify-center font-bold">J</div>;
      default: return <div className="w-full h-full hover:bg-white/5 transition-colors"></div>;
    }
  };

  const countPresentesDia = (data_aula: string) => {
    return frequencias.filter(f => f.data_aula === data_aula && (f.status === 'P' || f.status === 'A')).length;
  };

  const countFaltasAluno = (aluno_id: string) => {
    return frequencias.filter(f => f.aluno_id === aluno_id && f.status === 'F').length;
  };

  // --- Funções de Compartilhamento WhatsApp ---
  const handleShareWa = async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Relatório Tsunami',
          text: text,
        });
      } else {
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      }
    } catch (e) {
      console.log('Share error', e);
    }
  };

  const generateReportGeral = (data_aula: string) => {
    const presentes = frequencias.filter(f => f.data_aula === data_aula && (f.status === 'P' || f.status === 'A'));
    const justificados = frequencias.filter(f => f.data_aula === data_aula && f.status === 'J');
    
    let text = `*TSUNAMI - RELATÓRIO GERAL*\nData: ${data_aula}\n\n`;
    text += `*PRESENTES/ATRASOS (${presentes.length}):*\n`;
    presentes.forEach(p => {
      const a = alunos.find(al => al.id === p.aluno_id);
      text += `- ${p.aluno_nome} (${a?.turma_nome}) [${p.status}] ${p.hora}\n`;
    });
    
    text += `\n*JUSTIFICATIVAS (${justificados.length}):*\n`;
    justificados.forEach(p => text += `- ${p.aluno_nome}: ${p.justificativa}\n`);
    
    handleShareWa(text);
  };

  const generateDraft = (data_aula: string) => {
    const presentesIds = frequencias.filter(f => f.data_aula === data_aula && (f.status === 'P' || f.status === 'A')).map(f => f.aluno_id);
    const pAlunos = alunos.filter(a => presentesIds.includes(a.id));
    
    if (pAlunos.length === 0) return alert('Nenhum aluno presente para o sorteio.');

    // Calcular num de times (ex: times de 5)
    const numTeams = Math.max(2, Math.ceil(pAlunos.length / 5));
    const teams = generateSnakeDraft(pAlunos, numTeams);

    let text = `*TSUNAMI - SNAKE DRAFT*\nData: ${data_aula}\nSorteio Equilibrado (Baseado em Nível)\n\n`;
    teams.forEach((t, i) => {
      text += `*TIME ${i+1}* (Total ⭐: ${t.totalStars})\n`;
      t.players.forEach(p => text += `- ${p.nome} (⭐${p.nivel})\n`);
      text += `\n`;
    });

    handleShareWa(text);
  };

  return (
    <div className="p-6 md:p-10 max-w-full mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold uppercase text-white flex items-center gap-3">
             <span className="w-3 h-3 rounded-full bg-tsunami-emerald animate-pulse shadow-[0_0_10px_rgba(0,230,118,0.8)]" />
             Arena Precision
          </h1>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <select 
            value={selectedTurma} 
            onChange={(e) => setSelectedTurma(e.target.value)}
            className="bg-[#0a0c16] border border-tsunami-emerald/40 text-white rounded p-2 text-sm uppercase focus:outline-none focus:border-tsunami-emerald"
          >
            <option value="all">Todas as Turmas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          
          <div className="flex items-center bg-white/5 border border-white/10 rounded overflow-hidden">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 text-gray-300 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <div className="px-4 py-2 font-bold uppercase min-w-[150px] text-center text-tsunami-emerald">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 text-gray-300 transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-tsunami-emerald">
          <div className="w-8 h-8 border-4 border-tsunami-emerald/30 border-t-tsunami-emerald rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-panel border-tsunami-emerald/20 overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#0a0c16] border-b border-tsunami-emerald/30">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase text-gray-400 min-w-[200px] sticky left-0 z-10 bg-[#0a0c16] border-r border-white/10">Aluno</th>
                  {saturdays.map(sat => (
                    <th key={sat} className="px-2 py-3 font-bold uppercase text-center border-r border-white/10 min-w-[120px]">
                      <div className="text-tsunami-emerald mb-2">
                        Sáb<br/><span className="text-[10px] text-gray-400">{formatDataBR(sat).slice(0,5)}</span>
                      </div>
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleMarkAll(sat)} className="text-[9px] bg-white/5 border border-white/10 hover:border-tsunami-emerald hover:text-tsunami-emerald px-1 py-0.5 rounded transition-colors" title="Marcar todos presentes">ALL</button>
                        <button onClick={() => generateReportGeral(sat)} className="text-[9px] bg-white/5 border border-white/10 hover:border-tsunami-cyan hover:text-tsunami-cyan px-1 py-0.5 rounded transition-colors" title="Relatório"><FileText className="w-3 h-3"/></button>
                        <button onClick={() => generateDraft(sat)} className="text-[9px] bg-white/5 border border-white/10 hover:border-tsunami-fuchsia hover:text-tsunami-fuchsia px-1 py-0.5 rounded transition-colors" title="Snake Draft"><Users className="w-3 h-3"/></button>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-bold text-center text-red-400 min-w-[80px]">Total (F)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAlunos.length === 0 && (
                  <tr>
                    <td colSpan={saturdays.length + 2} className="p-8 text-center text-gray-500">Nenhum aluno encontrado para os filtros.</td>
                  </tr>
                )}
                {filteredAlunos.map(a => (
                  <tr key={a.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-2 sticky left-0 z-10 bg-[#07080f] group-hover:bg-[#0a0c16] transition-colors border-r border-white/10">
                      <div className="font-bold text-gray-200 truncate max-w-[180px]" title={a.nome}>{a.nome}</div>
                      <div className="text-[10px] text-gray-500">{a.turma_nome}</div>
                    </td>
                    {saturdays.map(sat => {
                       const dAula = new Date(sat);
                       const dMatricula = new Date(a.matricula);
                       const dVenc = new Date(a.vencimento);
                       const isAtivo = dAula >= dMatricula && dAula <= dVenc;
                       
                       return (
                         <td 
                            key={sat} 
                            className="border-r border-white/10 p-0 text-center relative h-12 cursor-pointer select-none group/cell" 
                            onClick={() => isAtivo && handleCellClick(a, sat)}
                            onDoubleClick={() => isAtivo && handleCellDoubleClick(a, sat)}
                         >
                           {!isAtivo ? (
                              <div className="flex items-center justify-center w-full h-full">
                                <span className="bg-red-900/40 text-red-400 text-[10px] px-1.5 py-0.5 rounded border border-red-500/30">N/M</span>
                              </div>
                           ) : (
                              renderStatus(getFreq(a.id, sat)?.status)
                           )}
                           
                           {/* Overlay para Apagar e Hora (visível apenas quando há status e em hover da célula) */}
                           {isAtivo && getFreq(a.id, sat)?.status && (
                             <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity z-10">
                               {getFreq(a.id, sat)?.hora && (
                                 <span className="text-[9px] text-tsunami-cyan font-mono mb-0.5">
                                   {getFreq(a.id, sat)?.hora}
                                 </span>
                               )}
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation(); // Impede que o clique dispare o ciclo normal da célula
                                   handleCellDoubleClick(a, sat);
                                 }}
                                 className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white px-1.5 py-0.5 rounded transition-colors uppercase font-bold"
                                 title="Apagar Registro"
                               >
                                 Apagar
                               </button>
                             </div>
                           )}
                         </td>
                       );
                    })}
                    <td className="px-4 py-2 text-center font-bold text-red-400 text-lg">
                       {countFaltasAluno(a.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#0a0c16] border-t border-tsunami-emerald/30 font-bold">
                <tr>
                  <td className="px-4 py-4 text-right uppercase text-tsunami-emerald text-xs sticky left-0 z-10 bg-[#0a0c16] border-r border-white/10">Totais Diários</td>
                  {saturdays.map(sat => (
                    <td key={sat} className="px-2 py-4 text-center text-tsunami-emerald border-r border-white/10">
                      {countPresentesDia(sat)}
                    </td>
                  ))}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal Justificativa */}
      {modalJustificativa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel neon-border-cyan p-6 w-full max-w-md bg-[#0a0c16] relative">
            <h2 className="text-xl font-bold text-white uppercase mb-2">Justificativa de Falta</h2>
            <p className="text-sm text-tsunami-cyan mb-4">{modalJustificativa.nome} - {formatDataBR(modalJustificativa.data_aula)}</p>
            
            <form onSubmit={handleSaveJustificativa}>
              <textarea 
                required 
                value={justificativaText} 
                onChange={e => setJustificativaText(e.target.value)}
                placeholder="Motivo da ausência..."
                className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-tsunami-cyan outline-none resize-none h-32 mb-4"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalJustificativa(null)} className="flex-1 py-2 rounded bg-white/5 text-gray-300 hover:bg-white/10 transition-colors uppercase text-sm font-bold border border-white/10">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2 rounded bg-tsunami-cyan text-black hover:bg-white transition-colors uppercase text-sm font-bold shadow-[0_0_15px_rgba(0,255,255,0.4)]">
                  Salvar (J)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
