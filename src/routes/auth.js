const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// System password authentication
router.post('/system', [
    body('password').isLength({ min: 1 }).withMessage('System password is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;
    
    req.db.verifySystemPassword(password, (err, result) => {
        if (err) {
            console.error('System authentication error:', err);
            return res.status(500).json({ error: 'System authentication failed' });
        }
        
        if (result.success) {
            req.session.systemAuthenticated = true;
            
            // Get all users after successful system authentication
            req.db.getAllUsers((err, users) => {
                if (err) {
                    console.error('Failed to fetch users:', err);
                    return res.status(500).json({ error: 'Authentication succeeded but failed to load users' });
                }
                
                res.json({ 
                    success: true, 
                    message: 'System authenticated successfully',
                    users: users 
                });
            });
        } else {
            res.status(401).json({ error: 'Invalid system password' });
        }
    });
});

// User PIN authentication
router.post('/user', [
    body('userId').isInt().withMessage('Valid user ID is required'),
    body('pin').isLength({ min: 1 }).withMessage('PIN is required')
], (req, res) => {
    
    if (!req.session.systemAuthenticated) {
        return res.status(401).json({ error: 'System authentication required first' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, pin } = req.body;
    
    req.db.verifyUserPinById(userId, pin, (err, result) => {
        if (err) {
            console.error('User PIN verification error:', err);
            return res.status(500).json({ error: 'PIN verification failed' });
        }
        
        if (!result.success) {
            return res.status(401).json({ error: result.message });
        }
        
        
        req.session.user = {
            id: userId,
            rank: result.user.rank,
            full_name: result.user.full_name,
            username: `user_${userId}` 
        };
        
        res.json({ success: true, user: req.session.user });
    });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Check authentication status
router.get('/status', (req, res) => {
    res.json({
        systemAuthenticated: !!req.session.systemAuthenticated,
        userAuthenticated: !!req.session.user,
        user: req.session.user || null
    });
});

module.exports = router;
