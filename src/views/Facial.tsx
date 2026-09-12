import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DataService } from '../services/dataService';
import { Aluno, Frequencia } from '../types';
import { ArrowLeft, CheckCircle2, ScanFace, X } from 'lucide-react';
import { cn, getCurrentDateISO, getCurrentTime } from '../lib/utils';

// Overlay Biométrico (Malha Facial Fake)
const BiometricMesh = () => (
  <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-tsunami-cyan/30 to-transparent w-full h-full animate-scanline" />
    <svg viewBox="0 0 200 250" className="w-full h-full opacity-80">
      <defs>
        <style>
          {`
            .node { fill: transparent; stroke: #00ffff; stroke-width: 2.5; animation: popIn 0.3s ease-out forwards; opacity: 0; }
            .line { stroke: rgba(0, 255, 255, 0.5); stroke-width: 1.5; stroke-dasharray: 150; stroke-dashoffset: 150; animation: drawLine 1.5s ease-out forwards; }
            .text-hex { fill: #00ffff; font-family: monospace; font-size: 8px; font-weight: bold; animation: fadeIn 0.5s ease-out forwards; opacity: 0; }
            @keyframes popIn { to { opacity: 1; r: 4; } }
            @keyframes drawLine { to { stroke-dashoffset: 0; } }
            @keyframes fadeIn { to { opacity: 1; } }
          `}
        </style>
      </defs>
      {/* Eyes */}
      <circle cx="65" cy="110" r="0" className="node" style={{animationDelay: '0.2s'}} />
      <circle cx="135" cy="110" r="0" className="node" style={{animationDelay: '0.4s'}} />
      {/* Nose */}
      <circle cx="100" cy="145" r="0" className="node" style={{animationDelay: '0.6s'}} />
      {/* Mouth */}
      <circle cx="75" cy="180" r="0" className="node" style={{animationDelay: '0.8s'}} />
      <circle cx="125" cy="180" r="0" className="node" style={{animationDelay: '1.0s'}} />
      {/* Edges */}
      <line x1="65" y1="110" x2="135" y2="110" className="line" style={{animationDelay: '1.2s'}} />
      <line x1="65" y1="110" x2="100" y2="145" className="line" style={{animationDelay: '1.3s'}} />
      <line x1="135" y1="110" x2="100" y2="145" className="line" style={{animationDelay: '1.4s'}} />
      <line x1="100" y1="145" x2="75" y2="180" className="line" style={{animationDelay: '1.5s'}} />
      <line x1="100" y1="145" x2="125" y2="180" className="line" style={{animationDelay: '1.6s'}} />
      <line x1="75" y1="180" x2="125" y2="180" className="line" style={{animationDelay: '1.7s'}} />
      {/* Hex Labels */}
      <text x="35" y="105" className="text-hex" style={{animationDelay: '0.3s'}}>FA8237</text>
      <text x="145" y="105" className="text-hex" style={{animationDelay: '0.5s'}}>2C59D9</text>
      <text x="110" y="145" className="text-hex" style={{animationDelay: '0.7s'}}>BCC11D</text>
    </svg>
  </div>
);

export function FacialArenaView() {
  const { navigate } = useApp();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);
  const [loading, setLoading] = useState(true);

  // States for scanner simulator
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [scanStep, setScanStep] = useState<'idle' | 'starting_camera' | 'scanning' | 'success' | 'confirm_delete'>('idle');
  const [matchPercent, setMatchPercent] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Today
  const today = getCurrentDateISO();

  useEffect(() => {
    loadData();
    return () => {
      stopCamera();
    };
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

  const confirmDeletePresence = async (aluno: Aluno) => {
    await DataService.setFrequencia({
      aluno_id: aluno.id,
      aluno_nome: aluno.nome,
      data_aula: today,
      status: '',
      hora: ''
    });
    const newF = await DataService.getFrequenciasPorData(today);
    setFrequencias(newF);
    setScanStep('idle');
    setSelectedAluno(null);
  };

  const startSimulation = async (aluno: Aluno) => {
    // Se já estiver marcado, mostra overlay de exclusão em vez de window.confirm
    const freq = frequencias.find(f => f.aluno_id === aluno.id);
    if (freq && (freq.status === 'P' || freq.status === 'A')) {
      setSelectedAluno(aluno);
      setScanStep('confirm_delete');
      return;
    }

    setSelectedAluno(aluno);
    setScanStep('starting_camera');
    setTimeout(() => startCamera(aluno), 100);
  };

  const startCamera = async (aluno: Aluno) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanStep('scanning');
      
      // Simulate scanning delay 3s
      setTimeout(() => {
        const match = (95 + Math.random() * 4).toFixed(1); // 95.0 to 99.0
        setMatchPercent(Number(match));
        setScanStep('success');
        
        stopCamera();
        savePresence(aluno);
        
        // Auto close after success
        setTimeout(() => {
          setScanStep(prev => prev === 'success' ? 'idle' : prev);
          setSelectedAluno(prev => prev?.id === aluno.id ? null : prev);
        }, 2500);
      }, 3000);
    } catch (err) {
      alert("Não foi possível acessar a câmera. Verifique as permissões de vídeo.");
      setScanStep('idle');
      setSelectedAluno(null);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const closeScanner = () => {
    stopCamera();
    setScanStep('idle');
    setSelectedAluno(null);
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
                   <div 
                     className="absolute top-2 right-2 text-tsunami-emerald hover:scale-110 transition-transform cursor-pointer"
                     onClick={(e) => {
                       e.stopPropagation();
                       startSimulation(a);
                     }}
                   >
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
             <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-tsunami-cyan/50 mb-8 shadow-[0_0_50px_rgba(0,255,255,0.2)]">
                {scanStep === 'starting_camera' && (
                  <div className="w-full h-full bg-[#0a0c16] flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-tsunami-cyan/30 border-t-tsunami-cyan rounded-full animate-spin" />
                  </div>
                )}

                {scanStep !== 'idle' && scanStep !== 'confirm_delete' && (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={cn(
                      "w-full h-full object-cover scale-x-[-1] absolute inset-0",
                      (scanStep === 'starting_camera' || scanStep === 'scanning') ? 'opacity-100 z-0' : 'opacity-0 -z-10'
                    )} 
                  />
                )}

                {/* Grid/Mesh Overlay */}
                {scanStep === 'scanning' && <BiometricMesh />}

                {scanStep === 'success' && (
                  selectedAluno.face_data ? (
                    <img src={selectedAluno.face_data} className="w-full h-full object-cover grayscale opacity-50 z-10 relative" alt="" />
                  ) : (
                    <div className="w-full h-full bg-[#0a0c16] flex items-center justify-center z-10 relative">
                      <ScanFace className="w-32 h-32 text-tsunami-cyan/30" />
                    </div>
                  )
                )}
             </div>

             <div className="text-center h-24">
                {scanStep === 'starting_camera' && (
                  <div className="text-lg font-bold uppercase text-gray-400 animate-pulse">
                    Conectando Câmera...
                  </div>
                )}
                {scanStep === 'scanning' && (
                  <div className="text-xl font-bold uppercase text-tsunami-cyan tracking-widest animate-pulse flex flex-col items-center">
                    Analisando Biometria
                    <div className="flex gap-1 mt-2">
                      <div className="w-2 h-2 bg-tsunami-cyan rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                      <div className="w-2 h-2 bg-tsunami-cyan rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                      <div className="w-2 h-2 bg-tsunami-cyan rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                    </div>
                  </div>
                )}
                {scanStep === 'success' && (
                  <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                    <div className="flex items-center gap-2 text-tsunami-emerald text-2xl font-bold uppercase mb-2">
                      <CheckCircle2 className="w-8 h-8" /> Identificado
                    </div>
                    <p className="text-white text-lg font-bold">{selectedAluno.nome}</p>
                    <p className="text-tsunami-emerald/80 font-mono text-sm mt-1">Autenticação: {matchPercent}%</p>
                  </div>
                )}
             </div>

             {scanStep !== 'success' && scanStep !== 'confirm_delete' && (
               <button onClick={closeScanner} className="absolute -top-12 right-0 p-2 text-gray-500 hover:text-white">
                 <X className="w-8 h-8" />
               </button>
             )}

             {scanStep === 'confirm_delete' && (
               <div className="absolute inset-0 bg-[#0a0c16] rounded-xl flex flex-col items-center justify-center p-6 border border-white/10 z-50 shadow-2xl">
                 <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                   <X className="w-8 h-8" />
                 </div>
                 <h2 className="text-xl font-bold text-white mb-2 text-center leading-tight">Apagar Presença?</h2>
                 <p className="text-gray-400 text-center mb-6 text-sm">
                   Confirmar remoção da presença de <br/><strong className="text-white uppercase">{selectedAluno.nome}</strong>?
                 </p>
                 <div className="flex gap-3 w-full">
                   <button 
                     onClick={() => { setScanStep('idle'); setSelectedAluno(null); }}
                     className="flex-1 py-3 rounded-lg font-bold uppercase text-white bg-white/10 hover:bg-white/20 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={() => confirmDeletePresence(selectedAluno)}
                     className="flex-1 py-3 rounded-lg font-bold uppercase text-white bg-red-500 hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                   >
                     Apagar
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
