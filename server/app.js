import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import advancedRoutes from './routes/advancedRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import repositoryRoutes from './routes/repositoryRoutes.js';
import githubAuthRoutes from './routes/githubAuthRoutes.js';

const app = express();

// Middleware
// Enable CORS for frontend requests
app.use(cors({
  origin: function (origin, callback) {
    // Allow local development, Vercel deployments, and explicitly set CLIENT_URL
    if (!origin || origin.startsWith('http://localhost') || origin.endsWith('.vercel.app') || origin === process.env.CLIENT_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Set security HTTP headers
app.use(helmet());

// HTTP request logger
app.use(morgan('dev'));

// Parse incoming JSON payloads with increased limits
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/advanced', advancedRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/github', repositoryRoutes);
app.use('/api/github-auth', githubAuthRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

export default app;
