import React, { useState, useEffect } from 'react';
import API from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminDashboard = () => {
  const [telemetry, setTelemetry] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const fetchAnalytics = async () => {
    try {
      const res = await API.get('/api/admin/analytics');
      setTelemetry(res.data);
    } catch (err) {
      console.error('Analytics retrieval error:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('title', uploadTitle);

    try {
      setUploadStatus('Uploading & running AI vision analysis...');
      await API.post('/api/items', formData);
      setUploadStatus('Asset synchronized successfully.');
      setUploadTitle('');
      setSelectedFile(null);
      fetchAnalytics();
    } catch (err) {
      setUploadStatus('Upload failed: ' + err.message);
    }
  };

  if (!telemetry) {
    return <div className="p-8 text-neutral-400 font-mono text-sm">Authenticating telemetry pipeline...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="border-b border-neutral-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">Telemetry & Content Audit</h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            System overview, model distributions, and moderation interception logs.
          </p>
        </div>
      </div>

      {/* Asset Upload Interface */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 font-mono mb-4">
          Direct Asset Ingestion (Cloudinary Vision Pipeline)
        </h2>
        <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-4 items-center">
          <input
            type="text"
            placeholder="Asset Descriptor / Title"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="w-full sm:w-1/3 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
            required
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="w-full sm:w-1/3 text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700"
            required
          />
          <button
            type="submit"
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
          >
            Ingest Asset
          </button>
        </form>
        {uploadStatus && <p className="text-xs text-neutral-400 font-mono mt-2">{uploadStatus}</p>}
      </div>

      {/* Analytics Chart */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 h-80">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-mono mb-4">
          Elo Rating Distribution Spectrum
        </h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={telemetry.eloDistribution}>
            <XAxis dataKey="_id" stroke="#525252" fontSize={12} tickLine={false} />
            <YAxis stroke="#525252" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', fontSize: '12px' }}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Flagged Comments Table */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-mono mb-4">
          Automated Moderation Intercepts
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-mono">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500 text-xs">
                <th className="pb-3">Author</th>
                <th className="pb-3">Cleaned Public String</th>
                <th className="pb-3">Raw Uncensored Buffer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {telemetry.flaggedComments.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-4 text-xs text-neutral-500">
                    No flagged infractions recorded in this window.
                  </td>
                </tr>
              ) : (
                telemetry.flaggedComments.map((entry) => (
                  <tr key={entry._id}>
                    <td className="py-3 text-neutral-400 text-xs">{entry.username}</td>
                    <td className="py-3 text-emerald-400 text-xs">{entry.sanitizedContent}</td>
                    <td className="py-3 text-rose-400 text-xs">{entry.rawContent}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};