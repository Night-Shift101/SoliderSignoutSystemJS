const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Middleware
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

const verifyPin = async (req, res, next) => {
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

// Get system settings
router.get('/', requireAuth, requireSystemAuth, (req, res) => {
    req.db.getSystemSettings((err, settings) => {
        if (err) {
            console.error('Failed to fetch settings:', err);
            return res.status(500).json({ error: 'Failed to fetch settings' });
        }
        res.json(settings);
    });
});

// Update max sign-out duration
router.put('/max-duration', [
    requireAuth,
    requireSystemAuth,
    verifyPin,
    body('maxDuration').isInt({ min: 1, max: 168 }).withMessage('Max duration must be between 1 and 168 hours')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { maxDuration } = req.body;
    
    req.db.updateMaxDuration(maxDuration, (err) => {
        if (err) {
            console.error('Failed to update max duration:', err);
            return res.status(500).json({ error: 'Failed to update max duration' });
        }
        res.json({ success: true, message: 'Max duration updated successfully' });
    });
});

// Update warning threshold
router.put('/warning-threshold', [
    requireAuth,
    requireSystemAuth,
    verifyPin,
    body('warningThreshold').isInt({ min: 1, max: 24 }).withMessage('Warning threshold must be between 1 and 24 hours')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { warningThreshold } = req.body;
    
    req.db.updateWarningThreshold(warningThreshold, (err) => {
        if (err) {
            console.error('Failed to update warning threshold:', err);
            return res.status(500).json({ error: 'Failed to update warning threshold' });
        }
        res.json({ success: true, message: 'Warning threshold updated successfully' });
    });
});

// Export all data
router.get('/export', requireAuth, requireSystemAuth, verifyPin, (req, res) => {
    req.db.exportAllData((err, data) => {
        if (err) {
            console.error('Failed to export data:', err);
            return res.status(500).json({ error: 'Failed to export data' });
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=signout-data-${new Date().toISOString().split('T')[0]}.json`);
        res.json(data);
    });
});

// Create backup
router.post('/backup', [
    requireAuth,
    requireSystemAuth,
    verifyPin
], (req, res) => {
    req.db.createBackup((err, backupPath) => {
        if (err) {
            console.error('Failed to create backup:', err);
            return res.status(500).json({ error: 'Failed to create backup' });
        }
        res.json({ success: true, message: 'Backup created successfully', path: backupPath });
    });
});

// Clear old records
router.delete('/clear-records', [
    requireAuth,
    requireSystemAuth,
    verifyPin,
    body('days').isInt({ min: 30 }).withMessage('Must keep at least 30 days of records')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { days } = req.body;
    
    req.db.clearOldRecords(days, (err, deletedCount) => {
        if (err) {
            console.error('Failed to clear old records:', err);
            return res.status(500).json({ error: 'Failed to clear old records' });
        }
        res.json({ 
            success: true, 
            message: `Successfully deleted ${deletedCount} old records`,
            deletedCount 
        });
    });
});

// Reset system
router.post('/reset', [
    requireAuth,
    requireSystemAuth,
    verifyPin,
    body('confirmText').equals('RESET SYSTEM').withMessage('Confirmation text must be "RESET SYSTEM"')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    req.db.resetSystem((err) => {
        if (err) {
            console.error('Failed to reset system:', err);
            return res.status(500).json({ error: 'Failed to reset system' });
        }
        
        // Clear session after reset
        req.session.destroy(() => {
            res.json({ success: true, message: 'System reset successfully' });
        });
    });
});

module.exports = router;
