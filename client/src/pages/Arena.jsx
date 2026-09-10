import React, { useState, useEffect } from 'react';
import API from '../api/client';
import { SpotlightCard } from '../components/SpotlightCard';
import { SplitText } from '../components/SplitText';
import { AuthModal } from '../components/AuthModal';

export const Arena = ({ onNavigateLeaderboard }) => {
  const [pair, setPair] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const fetchSessionUser = async () => {
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
      localStorage.removeItem('visualrank_token');
      localStorage.removeItem('visualrank_user');
      setCurrentUser(null);
    }
  };

  const loadPair = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/matchup');
      setPair(res.data.pair || []);
      if (res.data.pair && res.data.pair.length > 0) {
        setActiveItemId(res.data.pair[0]._id);
        loadComments(res.data.pair[0]._id);
      }
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
    fetchSessionUser();
    loadPair();
  }, []);

  const handleVote = async (winnerId, loserId) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    try {
      const res = await API.post('/api/vote', { winnerId, loserId });
      if (currentUser.role === 'voter') {
        setCurrentUser((prev) => ({
          ...prev,
          canVote: res.data.canVote,
          hasVoted: res.data.hasVoted
        }));
      } else {
        loadPair();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit vote.');
      fetchSessionUser();
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeItemId) return;
    try {
      await API.post('/api/comments', {
        itemId: activeItemId,
        content: commentText,
        rating: 5,
        username: currentUser ? currentUser.username : 'Guest Reviewer'
      });
      setCommentText('');
      loadComments(activeItemId);
    } catch (err) {
      console.error('Failed to post critique:', err);
    }
  };

  // Voter Lockout Screen
  if (currentUser && currentUser.role === 'voter' && !currentUser.canVote) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-indigo-950/50 border border-indigo-700/60 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400 text-2xl font-mono">
          ✓
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-100 mb-3">Vote Recorded</h2>
        <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
          Your evaluation has been computed into the dynamic Elo model. Per platform protocol, each registered voter is limited to one matchup per benchmark round.
        </p>
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl mb-8">
          <p className="text-xs font-mono text-neutral-400">
            Account Status: <span className="text-rose-400 font-semibold">Locked</span> (Awaiting administrator authorization for subsequent iterations)
          </p>
        </div>
        {onNavigateLeaderboard && (
          <button
            onClick={onNavigateLeaderboard}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-950 font-medium px-6 py-2.5 rounded-lg text-sm transition"
          >
            Review Global Leaderboard
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-neutral-400 font-mono text-sm">
        Calibrating competitive Elo pair...
      </div>
    );
  }

  if (!pair || pair.length < 2) {
    return (
      <div className="flex flex-col h-96 items-center justify-center text-center p-6">
        <h2 className="text-xl font-semibold text-neutral-200 mb-2">Insufficient Benchmark Assets</h2>
        <p className="text-neutral-400 text-sm max-w-md mb-4 font-mono">
          The pairwise engine requires at least 2 active assets. Log in via Admin Portal to upload candidates.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />

      <div className="text-center mb-10">
        <SplitText text="Visual Consensus Arena" className="text-3xl sm:text-4xl text-neutral-100 mb-2" />
        <p className="text-neutral-400 text-xs sm:text-sm font-mono">
          Decentralized visual evaluation via pairwise dynamic Elo rating convergence.
        </p>
        {!currentUser && (
          <div className="mt-4">
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 text-xs px-4 py-1.5 rounded-full font-mono transition"
            >
              Sign In to Vote
            </button>
          </div>
        )}
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

export default Arena;