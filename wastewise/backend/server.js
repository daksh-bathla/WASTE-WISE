const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const localOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : localOrigins;

app.use(
  cors({
    origin(origin, callback) {
      // Allow direct local access as well as browser requests from the Vite app.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    require('fs').existsSync(uploadDir) || require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
    }
  },
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend server is running', timestamp: new Date() });
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const scanRoutes = require('./routes/scan.routes');
const suggestionRoutes = require('./routes/suggestions.routes');
const scraplogRoutes = require('./routes/scraplog.routes');
const communityRoutes = require('./routes/community.routes');
const voiceRoutes = require('./routes/voice.routes');
const sustainabilityRoutes = require('./routes/sustainability');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/scraplog', scraplogRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/sustainability', sustainabilityRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`WasteWise backend running on http://localhost:${PORT}`);
});

module.exports = app;
