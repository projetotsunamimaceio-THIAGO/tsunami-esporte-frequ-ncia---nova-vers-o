import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginView } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { TurmasView } from './views/Turmas';
import { AlunosView } from './views/Alunos';
import { ArenaView } from './views/Arena';
import { FacialArenaView } from './views/Facial';
import { ReportsView } from './views/Reports';

// Placeholders para as próximas telas
const Placeholder = ({ name }: { name: string }) => {
  const { navigate } = useApp();
  return (
    <div className="p-10 text-center space-y-4">
      <h2 className="text-2xl font-bold text-white uppercase">{name}</h2>
      <p className="text-gray-400">Módulo em construção...</p>
      <button onClick={() => navigate('dashboard')} className="text-tsunami-cyan underline hover:text-white">Voltar ao Início</button>
    </div>
  );
};

function Router() {
  const { currentView } = useApp();

  switch (currentView) {
    case 'login': return <LoginView />;
    case 'dashboard': return <Dashboard />;
    case 'turmas': return <TurmasView />;
    case 'alunos': return <AlunosView />;
    case 'arena': return <ArenaView />;
    case 'facial': return <FacialArenaView />;
    case 'reports': return <ReportsView />;
    default: return <Dashboard />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-tsunami-bg text-gray-200">
        <Router />
      </div>
    </AppProvider>
  );
}
