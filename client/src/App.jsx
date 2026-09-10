import React, { useState, useEffect } from 'react';
import API from './api/client';
import { Arena } from './pages/Arena';
import { Dashboard } from './pages/Dashboard';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('arena');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Synchronize session on load
  const syncSession = async () => {
    const token = localStorage.getItem('visualrank_token');
    if (!token) {
      setCurrentUser(null);
      return;
    }
    try {
      const res = await API.get('/api/auth/me');
      setCurrentUser(res.data);
      localStorage.setItem('visualrank_user', JSON.stringify(res.data));
    } catch {
      handleLogout();
    }
  };

  useEffect(() => {
    syncSession();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('visualrank_token');
    localStorage.removeItem('visualrank_user');
    setCurrentUser(null);
    setActiveTab('arena');
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('arena');
    }
  };

  const handleAdminClick = () => {
    if (!currentUser) {
      setIsAuthOpen(true);
    } else if (currentUser.role !== 'admin') {
      alert(`Access Restricted: You are authenticated as a Voter (${currentUser.username}). Only accounts with the Administrator role can access the Telemetry Dashboard.`);
    } else {
      setActiveTab('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Global Navigation Bar */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => setActiveTab('arena')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-4 h-4 rounded bg-indigo-500 shadow-sm shadow-indigo-500/50" />
            <span className="font-bold tracking-tight text-neutral-100 text-base">VisualRank.AI</span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('arena')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'arena'
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Arena
            </button>

            <button
              onClick={handleAdminClick}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'dashboard'
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Admin Portal
            </button>

            <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-xs font-mono text-neutral-300">
                  {currentUser.username}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase border ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                      : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                  }`}
                >
                  {currentUser.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-neutral-400 hover:text-rose-400 font-mono transition px-2 py-1 ml-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-950 font-medium text-xs px-3 py-1.5 rounded-lg transition"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Dynamic Viewport */}
      <main className="flex-1">
        {activeTab === 'arena' && (
          <Arena onNavigateLeaderboard={handleAdminClick} />
        )}
        {activeTab === 'dashboard' && currentUser?.role === 'admin' && (
          <Dashboard />
        )}
      </main>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}