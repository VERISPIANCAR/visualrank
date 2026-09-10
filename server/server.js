require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const Item = require('./models/Item');
const User = require('./models/User');
const Comment = require('./models/Comment');
const { calculateElo } = require('./services/elo');
const { sanitizeComment } = require('./services/moderation');
const { verifyToken, requireAdmin } = require('./middleware/auth');

const app = express();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// server/server.js (Lines 26-33)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'visualrank_uploads',
    allowed_formats: ['jpg', 'png', 'webp', 'jpeg']
  }
});
const upload = multer({ storage });

// Cross-Origin Middleware
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
}));

app.use(express.json());

// --- Authentication Routes ---
app.post('/api/auth/register-admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already in use.' });

    const admin = await User.create({ username, password, role: 'admin' });
    res.status(201).json({ message: 'Admin account created successfully.', userId: admin._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Asset Ingestion (Admin Only) ---
app.post('/api/items', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file required.' });

    const newItem = await Item.create({
      title: req.body.title || 'Untitled Asset',
      description: req.body.description || '',
      imageUrl: req.file.path,
      cloudinaryId: req.file.filename,
      aiTags: req.file.tags || []
    });

    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Public Matchmaking & Voting ---
app.get('/api/matchup', async (req, res) => {
  try {
    const count = await Item.countDocuments({ isActive: true });
    if (count < 2) {
      return res.status(400).json({ error: 'At least 2 active images are required to benchmark.' });
    }

    const randomIdx = Math.floor(Math.random() * count);
    const primary = await Item.findOne({ isActive: true }).skip(randomIdx);

    let opponent = await Item.findOne({
      _id: { $ne: primary._id },
      isActive: true,
      eloRating: { $gte: primary.eloRating - 200, $lte: primary.eloRating + 200 }
    });

    if (!opponent) {
      opponent = await Item.findOne({ _id: { $ne: primary._id }, isActive: true });
    }

    res.json({ pair: [primary, opponent] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vote', async (req, res) => {
  const { winnerId, loserId } = req.body;
  try {
    const winner = await Item.findById(winnerId);
    const loser = await Item.findById(loserId);

    if (!winner || !loser) return res.status(404).json({ error: 'Item not found.' });

    const { newWinnerRating, newLoserRating } = calculateElo(winner.eloRating, loser.eloRating);

    winner.eloRating = newWinnerRating;
    winner.wins += 1;
    winner.matchesPlayed += 1;

    loser.eloRating = newLoserRating;
    loser.losses += 1;
    loser.matchesPlayed += 1;

    await Promise.all([winner.save(), loser.save()]);
    res.json({ success: true, newWinnerRating, newLoserRating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Comment Moderation Pipeline ---
app.post('/api/comments', async (req, res) => {
  const { itemId, content, rating, username } = req.body;
  const { sanitized, isFlagged } = sanitizeComment(content || '');

  try {
    const comment = await Comment.create({
      itemId,
      username: username || 'Guest Critic',
      rawContent: content,
      sanitizedContent: sanitized,
      profanityDetected: isFlagged,
      rating: rating || 5
    });

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/comments/:itemId', async (req, res) => {
  try {
    const comments = await Comment.find({ itemId: req.params.itemId })
      .sort({ createdAt: -1 })
      .select('-rawContent');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin Analytics Pipeline ---
app.get('/api/admin/analytics', verifyToken, requireAdmin, async (req, res) => {
  try {
    const eloDistribution = await Item.aggregate([
      {
        $bucket: {
          groupBy: '$eloRating',
          boundaries: [800, 1000, 1200, 1400, 1600, 2000],
          default: 'Other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    const leaderboard = await Item.find({ isActive: true })
      .sort({ eloRating: -1 })
      .limit(5)
      .select('title imageUrl eloRating wins losses matchesPlayed');

    const flaggedComments = await Comment.find({ profanityDetected: true })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ eloDistribution, leaderboard, flaggedComments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database & Server Initialization
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connection established.');
    app.listen(PORT, () => console.log(`Engine live on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection failure:', err));