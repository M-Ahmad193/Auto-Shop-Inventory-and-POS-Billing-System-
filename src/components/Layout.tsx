import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import { Navigate, Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-bg text-text-p flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="ml-[200px] flex-1 p-8 overflow-y-auto pb-20">
          <div className="max-w-7xl mx-auto min-h-full flex flex-col justify-between">
            <Outlet />
            
            <footer className="mt-12 pt-8 border-t border-border/30">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-6 px-4 bg-card/30 rounded-xl border border-border/20 backdrop-blur-sm">
                <p className="text-[10px] text-text-s uppercase tracking-[0.2em] font-black italic">
                   System v2.1 — Secure Terminal
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                  <p className="text-[10px] text-text-s uppercase tracking-[0.3em] font-black">
                    Developed by <span className="text-accent underline underline-offset-4 decoration-accent/30">Muhammad Ahmad</span>
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
