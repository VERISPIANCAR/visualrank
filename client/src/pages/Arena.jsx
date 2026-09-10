import React, { useState, useEffect } from 'react';
import API from '../api/client';
import { SpotlightCard } from '../components/SpotlightCard';
import { SplitText } from '../components/SplitText';

export const Arena = () => {
  const [pair, setPair] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);

  const loadPair = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/matchup');
      setPair(res.data.pair);
      setActiveItemId(res.data.pair[0]._id);
      loadComments(res.data.pair[0]._id);
    } catch (err) {
      console.error('Matchup query error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (id) => {
    try {
      const res = await API.get(`/api/comments/${id}`);
      setComments(res.data);
    } catch (err) {
      console.error('Comment fetch error:', err);
    }
  };

  useEffect(() => {
    loadPair();
  }, []);

  const handleVote = async (winnerId, loserId) => {
    try {
      await API.post('/api/vote', { winnerId, loserId });
      loadPair();
    } catch (err) {
      console.error('Failed to register vote:', err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await API.post('/api/comments', {
        itemId: activeItemId,
        content: commentText,
        rating: 5,
        username: 'Guest Reviewer'
      });
      setCommentText('');
      loadComments(activeItemId);
    } catch (err) {
      console.error('Failed to post critique:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-neutral-400 font-mono text-sm">
        Calibrating competitive Elo pair...
      </div>
    );
  }

  if (pair.length < 2) {
    return (
      <div className="flex flex-col h-96 items-center justify-center text-center p-6">
        <h2 className="text-xl font-semibold text-neutral-200 mb-2">Insufficient Benchmark Assets</h2>
        <p className="text-neutral-400 text-sm max-w-md mb-4 font-mono">
          The pairwise matchmaking engine requires at least 2 active images. Log in via the Admin Portal to upload assets.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <SplitText text="Visual Consensus Arena" className="text-3xl sm:text-4xl text-neutral-100 mb-2" />
        <p className="text-neutral-400 text-xs sm:text-sm font-mono">
          Decentralized visual evaluation via pairwise dynamic Elo rating convergence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {pair.map((item, idx) => {
          const opponent = pair[idx === 0 ? 1 : 0];
          return (
            <SpotlightCard
              key={item._id}
              onClick={() => handleVote(item._id, opponent._id)}
              className="flex flex-col justify-between"
            >
              <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-neutral-950 mb-4 border border-neutral-800">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover select-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-200">{item.title}</h3>
                  <p className="text-xs text-neutral-500 font-mono">Matches: {item.matchesPlayed}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-indigo-950 text-indigo-400 border border-indigo-800/40 text-xs px-2.5 py-1 rounded font-mono">
                    {item.eloRating} Elo
                  </span>
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>

      {/* Guest Critique Section */}
      <div className="border-t border-neutral-900 pt-8 max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4 font-mono">
          Guest Critique Stream (Active Filter Enabled)
        </h3>
        <form onSubmit={handleCommentSubmit} className="flex gap-3 mb-6">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Provide qualitative feedback (Profanity will be sanitized)..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-950 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Submit
          </button>
        </form>

        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c._id} className="p-3 bg-neutral-900/40 border border-neutral-800/60 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-mono text-neutral-400">{c.username}</span>
                {c.profanityDetected && (
                  <span className="text-[10px] bg-rose-950/40 border border-rose-800/50 text-rose-400 px-1.5 py-0.5 rounded">
                    Sanitized
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-300 font-sans">{c.sanitizedContent}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};