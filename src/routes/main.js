const express = require('express');
const path = require('path');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session.user || !req.session.systemAuthenticated) {
        return res.redirect('/login');
    }
    next();
};

const requireGuest = (req, res, next) => {
    if (req.session.user && req.session.systemAuthenticated) {
        return res.redirect('/');
    }
    next();
};

// Main dashboard route
router.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

// Login page route
router.get('/login', requireGuest, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

// Health check route
router.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API info route
router.get('/api', (req, res) => {
    res.json({
        name: 'Soldier Sign-Out System API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            signouts: '/api/signouts',
            settings: '/api/settings'
        }
    });
});

module.exports = router;
