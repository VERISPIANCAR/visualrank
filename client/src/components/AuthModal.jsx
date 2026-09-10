import React, { useState } from 'react';
import API from '../api/client';

export const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        const payload = { username, password };
        if (adminSecret.trim()) payload.adminSecret = adminSecret.trim();

        await API.post('/api/auth/register', payload);
        alert('Account registered successfully. Logging in...');
      }

      const loginRes = await API.post('/api/auth/login', { username, password });
      localStorage.setItem('visualrank_token', loginRes.data.token);
      localStorage.setItem('visualrank_user', JSON.stringify(loginRes.data.user));

      onAuthSuccess(loginRes.data.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Authentication failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-neutral-100 mb-1">
          {isRegistering ? 'Create VisualRank Account' : 'Authenticate Session'}
        </h2>
        <p className="text-xs text-neutral-400 mb-6 font-mono">
          {isRegistering ? 'Register as a benchmarking voter or input an admin key.' : 'Access evaluation arena and telemetry privileges.'}
        </p>

        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs p-3 rounded-lg mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-neutral-400 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-neutral-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {isRegistering && (
            <div>
              <label className="block text-xs font-mono text-neutral-400 mb-1">
                Admin Secret Key <span className="text-neutral-500">(Optional: Voter if empty)</span>
              </label>
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Leave blank for Voter account"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs py-2.5 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : isRegistering ? 'Register & Enter' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center border-t border-neutral-800/80 pt-4">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg('');
            }}
            className="text-xs text-neutral-400 hover:text-indigo-400 transition"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;