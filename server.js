
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const helpRoutes = require('./routes/helpRoutes');
const adminRoutes = require('./routes/adminRoutes');
const levelRoutes = require('./routes/levelRoutes');
const walletRoutes = require('./routes/walletRoutes');
const hostRoutes = require('./routes/hostRoutes');
const agencyRoutes = require('./routes/agencyRoutes');
const bdRoutes = require('./routes/bdRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/bd', bdRoutes);

// Serve Admin Panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('exit', (code) => {
  console.log(`Process exited with code: ${code}`);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down.');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
