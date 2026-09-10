// client/src/App.jsx
import React, { useState } from 'react';
import { Arena } from './pages/Arena';
import { AdminDashboard } from './pages/AdminDashboard';
import API from './api/client';

export default function App() {
  const [view, setView] = useState('arena');
  const [token, setToken] = useState(localStorage.getItem('visualrank_token'));
  const [role, setRole] = useState(localStorage.getItem('visualrank_role'));
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? '/api/auth/register-admin' : '/api/auth/login';
    try {
      const res = await API.post(endpoint, {
        username: usernameInput,
        password: passwordInput
      });

      if (isRegistering) {
        alert('Admin registered successfully! You can now log in.');
        setIsRegistering(false);
        return;
      }

      localStorage.setItem('visualrank_token', res.data.token);
      localStorage.setItem('visualrank_role', res.data.role);
      setToken(res.data.token);
      setRole(res.data.role);
      setShowLoginModal(false);
      setUsernameInput('');
      setPasswordInput('');
    } catch (err) {
      alert('Authentication error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('visualrank_token');
    localStorage.removeItem('visualrank_role');
    setToken(null);
    setRole(null);
    setView('arena');
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('arena')}>
          <div className="h-4 w-4 bg-indigo-500 rounded-sm" />
          <span className="font-semibold text-sm tracking-tight text-neutral-100">VisualRank.AI</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('arena')}
            className={`text-xs font-mono transition ${view === 'arena' ? 'text-indigo-400' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            Arena
          </button>

          {role === 'admin' && (
            <button
              onClick={() => setView('admin')}
              className={`text-xs font-mono transition ${view === 'admin' ? 'text-indigo-400' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              Telemetry Dashboard
            </button>
          )}

          {token ? (
            <button
              onClick={handleLogout}
              className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-300 px-3 py-1.5 rounded hover:bg-neutral-800 transition font-mono"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-xs bg-neutral-100 text-neutral-950 px-3 py-1.5 rounded hover:bg-neutral-200 transition font-medium"
            >
              Admin Portal
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {view === 'arena' ? <Arena /> : <AdminDashboard />}
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold text-neutral-100 mb-1">
              {isRegistering ? 'Register Primary Admin' : 'Administrative Access'}
            </h3>
            <p className="text-xs text-neutral-400 mb-4 font-mono">
              {isRegistering ? 'Create root admin credentials.' : 'Sign in to review telemetry & manage assets.'}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
                required
              />
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-xs text-indigo-400 hover:underline font-mono"
                >
                  {isRegistering ? 'Switch to Login' : 'Register New Admin'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition"
                  >
                    {isRegistering ? 'Register' : 'Authenticate'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}