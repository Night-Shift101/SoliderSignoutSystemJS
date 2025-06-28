const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require('dotenv').config();

const Database = require('./src/database/database');
const soldierRoutes = require('./src/routes/soldiers');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 100 requests per windowMs
    skip: (req, res) => {
        // Skip rate limiting for CSS, JS, and image files
        return req.path.endsWith('.css') || req.path.endsWith('.js') || 
               req.path.endsWith('.png') || req.path.endsWith('.jpg') || 
               req.path.endsWith('.jpeg') || req.path.endsWith('.gif');
    }
});
app.use(limiter);

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with aggressive no-cache headers
app.use((req, res, next) => {
    // Force no-cache for all static files to prevent caching issues
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Make database available to routes
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Routes
app.use('/api/signouts', soldierRoutes);

// Serve main page (redirect to login if not authenticated)
app.get('/', (req, res) => {
    if (!req.session.user || !req.session.systemAuthenticated) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login page route
app.get('/login', (req, res) => {
    if (req.session.user && req.session.systemAuthenticated) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Soldier Sign-Out System running on http://localhost:${PORT}`);
    console.log('Database initialized successfully');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close();
    process.exit(0);
});
