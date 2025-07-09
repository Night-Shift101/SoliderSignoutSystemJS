const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth, requireBothAuth, verifyPin,requireSystemAuth, handleValidationErrors } = require('../middleware/auth');
const router = express.Router();
router.get('/', requireSystemAuth, async (req, res) => {
    try {
        req.db.getAllUsersExtended((err, users) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch users' });
            }
            res.json(users);
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.get('/:id', 
    requireBothAuth,
    param('id').isInt({ min: 1 }),
    handleValidationErrors,
    async (req, res) => {

        try {
            req.db.getUserById(req.params.id, (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch user' });
                }
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                res.json(user);
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    }
);

// Add new user
router.post('/',
    requireBothAuth,
    [
        body('rank').isLength({ min: 1 }).withMessage('Rank is required'),
        body('lastName').isLength({ min: 1 }).withMessage('Last name is required'),
        body('pin').isLength({ min: 4 }).withMessage('PIN must be at least 4 characters')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { rank, lastName, pin } = req.body;
            
            // Create a username from rank and last name
            const username = `${rank.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}`;
            
            const userData = {
                username,
                password: 'defaultpass', // Default password, should be changed
                pin,
                rank,
                firstName: '',
                lastName
            };
            
            req.db.createUser(userData, (err, result) => {
                if (err) {
                    console.error('Add user error:', err);
                    if (err.message && err.message.includes('already exists')) {
                        return res.status(400).json({ error: 'A user with this name already exists' });
                    }
                    return res.status(500).json({ error: 'Failed to create user' });
                }
                res.status(201).json({ 
                    message: 'User created successfully',
                    userId: result.id 
                });
            });
        } catch (error) {
            console.error('Add user error:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
);

// Update user PIN
router.patch('/:id/pin',
    requireBothAuth,
    [
        param('id').isInt({ min: 1 }),
        body('systemPassword').isLength({ min: 1 }).withMessage('System password is required'),
        body('newPin').isLength({ min: 4 }).withMessage('PIN must be at least 4 characters')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const userId = parseInt(req.params.id, 10);
            const { systemPassword, newPin } = req.body;
            
            req.db.getUserById(userId, (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch user' });
                }
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                if (user.username === 'admin') {
                    return res.status(400).json({ error: 'Cannot change admin PIN through this endpoint. Use admin credentials endpoint.' });
                }
                
                req.db.verifySystemPassword(systemPassword, (err, result) => {
                    if (err) {
                        console.error('System password verification error:', err);
                        return res.status(500).json({ error: 'Authentication failed' });
                    }
                    
                    if (!result.success) {
                        return res.status(401).json({ error: 'Invalid system password' });
                    }
                    
                    req.db.changeUserPinAsAdmin(userId, newPin, req.session.user.id, (err, updateResult) => {
                        if (err) {
                            console.error('Update PIN error:', err);
                            return res.status(500).json({ error: 'Failed to update PIN' });
                        }
                        res.json({ message: 'PIN updated successfully' });
                    });
                });
            });
        } catch (error) {
            console.error('Update PIN error:', error);
            res.status(500).json({ error: 'Failed to update PIN' });
        }
    }
);

// Delete user
router.delete('/:id',
    requireBothAuth,
    [
        param('id').isInt({ min: 1 }),
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const userId = parseInt(req.params.id, 10);
            const { systemPassword } = req.body;
            
            // Prevent deleting own account
            if (userId === req.session.user.id) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }
            
            req.db.getUserById(userId, (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch user' });
                }
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                if (user.username === 'admin') {
                    return res.status(400).json({ error: 'Cannot delete admin account' });
                }
                
                req.db.deleteUserAsAdmin(userId, req.session.user.id, (err, deleteResult) => {
                    if (err) {
                        console.error('Delete user error:', err);
                        return res.status(500).json({ error: 'Failed to delete user' });
                    }
                    res.json({ message: 'User deleted successfully' });
                });
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    }
);

router.patch('/:id/activate',
    requireBothAuth,
    param('id').isInt({ min: 1 }),
    handleValidationErrors,
    async (req, res) => {
        try {
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId)) {
                return res.status(400).json({ error: 'Invalid user ID' });
            }
            
            req.db.getUserById(userId, (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch user' });
                }
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                if (user.is_active) {
                    return res.status(400).json({ error: 'User is already active' });
                }

                req.db.updateUserStatus(userId, true, (err, result) => {
                    if (err) {
                        console.error('Activate user error:', err);
                        return res.status(500).json({ error: 'Failed to activate user' });
                    }
                    res.json({ message: 'User activated successfully' });
                });
            });
        } catch (error) {
            console.error('Activate user error:', error);
            res.status(500).json({ error: 'Failed to activate user' });
        }
    }
);

router.patch('/:id/deactivate',
    requireBothAuth,
    param('id').isInt({ min: 1 }),
    handleValidationErrors,
    async (req, res) => {

        try {
            const userId = parseInt(req.params.id, 10);
            
            if (userId === req.session.user.id) {
                return res.status(400).json({ error: 'Cannot deactivate your own account' });
            }

            req.db.getUserById(userId, (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch user' });
                }
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                if (!user.is_active) {
                    return res.status(400).json({ error: 'User is already inactive' });
                }
                if (user.username === 'admin') {
                    return res.status(400).json({ error: 'Cannot deactivate admin account' });
                }

                req.db.updateUserStatus(userId, false, (err, result) => {
                    if (err) {
                        console.error('Deactivate user error:', err);
                        return res.status(500).json({ error: 'Failed to deactivate user' });
                    }
                    res.json({ message: 'User deactivated successfully' });
                });
            });
        } catch (error) {
            console.error('Deactivate user error:', error);
            res.status(500).json({ error: 'Failed to deactivate user' });
        }
    }
);

router.patch('/admin/credentials',
    requireBothAuth,
    [
        body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
        body('newPassword').isLength({ min: 6 }).withMessage('New password is required and must be at least 6 characters'),
        body('newPin').isLength({ min: 4 }).withMessage('New PIN is required and must be at least 4 characters')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { currentPassword, newPassword, newPin } = req.body;

            req.db.getUserByUsername('admin', (err, adminUser) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch admin user' });
                }
                
                if (!adminUser) {
                    return res.status(404).json({ error: 'Admin user not found' });
                }

                req.db.verifyUserPassword(adminUser.id, currentPassword, (err, isValid) => {
                    if (err) {
                        return res.status(500).json({ error: 'Authentication failed' });
                    }
                    
                    if (!isValid) {
                        return res.status(401).json({ error: 'Current password is incorrect' });
                    }

                    const updates = { password: newPassword, pin: newPin };

                    req.db.updateAdminCredentials(adminUser.id, updates, (err, result) => {
                        if (err) {
                            console.error('Update admin credentials error:', err);
                            return res.status(500).json({ error: 'Failed to update credentials' });
                        }
                        res.json({ message: 'Admin credentials updated successfully' });
                    });
                });
            });
        } catch (error) {
            console.error('Update admin credentials error:', error);
            res.status(500).json({ error: 'Failed to update credentials' });
        }
    }
);

module.exports = router;
