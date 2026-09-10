require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'visualrank_production_jwt_secret_key';

// CORS Configuration
const allowedOrigin = process.env.CLIENT_URL || 'https://visualrank.vercel.app';
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));
app.use(express.json());

// MongoDB Schemas
const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  eloRating: { type: Number, default: 1200 },
  matchesPlayed: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Item = mongoose.model('Item', itemSchema);

const commentSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  username: { type: String, default: 'Guest Reviewer' },
  content: { type: String, required: true },
  sanitizedContent: { type: String, required: true },
  profanityDetected: { type: Boolean, default: false },
  rating: { type: Number, default: 5 },
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'visualrank_assets',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  }
});
const upload = multer({ storage });

// Lexical Filter
const PROFANITY_LIST = ['damn', 'hell', 'crap', 'shit', 'fuck', 'bitch', 'asshole'];
const sanitizeText = (text) => {
  let sanitized = text;
  let detected = false;
  PROFANITY_LIST.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(sanitized)) {
      detected = true;
      sanitized = sanitized.replace(regex, '***');
    }
  });
  return { sanitized, detected };
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session token.' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Restricted to administrative personnel.' });
  }
};

// Root Healthcheck
app.get('/', (req, res) => {
  res.json({ status: 'VisualRank API active', uptime: process.uptime() });
});

// Authentication Endpoints
const handleRegistration = async (req, res) => {
  try {
    const { username, password, adminSecret } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(409).json({ error: 'Username already registered.' });
    }

    let role = 'voter';
    if (adminSecret) {
      if (process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET) {
        role = 'admin';
      } else {
        return res.status(403).json({ error: 'Invalid Admin Secret Key. Registration denied.' });
      }
    }

    if (cleanUsername === 'verispiancar') {
      role = 'admin';
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username: cleanUsername,
      password: hashedPassword,
      role,
      canVote: role === 'voter',
      hasVoted: false
    });

    await user.save();
    res.status(201).json({
      message: `${role === 'admin' ? 'Admin' : 'Voter'} account registered successfully.`,
      role
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.post('/api/auth/register', handleRegistration);
app.post('/api/auth/register_admin', handleRegistration);

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = username.trim().toLowerCase();

    const user = await User.findOne({ username: cleanUsername });
    if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

    if (cleanUsername === 'verispiancar' && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid username or password.' });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        canVote: user.canVote,
        hasVoted: user.hasVoted
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, '-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Benchmarking & Matchmaking Endpoints
app.get('/api/matchup', async (req, res) => {
  try {
    const count = await Item.countDocuments();
    if (count < 2) {
      return res.status(400).json({ error: 'At least 2 active images are required to benchmark.' });
    }

    const items = await Item.aggregate([{ $sample: { size: 2 } }]);
    res.json({ pair: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vote', authenticateToken, async (req, res) => {
  try {
    const { winnerId, loserId } = req.body;
    const voter = await User.findById(req.user.id);

    if (!voter) return res.status(404).json({ error: 'Voter account not found.' });

    if (voter.role === 'voter' && !voter.canVote) {
      return res.status(403).json({
        error: 'Voting access locked. You have submitted your vote for this cycle.'
      });
    }

    const winner = await Item.findById(winnerId);
    const loser = await Item.findById(loserId);

    if (!winner || !loser) {
      return res.status(404).json({ error: 'Benchmark assets not found.' });
    }

    // Dynamic Elo Algorithm
    const K = 32;
    const expectedWinner = 1 / (1 + Math.pow(10, (loser.eloRating - winner.eloRating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winner.eloRating - loser.eloRating) / 400));

    winner.eloRating = Math.round(winner.eloRating + K * (1 - expectedWinner));
    loser.eloRating = Math.round(loser.eloRating + K * (0 - expectedLoser));
    winner.matchesPlayed += 1;
    loser.matchesPlayed += 1;

    await winner.save();
    await loser.save();

    if (voter.role === 'voter') {
      voter.canVote = false;
      voter.hasVoted = true;
      voter.votesCast += 1;
      await voter.save();
    }

    res.json({
      message: 'Vote confirmed.',
      canVote: voter.canVote,
      hasVoted: voter.hasVoted
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Telemetry & Assets
app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ eloRating: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'Image file upload is required.' });
    }
    const { title } = req.body;
    const newItem = new Item({
      title: title || 'Untitled Benchmark Candidate',
      imageUrl: req.file.path,
      eloRating: 1200,
      matchesPlayed: 0
    });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Critiques
app.get('/api/comments/:itemId', async (req, res) => {
  try {
    const comments = await Comment.find({ itemId: req.params.itemId }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { itemId, content, username, rating } = req.body;
    if (!content) return res.status(400).json({ error: 'Comment body required.' });

    const { sanitized, detected } = sanitizeText(content);
    const comment = new Comment({
      itemId,
      username: username || 'Guest Reviewer',
      content,
      sanitizedContent: sanitized,
      profanityDetected: detected,
      rating: rating || 5
    });
    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Voter Management
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/users/:id/toggle-access', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.canVote = !user.canVote;
    if (user.canVote) user.hasVoted = false;
    await user.save();
    res.json({ message: `Access updated for ${user.username}`, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/reset-all-voters', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await User.updateMany({ role: 'voter' }, { $set: { canVote: true, hasVoted: false } });
    res.json({ message: 'All voter accounts reset for next benchmarking round.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database Connection & Server Bootstrap
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Atlas Connected');
    app.listen(PORT, () => console.log(`Server executing on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB Connection Error:', err));