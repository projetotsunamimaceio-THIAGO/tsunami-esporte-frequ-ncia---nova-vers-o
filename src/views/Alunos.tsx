import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DataService } from '../services/dataService';
import { Aluno, Turma } from '../types';
import { ArrowLeft, Plus, Edit2, Trash2, Search, Camera, Upload, AlertTriangle, Star, ScanFace } from 'lucide-react';
import { cn, isVencido, formatDataBR } from '../lib/utils';

export function AlunosView() {
  const { navigate } = useApp();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'lista' | 'cadastro' | 'lote'>('lista');

  // Form Individual
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [nome, setNome] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [matricula, setMatricula] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [nivel, setNivel] = useState(1);
  const [faceData, setFaceData] = useState('');

  // WebCam
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Form Lote
  const [loteNomes, setLoteNomes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [a, t] = await Promise.all([DataService.getAlunos(), DataService.getTurmas()]);
    setAlunos(a);
    setTurmas(t);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingAluno(null);
    setNome('');
    setTurmaId('');
    setMatricula(new Date().toISOString().split('T')[0]);
    // vencimento em 30 dias por padrao
    const v = new Date();
    v.setDate(v.getDate() + 30);
    setVencimento(v.toISOString().split('T')[0]);
    setNivel(1);
    setFaceData('');
    stopCamera();
  };

  const handleEdit = (a: Aluno) => {
    setEditingAluno(a);
    setNome(a.nome);
    setTurmaId(a.turma_id);
    setMatricula(a.matricula);
    setVencimento(a.vencimento);
    setNivel(a.nivel);
    setFaceData(a.face_data);
    setActiveTab('cadastro');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir aluno permanentemente?')) {
      await DataService.deleteAluno(id);
      loadData();
    }
  };

  const handleSaveIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = turmas.find(t => t.id === turmaId);
    if (!t) return alert('Selecione uma turma');

    const payload = { nome, turma_id: turmaId, turma_nome: t.nome, matricula, vencimento, nivel, face_data: faceData };
    
    if (editingAluno) {
      await DataService.updateAluno(editingAluno.id, payload);
    } else {
      await DataService.addAluno(payload);
    }
    resetForm();
    loadData();
    setActiveTab('lista');
  };

  const handleSaveLote = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = turmas.find(t => t.id === turmaId);
    if (!t) return alert('Selecione uma turma');

    const nomes = loteNomes.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (nomes.length === 0) return alert('Insira pelo menos um nome');

    for (const n of nomes) {
      await DataService.addAluno({
        nome: n,
        turma_id: turmaId,
        turma_nome: t.nome,
        matricula,
        vencimento,
        nivel,
        face_data: ''
      });
    }
    
    setLoteNomes('');
    resetForm();
    loadData();
    setActiveTab('lista');
  };

  // WebCam functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      alert("Câmera indisponível");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // draw mirrored
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFaceData(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredAlunos = alunos.filter(a => 
    a.nome.toLowerCase().includes(search.toLowerCase()) || 
    a.turma_nome?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold uppercase text-white flex items-center gap-3">
             <span className="w-3 h-3 rounded-full bg-tsunami-fuchsia animate-pulse shadow-[0_0_10px_rgba(224,64,251,0.8)]" />
             Base de Alunos
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
        <button 
          onClick={() => { setActiveTab('lista'); resetForm(); }}
          className={cn("px-4 py-2 text-sm font-bold uppercase transition-colors rounded-t", activeTab === 'lista' ? 'text-tsunami-fuchsia border-b-2 border-tsunami-fuchsia bg-tsunami-fuchsia/5' : 'text-gray-400 hover:text-white')}
        >
          Lista & Pesquisa
        </button>
        <button 
          onClick={() => { setActiveTab('cadastro'); resetForm(); }}
          className={cn("px-4 py-2 text-sm font-bold uppercase transition-colors rounded-t", activeTab === 'cadastro' ? 'text-tsunami-fuchsia border-b-2 border-tsunami-fuchsia bg-tsunami-fuchsia/5' : 'text-gray-400 hover:text-white')}
        >
          Cadastro Individual
        </button>
        <button 
          onClick={() => { setActiveTab('lote'); resetForm(); }}
          className={cn("px-4 py-2 text-sm font-bold uppercase transition-colors rounded-t", activeTab === 'lote' ? 'text-tsunami-fuchsia border-b-2 border-tsunami-fuchsia bg-tsunami-fuchsia/5' : 'text-gray-400 hover:text-white')}
        >
          Cadastro em Lote
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-tsunami-fuchsia">
          <div className="w-8 h-8 border-4 border-tsunami-fuchsia/30 border-t-tsunami-fuchsia rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB LISTA */}
          {activeTab === 'lista' && (
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text"
                  placeholder="BUSCAR ALUNO OU TURMA..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white uppercase focus:border-tsunami-fuchsia outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAlunos.map(a => (
                  <div key={a.id} className="glass-panel neon-border-fuchsia p-4 group flex flex-col relative overflow-hidden">
                    {/* Alerta de Vencimento */}
                    {isVencido(a.vencimento) && (
                       <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded font-bold">
                         <AlertTriangle className="w-3 h-3" /> VENCIDO
                       </div>
                    )}

                    <div className="flex items-center gap-4 mb-3">
                       <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/20 shrink-0 flex items-center justify-center">
                         {a.face_data ? (
                           <img src={a.face_data} alt="Face" className="w-full h-full object-cover" />
                         ) : (
                           <UserPlaceholder />
                         )}
                       </div>
                       <div className="min-w-0 flex-1 pr-14">
                         <h3 className="text-white font-bold truncate" title={a.nome}>{a.nome}</h3>
                         <p className="text-tsunami-fuchsia/80 text-xs truncate">{a.turma_nome}</p>
                       </div>
                    </div>

                    <div className="mt-auto space-y-1 text-xs text-gray-400 bg-black/20 p-2 rounded">
                       <div className="flex justify-between">
                         <span>Vencimento:</span>
                         <span className={cn("font-mono", isVencido(a.vencimento) ? 'text-red-400' : 'text-gray-300')}>{formatDataBR(a.vencimento)}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span>Nível:</span>
                         <span className="text-tsunami-emerald tracking-widest text-[10px]">{'★'.repeat(a.nivel)}{'☆'.repeat(5-a.nivel)}</span>
                       </div>
                    </div>

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <button onClick={() => handleEdit(a)} className="p-3 bg-white/10 hover:bg-tsunami-fuchsia/20 text-white rounded-full border border-white/10 hover:border-tsunami-fuchsia/50 transition-all">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="p-3 bg-white/10 hover:bg-red-500/20 text-red-400 rounded-full border border-white/10 hover:border-red-500/50 transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredAlunos.length === 0 && (
                  <div className="col-span-full py-10 text-center text-gray-500 bg-white/5 rounded-lg border border-white/10">
                    Nenhum aluno encontrado.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CADASTRO INDIVIDUAL */}
          {activeTab === 'cadastro' && (
             <form onSubmit={handleSaveIndividual} className="glass-panel p-6 neon-border-fuchsia max-w-3xl animate-in slide-in-from-right-8 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Lado Esquerdo - Foto */}
                  <div className="space-y-4">
                     <h3 className="text-sm uppercase text-gray-400 font-bold border-b border-white/10 pb-2">Biometria Facial</h3>
                     
                     <div className="relative aspect-[3/4] max-w-[240px] mx-auto bg-black/50 border-2 border-dashed border-white/20 rounded-xl overflow-hidden flex flex-col items-center justify-center">
                        {isCameraActive ? (
                          <>
                            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                            <div className="absolute inset-0 border-4 border-tsunami-fuchsia/30 pointer-events-none" />
                            <div className="absolute top-1/2 w-full h-0.5 bg-tsunami-fuchsia/50 shadow-[0_0_8px_#e040fb] animate-scanline pointer-events-none" />
                          </>
                        ) : faceData ? (
                          <img src={faceData} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-gray-500 text-center p-4">
                            <ScanFace className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <span className="text-xs uppercase">Sem Foto</span>
                          </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                     </div>

                     <div className="flex gap-2 max-w-[240px] mx-auto">
                       {isCameraActive ? (
                         <button type="button" onClick={captureFace} className="flex-1 py-2 bg-tsunami-fuchsia/20 text-tsunami-fuchsia border border-tsunami-fuchsia/50 rounded font-bold text-xs uppercase hover:bg-tsunami-fuchsia hover:text-black transition-colors">
                           Capturar
                         </button>
                       ) : (
                         <button type="button" onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 border border-white/10 rounded text-xs uppercase hover:bg-white/10 transition-colors">
                           <Camera className="w-4 h-4" /> Câmera
                         </button>
                       )}
                       
                       <label className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 border border-white/10 rounded text-xs uppercase hover:bg-white/10 transition-colors cursor-pointer">
                          <Upload className="w-4 h-4" /> Arquivo
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                       </label>
                     </div>
                  </div>

                  {/* Lado Direito - Dados */}
                  <div className="space-y-4">
                     <h3 className="text-sm uppercase text-gray-400 font-bold border-b border-white/10 pb-2">Dados Cadastrais</h3>
                     
                     <div>
                       <label className="block text-xs uppercase text-gray-400 mb-1">Nome Completo</label>
                       <input required type="text" value={nome} onChange={e => setNome(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded p-2 text-white uppercase focus:border-tsunami-fuchsia outline-none"
                       />
                     </div>

                     <div>
                       <label className="block text-xs uppercase text-gray-400 mb-1">Turma</label>
                       <select required value={turmaId} onChange={e => setTurmaId(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded p-2 text-white uppercase focus:border-tsunami-fuchsia outline-none [&>option]:bg-[#07080f]"
                       >
                         <option value="">Selecione...</option>
                         {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                       </select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-xs uppercase text-gray-400 mb-1">Matrícula</label>
                         <input required type="date" value={matricula} onChange={e => setMatricula(e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:border-tsunami-fuchsia outline-none"
                         />
                       </div>
                       <div>
                         <label className="block text-xs uppercase text-gray-400 mb-1">Vencimento</label>
                         <input required type="date" value={vencimento} onChange={e => setVencimento(e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:border-tsunami-fuchsia outline-none"
                         />
                       </div>
                     </div>

                     <div>
                       <label className="block text-xs uppercase text-gray-400 mb-1">Nível Técnico (Estrelas)</label>
                       <div className="flex gap-2">
                         {[1,2,3,4,5].map(n => (
                           <button type="button" key={n} onClick={() => setNivel(n)}
                             className={cn("p-2 rounded border transition-all", nivel >= n ? "bg-tsunami-emerald/20 text-tsunami-emerald border-tsunami-emerald/50" : "bg-white/5 text-gray-600 border-white/10")}
                           >
                             <Star className={cn("w-5 h-5", nivel >= n ? "fill-tsunami-emerald" : "")} />
                           </button>
                         ))}
                       </div>
                     </div>

                     <div className="pt-4">
                        <button type="submit" className="w-full py-3 bg-tsunami-fuchsia text-white rounded font-bold uppercase tracking-widest hover:brightness-110 shadow-[0_0_15px_rgba(224,64,251,0.4)] transition-all">
                          {editingAluno ? 'Atualizar Aluno' : 'Salvar Aluno'}
                        </button>
                     </div>
                  </div>
                </div>
             </form>
          )}

          {/* TAB LOTE */}
          {activeTab === 'lote' && (
            <form onSubmit={handleSaveLote} className="glass-panel p-6 neon-border-fuchsia max-w-2xl animate-in slide-in-from-right-8 duration-300">
               <h2 className="text-lg font-bold text-white uppercase mb-4">Cadastro em Lote (Rápido)</h2>
               
               <div className="grid grid-cols-2 gap-4 mb-4">
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-1">Turma Padrão</label>
                   <select required value={turmaId} onChange={e => setTurmaId(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded p-2 text-white uppercase focus:border-tsunami-fuchsia outline-none [&>option]:bg-[#07080f]"
                   >
                     <option value="">Selecione...</option>
                     {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-1">Nível Padrão</label>
                   <select required value={nivel} onChange={e => setNivel(Number(e.target.value))}
                     className="w-full bg-white/5 border border-white/10 rounded p-2 text-white uppercase focus:border-tsunami-fuchsia outline-none [&>option]:bg-[#07080f]"
                   >
                     {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Estrelas</option>)}
                   </select>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-4">
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-1">Matrícula (Todos)</label>
                   <input required type="date" value={matricula} onChange={e => setMatricula(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:border-tsunami-fuchsia outline-none"
                   />
                 </div>
                 <div>
                   <label className="block text-xs uppercase text-gray-400 mb-1">Vencimento (Todos)</label>
                   <input required type="date" value={vencimento} onChange={e => setVencimento(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:border-tsunami-fuchsia outline-none"
                   />
                 </div>
               </div>

               <div className="mb-6">
                 <label className="block text-xs uppercase text-tsunami-cyan mb-1 font-bold">Nomes (Um por linha)</label>
                 <textarea required value={loteNomes} onChange={e => setLoteNomes(e.target.value)} rows={10}
                   className="w-full bg-black/50 border border-tsunami-fuchsia/30 rounded p-3 text-white uppercase focus:border-tsunami-fuchsia outline-none font-mono text-sm leading-relaxed"
                   placeholder="MARIA SILVA&#10;JOAO SOUZA&#10;..."
                 />
                 <p className="text-xs text-gray-500 mt-1">Total detectado: {loteNomes.split('\n').filter(n => n.trim().length > 0).length} alunos</p>
               </div>

               <button type="submit" className="w-full py-3 bg-tsunami-fuchsia text-white rounded font-bold uppercase tracking-widest hover:brightness-110 shadow-[0_0_15px_rgba(224,64,251,0.4)] transition-all">
                 Processar Lote
               </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

const UserPlaceholder = () => (
  <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
