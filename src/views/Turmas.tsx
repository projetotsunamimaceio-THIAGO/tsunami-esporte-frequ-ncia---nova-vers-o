import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DataService } from '../services/dataService';
import { Turma } from '../types';
import { ArrowLeft, Plus, Edit2, Trash2, Clock, Users as UsersIcon, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

export function TurmasView() {
  const { navigate } = useApp();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [vagas, setVagas] = useState<number>(20);
  const [dias, setDias] = useState<string[]>([]);

  const diasDaSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  useEffect(() => {
    loadTurmas();
  }, []);

  const loadTurmas = async () => {
    setLoading(true);
    const data = await DataService.getTurmas();
    setTurmas(data);
    setLoading(false);
  };

  const openModal = (turma?: Turma) => {
    if (turma) {
      setEditingTurma(turma);
      setNome(turma.nome);
      setInicio(turma.inicio);
      setFim(turma.fim);
      setVagas(turma.vagas);
      setDias(turma.dias);
    } else {
      setEditingTurma(null);
      setNome('');
      setInicio('');
      setFim('');
      setVagas(20);
      setDias([]);
    }
    setModalOpen(true);
  };

  const toggleDia = (dia: string) => {
    setDias(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dias.length === 0) {
      alert("Selecione pelo menos um dia da semana.");
      return;
    }
    const turmaData = { nome: nome.toUpperCase(), inicio, fim, vagas, dias };
    
    if (editingTurma) {
      await DataService.updateTurma(editingTurma.id, turmaData);
    } else {
      await DataService.addTurma(turmaData);
    }
    setModalOpen(false);
    loadTurmas();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta turma?')) {
      await DataService.deleteTurma(id);
      loadTurmas();
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('dashboard')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold uppercase text-white tracking-wider flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-tsunami-cyan animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
              Gestão de Turmas
            </h1>
          </div>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-tsunami-cyan/10 text-tsunami-cyan border border-tsunami-cyan/50 rounded-lg hover:bg-tsunami-cyan hover:text-black transition-all shadow-[0_0_10px_rgba(0,255,255,0.2)] font-bold uppercase text-sm"
        >
          <Plus className="w-4 h-4" /> Nova Turma
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-tsunami-cyan">
          <div className="w-8 h-8 border-4 border-tsunami-cyan/30 border-t-tsunami-cyan rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {turmas.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 glass-panel">
              Nenhuma turma cadastrada.
            </div>
          )}
          {turmas.map(turma => (
            <div key={turma.id} className="glass-panel neon-border-cyan p-5 group relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white uppercase">{turma.nome}</h3>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(turma)} className="p-1.5 text-gray-400 hover:text-white bg-white/5 rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(turma.id)} className="p-1.5 text-tsunami-fuchsia/70 hover:text-tsunami-fuchsia bg-white/5 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-tsunami-cyan/60" />
                  <span>{turma.inicio} às {turma.fim}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-tsunami-cyan/60" />
                  <span>{turma.vagas} vagas limite</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-tsunami-cyan/60" />
                  <div className="flex gap-1 flex-wrap">
                    {diasDaSemana.map(d => (
                      <span key={d} className={cn(
                        "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                        turma.dias.includes(d) ? "bg-tsunami-cyan/20 text-tsunami-cyan border border-tsunami-cyan/30" : "bg-white/5 text-gray-600 border border-white/5"
                      )}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel neon-border-cyan p-6 w-full max-w-md bg-[#0a0c16]/90 relative">
            <h2 className="text-xl font-bold text-white uppercase mb-6">
              {editingTurma ? 'Editar Turma' : 'Nova Turma'}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Nome da Turma</label>
                <input required type="text" value={nome} onChange={e => setNome(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-white uppercase focus:border-tsunami-cyan outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-1">Início</label>
                  <input required type="time" value={inicio} onChange={e => setInicio(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:border-tsunami-cyan outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-400 mb-1">Término</label>
                  <input required type="time" value={fim} onChange={e => setFim(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:border-tsunami-cyan outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Vagas</label>
                <input required type="number" min="1" value={vagas} onChange={e => setVagas(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:border-tsunami-cyan outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-400 mb-2">Dias da Semana</label>
                <div className="flex flex-wrap gap-2">
                  {diasDaSemana.map(d => (
                    <button type="button" key={d} onClick={() => toggleDia(d)}
                      className={cn(
                        "px-3 py-1 rounded text-xs font-bold uppercase transition-colors border",
                        dias.includes(d) 
                          ? "bg-tsunami-cyan/20 text-tsunami-cyan border-tsunami-cyan/50" 
                          : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 rounded bg-white/5 text-gray-300 hover:bg-white/10 transition-colors uppercase text-sm font-bold border border-white/10"
                >
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-2 rounded bg-tsunami-cyan text-black hover:bg-white transition-colors uppercase text-sm font-bold shadow-[0_0_15px_rgba(0,255,255,0.4)]"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
