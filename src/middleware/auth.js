// Authentication middleware functions

const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

const requireSystemAuth = (req, res, next) => {
    if (!req.session.systemAuthenticated) {
        return res.status(401).json({ error: 'System authentication required' });
    }
    next();
};

const requireBothAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'User authentication required' });
    }
    if (!req.session.systemAuthenticated) {
        return res.status(401).json({ error: 'System authentication required' });
    }
    next();
};

const verifyPin = (req, res, next) => {
    const { pin } = req.body;
    if (!pin) {
        return res.status(400).json({ error: 'PIN required for this action' });
    }

    req.db.verifyUserPin(req.session.user.id, pin, (err, isValid) => {
        if (err) {
            console.error('PIN verification error:', err);
            return res.status(500).json({ error: 'PIN verification failed' });
        }
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }
        next();
    });
};

// Page redirect middleware
const requirePageAuth = (req, res, next) => {
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

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    requireAuth,
    requireSystemAuth,
    requireBothAuth,
    verifyPin,
    requirePageAuth,
    requireGuest,
    handleValidationErrors
};
