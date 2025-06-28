const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();


const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
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




router.post('/auth/system', [
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
        
        if (!result.success) {
            return res.status(401).json({ error: result.message });
        }
        
        
        req.session.systemAuthenticated = true;
        res.json({ success: true, message: 'System authenticated' });
    });
});


router.get('/auth/users', (req, res) => {
    
    if (!req.session.systemAuthenticated) {
        return res.status(401).json({ error: 'System authentication required' });
    }

    req.db.getAllUsers((err, users) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
        res.json(users);
    });
});


router.post('/auth/user', [
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

router.post('/auth/login', [
    body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
    body('password').isLength({ min: 1 }).withMessage('Password is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    
    req.db.authenticateUser(username, password, (err, result) => {
        if (err) {
            console.error('Authentication error:', err);
            return res.status(500).json({ error: 'Authentication failed' });
        }
        
        if (!result.success) {
            return res.status(401).json({ error: result.message });
        }
        
        req.session.user = result.user;
        res.json({ success: true, user: result.user });
    });
});

router.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});


router.post('/auth/change-user', (req, res) => {
    if (!req.session.systemAuthenticated) {
        return res.status(401).json({ error: 'System authentication required' });
    }
    
    
    delete req.session.user;
    res.json({ success: true, message: 'User session cleared' });
});

router.get('/auth/check', (req, res) => {
    if (req.session.user && req.session.systemAuthenticated) {
        res.json({ authenticated: true, user: req.session.user });
    } else if (req.session.systemAuthenticated) {
        res.json({ authenticated: false, systemAuthenticated: true });
    } else {
        res.json({ authenticated: false, systemAuthenticated: false });
    }
});


const validateSignOut = [
    body('soldiers').isArray({ min: 1 }).withMessage('At least one soldier is required'),
    body('soldiers.*.rank').optional().trim(),
    body('soldiers.*.firstName').trim().isLength({ min: 1 }).withMessage('First name is required for each soldier'),
    body('soldiers.*.lastName').trim().isLength({ min: 1 }).withMessage('Last name is required for each soldier'),
    body('soldiers.*.dodId').optional().trim(),
    body('location').trim().isLength({ min: 1 }).withMessage('Location is required'),
    body('notes').optional().trim(),
    body('pin').isLength({ min: 1 }).withMessage('PIN is required')
];


router.get('/', requireAuth, (req, res) => {
    req.db.getAllSignOuts((err, signouts) => {
        if (err) {
            console.error('Error fetching sign-outs:', err);
            return res.status(500).json({ error: 'Failed to fetch sign-outs' });
        }
        res.json(signouts);
    });
});


router.get('/current', requireAuth, (req, res) => {
    req.db.getCurrentSignOuts((err, signouts) => {
        if (err) {
            console.error('Error fetching current sign-outs:', err);
            return res.status(500).json({ error: 'Failed to fetch current sign-outs' });
        }
        res.json(signouts);
    });
});


router.get('/logs', requireAuth, (req, res) => {
    const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        soldierName: req.query.soldierName,
        location: req.query.location,  
        status: req.query.status
    };

    req.db.getFilteredSignOuts(filters, (err, signouts) => {
        if (err) {
            console.error('Error fetching filtered sign-outs:', err);
            return res.status(500).json({ error: 'Failed to fetch sign-outs' });
        }
        res.json(signouts);
    });
});


router.get('/logs/export', requireAuth, (req, res) => {
    const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        soldierName: req.query.soldierName,
        location: req.query.location,
        status: req.query.status
    };

    
    req.db.getIndividualSignOutRecords(filters, (err, records) => {
        if (err) {
            console.error('Error fetching individual sign-out records for export:', err);
            return res.status(500).json({ error: 'Failed to export sign-outs' });
        }

        
        const csvHeaders = 'SignOut ID,Soldier Rank,Soldier First Name,Soldier Last Name,DOD ID,Location,Sign Out Time,Sign In Time,Duration (Minutes),Signed Out By,Signed In By,Status,Notes\n';
        const csvRows = records.map(record => {
            const signOutTime = new Date(record.sign_out_time);
            const signInTime = record.sign_in_time ? new Date(record.sign_in_time) : null;
            const durationMinutes = signInTime 
                ? Math.round((signInTime - signOutTime) / (1000 * 60)) 
                : Math.round((new Date() - signOutTime) / (1000 * 60)); 

            
            const rank = (record.soldier_rank || '').replace(/"/g, '""');
            const firstName = (record.soldier_first_name || '').replace(/"/g, '""');
            const lastName = (record.soldier_last_name || '').replace(/"/g, '""');
            const dodId = record.soldier_dod_id || '';
            const location = (record.location || '').replace(/"/g, '""');
            const signedOutBy = (record.signed_out_by_name || '').replace(/"/g, '""');
            const signedInBy = (record.signed_in_by_name || '').replace(/"/g, '""');
            const notes = (record.notes || '').replace(/"/g, '""');

            return [
                record.signout_id,
                `"${rank}"`,
                `"${firstName}"`,
                `"${lastName}"`,
                dodId,
                `"${location}"`,
                signOutTime.toISOString(),
                signInTime ? signInTime.toISOString() : '',
                durationMinutes,
                `"${signedOutBy}"`,
                signedInBy ? `"${signedInBy}"` : '',
                record.status || 'OUT',
                `"${notes}"`
            ].join(',');
        }).join('\n');

        const csv = csvHeaders + csvRows;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="individual-signout-records-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    });
});


router.post('/', requireAuth, validateSignOut, verifyPin, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const signOutData = {
        soldiers: req.body.soldiers, 
        location: req.body.location,
        signed_out_by_id: req.session.user.id,
        signed_out_by_name: `${req.session.user.rank} ${req.session.user.full_name}`,
        notes: req.body.notes || ''
    };

    req.db.addSignOut(signOutData, (err, result) => {
        if (err) {
            console.error('Error adding sign-out:', err);
            return res.status(500).json({ error: 'Failed to add sign-out' });
        }
        res.status(201).json({ 
            message: 'Sign-out created successfully', 
            signout_id: result.signout_id 
        });
    });
});


router.patch('/:signoutId/signin', requireAuth, [
    body('pin').isLength({ min: 1 }).withMessage('PIN is required')
], verifyPin, (req, res) => {
    const signoutId = req.params.signoutId;
    const signedInById = req.session.user.id;
    const signedInByName = `${req.session.user.rank} ${req.session.user.full_name}`;

    req.db.signInSoldiers(signoutId, signedInById, signedInByName, (err, result) => {
        if (err) {
            console.error('Error signing in soldiers:', err);
            return res.status(500).json({ error: 'Failed to sign in soldiers' });
        }
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Sign-out not found or already signed in' });
        }
        res.json({ message: 'Soldiers signed in successfully' });
    });
});


router.get('/:signoutId', requireAuth, (req, res) => {
    const signoutId = req.params.signoutId;

    req.db.getSignOutById(signoutId, (err, signout) => {
        if (err) {
            console.error('Error fetching sign-out:', err);
            return res.status(500).json({ error: 'Failed to fetch sign-out' });
        }
        if (!signout) {
            return res.status(404).json({ error: 'Sign-out not found' });
        }
        res.json(signout);
    });
});


router.post('/auth/validate-pin', requireAuth, [
    body('pin').isLength({ min: 1 }).withMessage('PIN is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pin } = req.body;
    
    req.db.verifyUserPin(req.session.user.id, pin, (err, isValid) => {
        if (err) {
            console.error('PIN verification error:', err);
            return res.status(500).json({ error: 'PIN verification failed' });
        }
        res.json({ valid: isValid });
    });
});




router.get('/export/all', requireAuth, (req, res) => {
    req.db.getAllSignOuts((err, signouts) => {
        if (err) {
            console.error('Error fetching all data for export:', err);
            return res.status(500).json({ error: 'Failed to export all data' });
        }
        
        
        const csvData = convertToCSV(signouts);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="signouts_all_data.csv"');
        res.send(csvData);
    });
});


router.post('/backup', requireAuth, (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(__dirname, '../../data', `backup_${timestamp}.db`);
        const sourcePath = path.join(__dirname, '../../data/soldiers.db');
        
        fs.copyFileSync(sourcePath, backupPath);
        
        res.json({ 
            success: true, 
            message: 'Backup created successfully',
            backupFile: `backup_${timestamp}.db`
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});


router.delete('/clear-old', requireAuth, (req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    req.db.clearOldRecords(thirtyDaysAgo, (err, deletedCount) => {
        if (err) {
            console.error('Error clearing old records:', err);
            return res.status(500).json({ error: 'Failed to clear old records' });
        }
        res.json({ success: true, deletedCount });
    });
});


router.delete('/reset-system', requireAuth, (req, res) => {
    req.db.resetSystem((err) => {
        if (err) {
            console.error('Error resetting system:', err);
            return res.status(500).json({ error: 'Failed to reset system' });
        }
        
        
        req.session.destroy();
        
        res.json({ success: true, message: 'System reset successfully' });
    });
});




router.post('/auth/users', requireAuth, [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('pin').matches(/^\d{4}$/).withMessage('PIN must be 4 digits'),
    body('confirmPin').custom((value, { req }) => {
        if (value !== req.body.pin) {
            throw new Error('PIN confirmation does not match');
        }
        return true;
    }),
    body('rank').isLength({ min: 1 }).withMessage('Rank is required'),
    body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const userData = {
        username: req.body.username,
        password: req.body.password,
        pin: req.body.pin,
        rank: req.body.rank,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    };

    req.db.createUser(userData, (err, user) => {
        if (err) {
            console.error('Error creating user:', err);
            if (err.message === 'Username already exists') {
                return res.status(409).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'Failed to create user' });
        }
        
        res.status(201).json({ 
            message: 'User created successfully', 
            user: {
                id: user.id,
                username: user.username,
                rank: user.rank,
                full_name: user.full_name
            }
        });
    });
});


router.patch('/auth/users/:userId/pin', requireAuth, [
    body('currentPin').matches(/^\d{4}$/).withMessage('Current PIN must be 4 digits'),
    body('newPin').matches(/^\d{4}$/).withMessage('New PIN must be 4 digits'),
    body('confirmNewPin').custom((value, { req }) => {
        if (value !== req.body.newPin) {
            throw new Error('New PIN confirmation does not match');
        }
        return true;
    })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const userId = parseInt(req.params.userId);
    const { currentPin, newPin } = req.body;

    req.db.changeUserPin(userId, currentPin, newPin, (err, result) => {
        if (err) {
            console.error('Error changing user PIN:', err);
            if (err.message === 'Current PIN is incorrect') {
                return res.status(401).json({ error: 'Current PIN is incorrect' });
            }
            if (err.message === 'User not found') {
                return res.status(404).json({ error: 'User not found' });
            }
            return res.status(500).json({ error: 'Failed to change PIN' });
        }
        
        res.json({ message: 'PIN changed successfully' });
    });
});


router.delete('/auth/users/:userId', requireAuth, [
    body('userPin').matches(/^\d{4}$/).withMessage('User PIN must be 4 digits'),
    body('systemPassword').isLength({ min: 1 }).withMessage('System password is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const userId = parseInt(req.params.userId);
    const { userPin, systemPassword } = req.body;

    req.db.deleteUser(userId, userPin, systemPassword, (err, result) => {
        if (err) {
            console.error('Error deleting user:', err);
            if (err.message === 'Invalid system password') {
                return res.status(401).json({ error: 'Invalid system password' });
            }
            if (err.message === 'Invalid user PIN') {
                return res.status(401).json({ error: 'Invalid user PIN' });
            }
            if (err.message === 'User not found') {
                return res.status(404).json({ error: 'User not found' });
            }
            if (err.message === 'Cannot delete admin user') {
                return res.status(403).json({ error: 'Cannot delete admin user' });
            }
            return res.status(500).json({ error: 'Failed to delete user' });
        }
        
        res.json({ message: 'User deleted successfully' });
    });
});


function convertToCSV(data) {
    if (!data || data.length === 0) {
        return 'No data available';
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            }).join(',')
        )
    ].join('\n');
    
    return csvContent;
}

module.exports = router;
