const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth, requireBothAuth, verifyPin, handleValidationErrors, requireSystemAuth } = require('../middleware/auth');
const router = express.Router();

// Validation middleware for sign-out creation
const validateSignOut = [
    body('soldiers').isArray({ min: 1 }).withMessage('At least one soldier is required'),
    body('soldiers.*.rank').optional().trim(),
    body('soldiers.*.firstName').trim().isLength({ min: 1 }).withMessage('First name is required for each soldier'),
    body('soldiers.*.lastName').trim().isLength({ min: 1 }).withMessage('Last name is required for each soldier'),
    body('soldiers.*.dodId').optional().trim(),
    body('soldiers.*.middleName').optional().trim(),
    body('location').trim().isLength({ min: 1 }).withMessage('Location is required'),
    body('estimatedReturn').optional().isISO8601().withMessage('Valid estimated return time required'),
    body('notes').optional().trim(),
    body('emergencyContact').optional().trim(),
    body('vehicleInfo').optional().trim(),
    body('pin').isLength({ min: 4 }).withMessage('PIN is required')
];

// Get all signouts
router.get('/', requireAuth, requireSystemAuth, (req, res) => {
    const { status, startDate, endDate, soldierName, location } = req.query;
    
    const filters = {
        status: status || null,
        startDate: startDate || null,
        endDate: endDate || null,
        soldierName: soldierName || null,
        location: location || null
    };
    if (!filters.status && !filters.startDate && !filters.endDate && !filters.soldierName && !filters.location) {
        req.db.getAllSignOuts((err, signouts) => {
            if (err) {
                console.error('Error fetching signouts:', err);
                return res.status(500).json({ error: 'Failed to fetch signouts' });
            }
            res.json(signouts);
        });
    } else {
        req.db.getFilteredSignOuts(filters, (err, signouts) => {
            if (err) {
                console.error('Error fetching filtered signouts:', err);
                return res.status(500).json({ error: 'Failed to fetch filtered signouts' });
            }
            res.json(signouts);
        });
    }
    
});

// Get all group members for specific sign-out IDs
router.post('/groups', requireAuth, requireSystemAuth, (req, res) => {
    const { signOutIds } = req.body;
    
    if (!signOutIds || !Array.isArray(signOutIds) || signOutIds.length === 0) {
        return res.status(400).json({ error: 'Sign-out IDs array is required' });
    }
    
    req.db.getSignOutsByIds(signOutIds, (err, signouts) => {
        if (err) {
            console.error('Error fetching signouts by IDs:', err);
            return res.status(500).json({ error: 'Failed to fetch group members' });
        }
        res.json(signouts);
    });
});

// Get signout by ID
router.get('/:id', requireBothAuth, (req, res) => {
    const signoutId = req.params.id;
    
    req.db.getSignOutById(signoutId, (err, signout) => {
        if (err) {
            console.error('Error fetching signout:', err);
            return res.status(500).json({ error: 'Failed to fetch signout' });
        }
        
        if (!signout) {
            return res.status(404).json({ error: 'Sign-out not found' });
        }
        
        res.json(signout);
    });
});

// Create new signout
router.post('/', [requireBothAuth, ...validateSignOut], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        return res.status(400).json({ 
            error: 'Validation failed',
            details: errors.array() 
        });
    }

    const { soldiers, location, estimatedReturn, notes, emergencyContact, vehicleInfo, pin } = req.body;

    // Verify PIN
    req.db.verifyUserPin(req.session.user.id, pin, (err, isValid) => {
        if (err) {
            console.error('PIN verification error:', err);
            return res.status(500).json({ error: 'PIN verification failed' });
        }
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        requester = req.session.user.rank + " " + req.session.user.full_name

        const signoutData = {
            soldiers: soldiers.map(soldier => ({
                rank: soldier.rank || '',
                firstName: soldier.firstName ? soldier.firstName.trim() : '',
                lastName: soldier.lastName ? soldier.lastName.trim() : '',
                middleName: soldier.middleName || soldier.middleInitial || '',
                dodId: soldier.dodId ? soldier.dodId.trim() : null
            })),
            destination: location.trim(),
            estimatedReturn: estimatedReturn ? new Date(estimatedReturn) : null,
            notes: notes?.trim() || '',
            emergencyContact: emergencyContact?.trim() || '',
            vehicleInfo: vehicleInfo?.trim() || '',
            signed_out_by_id: req.session.user.id,
            signOutTime: new Date(),
            signed_out_by_name: requester
        };

        req.db.addSignOut(signoutData, (err, signoutId) => {
            if (err) {
                console.error('Error creating signout:', err);
                return res.status(500).json({ error: 'Failed to create sign-out' });
            }

            res.status(201).json({ 
                success: true, 
                message: 'Sign-out created successfully',
                signoutId: signoutId
            });
        });
    });
});

// Sign in soldiers
router.patch('/:id/signin', [
    requireBothAuth,
    body('pin').isLength({ min: 4 }).withMessage('PIN is required'),
    body('notes').optional().trim()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: errors.array(),
            errors: errors.array() 
        });
    }

    const signoutId = req.params.id;
    const { pin, notes } = req.body;

    // Verify PIN
    req.db.verifyUserPin(req.session.user.id, pin, (err, isValid) => {
        if (err) {
            console.error('PIN verification error:', err);
            return res.status(500).json({ error: 'PIN verification failed' });
        }
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        
        var signedInBy = req.session.user.id
        var signedInByName = req.session.user.rank + " " + req.session.user.full_name
            
    

        req.db.signInSoldiers(signoutId, signedInBy, signedInByName, (err, result) => {
            if (err) {
                console.error('Error signing in soldiers:', err);
                return res.status(500).json({ error: 'Failed to sign in soldiers' });
            }

            if (!result.success) {
                return res.status(400).json({ error: result.message });
            }

            res.json({ 
                success: true, 
                message: 'Soldiers signed in successfully',
                duration: result.duration
            });
        });
    });
});

// Update signout
router.patch('/:id', [
    requireBothAuth,
    body('pin').isLength({ min: 4 }).withMessage('PIN is required'),
    body('destination').optional().trim(),
    body('estimatedReturn').optional().isISO8601(),
    body('notes').optional().trim(),
    body('emergencyContact').optional().trim(),
    body('vehicleInfo').optional().trim()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const signoutId = req.params.id;
    const { pin, destination, estimatedReturn, notes, emergencyContact, vehicleInfo } = req.body;

    // Verify PIN
    req.db.verifyUserPin(req.session.user.id, pin, (err, isValid) => {
        if (err) {
            console.error('PIN verification error:', err);
            return res.status(500).json({ error: 'PIN verification failed' });
        }
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        const updateData = {};
        if (destination) updateData.destination = destination.trim();
        if (estimatedReturn) updateData.estimatedReturn = new Date(estimatedReturn);
        if (notes !== undefined) updateData.notes = notes.trim();
        if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact.trim();
        if (vehicleInfo !== undefined) updateData.vehicleInfo = vehicleInfo.trim();

        req.db.updateSignout(signoutId, updateData, (err, result) => {
            if (err) {
                console.error('Error updating signout:', err);
                return res.status(500).json({ error: 'Failed to update sign-out' });
            }

            if (!result.success) {
                return res.status(400).json({ error: result.message });
            }

            res.json({ 
                success: true, 
                message: 'Sign-out updated successfully'
            });
        });
    });
});

// Delete signout
router.delete('/:id', [
    requireBothAuth,
    body('pin').isLength({ min: 4 }).withMessage('PIN is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const signoutId = req.params.id;
    const { pin } = req.body;

    // Verify PIN
    req.db.verifyUserPin(req.session.user.id, pin, (err, isValid) => {
        if (err) {
            console.error('PIN verification error:', err);
            return res.status(500).json({ error: 'PIN verification failed' });
        }
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        req.db.deleteSignout(signoutId, (err, result) => {
            if (err) {
                console.error('Error deleting signout:', err);
                return res.status(500).json({ error: 'Failed to delete sign-out' });
            }

            if (!result.success) {
                return res.status(400).json({ error: result.message });
            }

            res.json({ 
                success: true, 
                message: 'Sign-out deleted successfully'
            });
        });
    });
});

// Get overdue signouts
router.get('/reports/overdue', requireBothAuth, (req, res) => {
    req.db.getOverdueSignouts((err, signouts) => {
        if (err) {
            console.error('Error fetching overdue signouts:', err);
            return res.status(500).json({ error: 'Failed to fetch overdue sign-outs' });
        }
        res.json(signouts);
    });
});

// Get current signouts
router.get('/reports/current', requireBothAuth, (req, res) => {
    req.db.getCurrentSignOuts((err, signouts) => {
        if (err) {
            console.error('Error fetching current signouts:', err);
            return res.status(500).json({ error: 'Failed to fetch current sign-outs', details: err.message });
        }
        res.json(signouts);
    });
});


// Fetch filtered logs
router.get('/logs', requireBothAuth, (req, res) => {
    const { startDate, endDate, soldierName, location, status } = req.query;

    const filters = {
        startDate: startDate || null,
        endDate: endDate || null,
        soldierName: soldierName || null,
        location: location || null,
        status: status || null
    };

    req.db.getFilteredSignOuts(filters, (err, signouts) => {
        if (err) {
            console.error('Error fetching filtered logs:', err);
            return res.status(500).json({ error: 'Failed to fetch logs' });
        }
        res.json(signouts);
    });
});

// Export logs to CSV
router.get('/export/logs', requireBothAuth, (req, res) => {
    const { startDate, endDate, soldierName, location, status } = req.query;

    const filters = {
        startDate: startDate || null,
        endDate: endDate || null,
        soldierName: soldierName || null,
        location: location || null,
        status: status || null
    };

    req.db.exportSignoutsCSV(filters, (req.session.user.rank + " " + req.session.user.full_name), (err, csvData) => {
        if (err) {
            console.error('Error exporting logs to CSV:', err);
            return res.status(500).json({ error: 'Failed to export logs' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=signout-logs-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvData);
    });
});

module.exports = router;
