import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Usuario } from '../types';
import { DataService } from '../services/dataService';

interface AppContextType {
  user: Usuario | null;
  login: (user: Usuario) => void;
  logout: () => void;
  currentView: string;
  navigate: (view: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionUser = DataService.getSessionUser();
    if (sessionUser) {
      setUser(sessionUser);
    } else {
      setCurrentView('login');
    }
    setLoading(false);
  }, []);

  const login = (u: Usuario) => {
    setUser(u);
    setCurrentView('dashboard');
  };

  const logout = () => {
    DataService.logout();
    setUser(null);
    setCurrentView('login');
  };

  const navigate = (view: string) => {
    setCurrentView(view);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-tsunami-cyan font-bold tracking-widest animate-pulse">CARREGANDO SISTEMA...</div>;
  }

  return (
    <AppContext.Provider value={{ user, login, logout, currentView, navigate }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
