import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DataService } from '../services/dataService';
import { Aluno, Frequencia } from '../types';
import { ArrowLeft, CheckCircle2, ScanFace, X } from 'lucide-react';
import { cn, getCurrentDateISO, getCurrentTime } from '../lib/utils';

export function FacialArenaView() {
  const { navigate } = useApp();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);
  const [loading, setLoading] = useState(true);

  // States for scanner simulator
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [scanStep, setScanStep] = useState<'idle' | 'countdown' | 'scanning' | 'success'>('idle');
  const [countdown, setCountdown] = useState(4);
  const [matchPercent, setMatchPercent] = useState(0);

  // Today
  const today = getCurrentDateISO();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [a, f] = await Promise.all([
      DataService.getAlunos(),
      DataService.getFrequenciasPorData(today)
    ]);
    // Filter active today
    const dHoje = new Date(today);
    const ativos = a.filter(al => {
      return dHoje >= new Date(al.matricula) && dHoje <= new Date(al.vencimento);
    }).sort((a,b) => a.nome.localeCompare(b.nome));
    
    setAlunos(ativos);
    setFrequencias(f);
    setLoading(false);
  };

  const startSimulation = (aluno: Aluno) => {
    // If already marked, could block or show a message. For now, let it rescan or use long press for corrections.
    const freq = frequencias.find(f => f.aluno_id === aluno.id);
    if (freq && (freq.status === 'P' || freq.status === 'A')) {
      alert(`${aluno.nome} já está com presença registrada hoje às ${freq.hora}.`);
      return;
    }

    setSelectedAluno(aluno);
    setScanStep('countdown');
    setCountdown(4);

    let cd = 4;
    const timer = setInterval(() => {
      cd--;
      setCountdown(cd);
      if (cd <= 0) {
        clearInterval(timer);
        setScanStep('scanning');
        
        // Simulate scanning delay
        setTimeout(() => {
          const match = (95 + Math.random() * 4).toFixed(1); // 95.0 to 99.0
          setMatchPercent(Number(match));
          setScanStep('success');
          
          // Save presence
          savePresence(aluno);
          
          // Auto close after 3s
          setTimeout(() => {
            setScanStep('idle');
            setSelectedAluno(null);
          }, 3000);
        }, 2000);
      }
    }, 1000);
  };

  const savePresence = async (aluno: Aluno) => {
    await DataService.setFrequencia({
      aluno_id: aluno.id,
      aluno_nome: aluno.nome,
      data_aula: today,
      status: 'P',
      hora: getCurrentTime()
    });
    // refresh internal state
    const newF = await DataService.getFrequenciasPorData(today);
    setFrequencias(newF);
  };

  const handleLongPress = (aluno: Aluno) => {
    // Basic long press fallback using a confirm for manual correction (as a quick implementation)
    // A real long press needs touch events, but for SPA we'll simulate via a small button or standard prompt.
    // Let's add a small 'edit' icon for manual correction if already marked.
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen flex flex-col relative overflow-hidden animate-in fade-in duration-300">
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold uppercase text-white flex items-center gap-3">
             <span className="w-3 h-3 rounded-full bg-tsunami-blue animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
             Facial Arena <span className="hidden md:inline">- Recepção</span>
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center text-tsunami-blue">
          <div className="w-10 h-10 border-4 border-tsunami-blue/30 border-t-tsunami-blue rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 relative z-10">
          {alunos.map(a => {
             const f = frequencias.find(freq => freq.aluno_id === a.id);
             const isPresent = f?.status === 'P' || f?.status === 'A';
             const isFalta = f?.status === 'F';
             
             return (
               <div 
                 key={a.id}
                 onClick={() => startSimulation(a)}
                 className={cn(
                   "glass-panel flex flex-col items-center p-4 cursor-pointer transition-transform hover:scale-105 relative",
                   isPresent ? "border-tsunami-emerald/50 bg-tsunami-emerald/5" : "border-white/10 hover:border-tsunami-blue/50"
                 )}
               >
                 {isPresent && (
                   <div className="absolute top-2 right-2 text-tsunami-emerald">
                     <CheckCircle2 className="w-5 h-5" />
                   </div>
                 )}
                 <div className={cn(
                   "w-20 h-20 rounded-full overflow-hidden mb-3 border-2 flex items-center justify-center shrink-0",
                   isPresent ? "border-tsunami-emerald" : "border-white/20"
                 )}>
                   {a.face_data ? (
                     <img src={a.face_data} alt={a.nome} className="w-full h-full object-cover" />
                   ) : (
                     <ScanFace className="w-10 h-10 text-gray-500" />
                   )}
                 </div>
                 <h3 className="text-center font-bold text-white text-xs uppercase leading-tight line-clamp-2">{a.nome}</h3>
                 {isPresent && f?.hora && (
                   <span className="text-[10px] text-tsunami-emerald mt-1 font-mono">{f.hora}</span>
                 )}
               </div>
             )
          })}
        </div>
      )}

      {/* Simulator Overlay */}
      {scanStep !== 'idle' && selectedAluno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-sm flex flex-col items-center">
             
             {/* Main Frame */}
             <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-tsunami-blue/50 mb-8 shadow-[0_0_50px_rgba(37,99,235,0.4)]">
                {selectedAluno.face_data ? (
                  <img src={selectedAluno.face_data} className="w-full h-full object-cover grayscale opacity-50" alt="" />
                ) : (
                  <div className="w-full h-full bg-[#0a0c16] flex items-center justify-center">
                    <ScanFace className="w-32 h-32 text-tsunami-blue/30" />
                  </div>
                )}

                {/* Laser Overlay */}
                {scanStep === 'scanning' && (
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-tsunami-blue/30 to-transparent w-full h-full animate-scanline" />
                )}

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxwYXRoIGQ9Ik0gMjAgMCBMIDAgMCAwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=')] opacity-30" />
             </div>

             <div className="text-center h-24">
                {scanStep === 'countdown' && (
                  <div className="text-6xl font-black text-white font-mono animate-pulse">{countdown}</div>
                )}
                {scanStep === 'scanning' && (
                  <div className="text-xl font-bold uppercase text-tsunami-blue tracking-widest animate-pulse flex flex-col items-center">
                    Analisando Biometria
                    <div className="flex gap-1 mt-2">
                      <div className="w-2 h-2 bg-tsunami-blue rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                      <div className="w-2 h-2 bg-tsunami-blue rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                      <div className="w-2 h-2 bg-tsunami-blue rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                    </div>
                  </div>
                )}
                {scanStep === 'success' && (
                  <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                    <div className="flex items-center gap-2 text-tsunami-emerald text-2xl font-bold uppercase mb-2">
                      <CheckCircle2 className="w-8 h-8" /> Identificado
                    </div>
                    <p className="text-white text-lg">{selectedAluno.nome}</p>
                    <p className="text-tsunami-emerald/80 font-mono text-sm">Match: {matchPercent}%</p>
                  </div>
                )}
             </div>

             {scanStep !== 'success' && (
               <button onClick={() => setScanStep('idle')} className="absolute -top-12 right-0 p-2 text-gray-500 hover:text-white">
                 <X className="w-8 h-8" />
               </button>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
