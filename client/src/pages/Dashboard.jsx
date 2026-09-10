import React, { useState, useEffect } from 'react';
import API from '../api/client';

export const Dashboard = () => {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await API.get('/api/items');
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch benchmark items:', err);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await API.get('/api/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch user directory:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchUsers();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Select an asset file.');
    setUploading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('image', file);

    try {
      await API.post('/api/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setTitle('');
      setFile(null);
      fetchItems();
      alert('Asset registered successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Asset ingestion failed.');
    } finally {
      setUploading(false);
    }
  };

  const toggleUserAccess = async (userId) => {
    try {
      await API.patch(`/api/admin/users/${userId}/toggle-access`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Access modification failed.');
    }
  };

  const resetAllVoters = async () => {
    if (!window.confirm('Reset all voter accounts? All voters will receive permission to cast 1 new vote.')) return;
    try {
      await API.post('/api/admin/users/reset-all-voters');
      fetchUsers();
      alert('All voters re-authorized.');
    } catch (err) {
      alert(err.response?.data?.error || 'Voter reset failed.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-neutral-100">Telemetry & Operations Control</h1>
        <p className="text-neutral-400 text-xs sm:text-sm font-mono mt-1">
          Manage visual asset ingestion, participant lockout states, and leaderboard rankings.
        </p>
      </div>

      {/* Asset Ingestion Form */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-200 mb-4">Direct Asset Ingestion</h3>
        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            required
            placeholder="Asset Title / Identifier"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="file"
            required
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
          />
          <button
            type="submit"
            disabled={uploading}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-950 font-medium text-xs px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {uploading ? 'Ingesting Asset...' : 'Ingest Candidate Asset'}
          </button>
        </form>
      </div>

      {/* Voter Access & Lockout Management */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-200">Voter Access & Participation Control</h3>
            <p className="text-xs text-neutral-400 font-mono">
              Monitor individual lockout states and release new pairwise voting cycles.
            </p>
          </div>
          <button
            onClick={resetAllVoters}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-lg font-medium transition"
          >
            Reset All Voters for Next Round
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950 text-neutral-400 uppercase font-mono border-b border-neutral-800">
              <tr>
                <th className="p-3">User Identity</th>
                <th className="p-3">Role</th>
                <th className="p-3">Votes Cast</th>
                <th className="p-3">Current Access</th>
                <th className="p-3 text-right">Access Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 font-mono">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-neutral-800/30">
                  <td className="p-3 font-semibold text-neutral-100">{u.username}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        u.role === 'admin'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">{u.votesCast || 0}</td>
                  <td className="p-3">
                    {u.role === 'admin' ? (
                      <span className="text-neutral-500">Unrestricted</span>
                    ) : u.canVote ? (
                      <span className="text-emerald-400 font-sans">Active (Access Granted)</span>
                    ) : (
                      <span className="text-rose-400 font-sans">Locked (Vote Submitted)</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => toggleUserAccess(u._id)}
                        className={`text-[11px] px-3 py-1 rounded transition ${
                          u.canVote
                            ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50'
                            : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/50'
                        }`}
                      >
                        {u.canVote ? 'Revoke Access' : 'Authorize Vote'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Elo Leaderboard */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-200 mb-4">Current Asset Standings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div key={item._id} className="border border-neutral-800 bg-neutral-950 p-4 rounded-xl flex items-center gap-4">
              <img src={item.imageUrl} alt={item.title} className="w-16 h-16 object-cover rounded-lg border border-neutral-800" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono text-indigo-400">Rank #{idx + 1}</span>
                <h4 className="text-sm font-medium text-neutral-200 truncate">{item.title}</h4>
                <p className="text-xs font-mono text-neutral-400">{item.eloRating} Elo ({item.matchesPlayed} matches)</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;