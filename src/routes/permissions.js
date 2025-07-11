const express = require('express');
const router = express.Router();
const { requireAuth, requireBothAuth } = require('../middleware/auth');

// Permission middleware helper
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            const userId = req.session?.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const hasPermission = await req.permissionsMiddleware.hasPermission(userId, permission);
            if (!hasPermission) {
                return res.status(403).json({ 
                    error: `Insufficient permissions: ${permission} required`,
                    code: 'INSUFFICIENT_PERMISSIONS'
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ error: 'Permission check failed' });
        }
    };
};

/**
 * Get all available permissions
 * GET /api/permissions
 */
router.get('/', requireAuth, requirePermission('manage_permissions'), async (req, res) => {
    try {
        const permissions = await req.db.getAllPermissions();
        res.json({
            success: true,
            permissions: permissions
        });
    } catch (error) {
        console.error('Error getting permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve permissions'
        });
    }
});

/**
 * Get permissions for a specific user
 * GET /api/permissions/user/:userId
 */
router.get('/user/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { detailed } = req.query;

        let userPermissions;
        if (detailed === 'true') {
            userPermissions = await req.db.getUserPermissionsDetailed(parseInt(userId));
        } else {
            userPermissions = await req.db.getUserPermissions(parseInt(userId));
        }

        res.json({
            success: true,
            userId: parseInt(userId),
            permissions: userPermissions
        });
    } catch (error) {
        console.error('Error getting user permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve user permissions'
        });
    }
});

/**
 * Get all users with their permissions
 * GET /api/permissions/users
 */
router.get('/users', requireAuth, requirePermission('manage_permissions'), async (req, res) => {
    try {
        const usersWithPermissions = await req.db.getAllUsersWithPermissions();
        res.json({
            success: true,
            users: usersWithPermissions
        });
    } catch (error) {
        console.error('Error getting users with permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve users with permissions'
        });
    }
});

/**
 * Check if user has specific permission(s)
 * POST /api/permissions/check
 */
router.post('/check', async (req, res) => {
    try {
        const { userId, permissions, logic = 'AND' } = req.body;

        if (!userId || !permissions) {
            return res.status(400).json({
                success: false,
                error: 'userId and permissions are required'
            });
        }

        const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
        let hasAccess = false;

        if (logic.toUpperCase() === 'OR') {
            hasAccess = await req.db.hasAnyPermission(userId, permissionArray);
        } else {
            hasAccess = await req.db.hasAllPermissions(userId, permissionArray);
        }

        res.json({
            success: true,
            userId: userId,
            permissions: permissionArray,
            logic: logic,
            hasAccess: hasAccess
        });
    } catch (error) {
        console.error('Error checking permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check permissions'
        });
    }
});

/**
 * Grant permission(s) to user
 * POST /api/permissions/grant
 */
router.post('/grant', async (req, res) => {
    try {
        const { userId, permissions, grantedBy } = req.body;

        if (!userId || !permissions || !grantedBy) {
            return res.status(400).json({
                success: false,
                error: 'userId, permissions, and grantedBy are required'
            });
        }

        const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
        let success = false;

        if (permissionArray.length === 1) {
            success = await req.db.grantPermission(userId, permissionArray[0], grantedBy);
        } else {
            success = await req.db.grantMultiplePermissions(userId, permissionArray, grantedBy);
        }

        if (success) {
            res.json({
                success: true,
                message: `Permissions granted successfully`,
                userId: userId,
                permissions: permissionArray,
                grantedBy: grantedBy
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to grant permissions'
            });
        }
    } catch (error) {
        console.error('Error granting permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to grant permissions'
        });
    }
});

/**
 * Revoke permission(s) from user
 * POST /api/permissions/revoke
 */
router.post('/revoke', async (req, res) => {
    try {
        const { userId, permissions } = req.body;

        if (!userId || !permissions) {
            return res.status(400).json({
                success: false,
                error: 'userId and permissions are required'
            });
        }

        const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
        let success = false;

        if (permissionArray.length === 1) {
            success = await req.db.revokePermission(userId, permissionArray[0]);
        } else {
            success = await req.db.revokeMultiplePermissions(userId, permissionArray);
        }

        if (success) {
            res.json({
                success: true,
                message: `Permissions revoked successfully`,
                userId: userId,
                permissions: permissionArray
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to revoke permissions'
            });
        }
    } catch (error) {
        console.error('Error revoking permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to revoke permissions'
        });
    }
});

/**
 * Set user permissions (replace all existing)
 * PUT /api/permissions/user/:userId
 */
router.put('/user/:userId', requireBothAuth, requirePermission('manage_permissions'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions, grantedBy } = req.body;

        if (!permissions || !grantedBy) {
            return res.status(400).json({
                success: false,
                error: 'permissions and grantedBy are required'
            });
        }

        const permissionArray = Array.isArray(permissions) ? permissions : [];
        const success = await req.db.setUserPermissions(parseInt(userId), permissionArray, grantedBy);

        if (success) {
            res.json({
                success: true,
                message: `User permissions updated successfully`,
                userId: parseInt(userId),
                permissions: permissionArray,
                grantedBy: grantedBy
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to update user permissions'
            });
        }
    } catch (error) {
        console.error('Error setting user permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user permissions'
        });
    }
});

/**
 * Grant all permissions to user (admin setup)
 * POST /api/permissions/grant-all
 */
router.post('/grant-all', async (req, res) => {
    try {
        const { userId, grantedBy } = req.body;

        if (!userId || !grantedBy) {
            return res.status(400).json({
                success: false,
                error: 'userId and grantedBy are required'
            });
        }

        const permissionsGranted = await req.db.grantAllPermissions(userId, grantedBy);

        res.json({
            success: true,
            message: `All permissions granted successfully`,
            userId: userId,
            permissionsGranted: permissionsGranted,
            grantedBy: grantedBy
        });
    } catch (error) {
        console.error('Error granting all permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to grant all permissions'
        });
    }
});

/**
 * Grant basic permissions to user (new user setup)
 * POST /api/permissions/grant-basic
 */
router.post('/grant-basic', async (req, res) => {
    try {
        const { userId, grantedBy } = req.body;

        if (!userId || !grantedBy) {
            return res.status(400).json({
                success: false,
                error: 'userId and grantedBy are required'
            });
        }

        const success = await req.db.grantBasicPermissions(userId, grantedBy);

        if (success) {
            res.json({
                success: true,
                message: `Basic permissions granted successfully`,
                userId: userId,
                grantedBy: grantedBy
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to grant basic permissions'
            });
        }
    } catch (error) {
        console.error('Error granting basic permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to grant basic permissions'
        });
    }
});

/**
 * Create new permission
 * POST /api/permissions
 */
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Permission name is required'
            });
        }

        const permission = await req.db.createPermission(name, description || '');

        if (permission) {
            res.status(201).json({
                success: true,
                message: 'Permission created successfully',
                permission: permission
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to create permission'
            });
        }
    } catch (error) {
        console.error('Error creating permission:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create permission'
        });
    }
});

/**
 * Update permission
 * PUT /api/permissions/:permissionId
 */
router.put('/:permissionId', async (req, res) => {
    try {
        const { permissionId } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Permission name is required'
            });
        }

        const success = await req.db.updatePermission(parseInt(permissionId), name, description || '');

        if (success) {
            res.json({
                success: true,
                message: 'Permission updated successfully',
                permissionId: parseInt(permissionId)
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to update permission'
            });
        }
    } catch (error) {
        console.error('Error updating permission:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update permission'
        });
    }
});

/**
 * Delete permission
 * DELETE /api/permissions/:permissionId
 */
router.delete('/:permissionId', async (req, res) => {
    try {
        const { permissionId } = req.params;

        const success = await req.db.deletePermission(parseInt(permissionId));

        if (success) {
            res.json({
                success: true,
                message: 'Permission deleted successfully',
                permissionId: parseInt(permissionId)
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to delete permission'
            });
        }
    } catch (error) {
        console.error('Error deleting permission:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete permission'
        });
    }
});

/**
 * Get permission statistics
 * GET /api/permissions/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await req.db.getPermissionStats();
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error getting permission stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve permission statistics'
        });
    }
});

/**
 * Check permissions system setup
 * GET /api/permissions/setup
 */
router.get('/setup', async (req, res) => {
    try {
        const setupInfo = await req.db.checkPermissionsSetup();
        res.json({
            success: true,
            setup: setupInfo
        });
    } catch (error) {
        console.error('Error checking permissions setup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check permissions setup'
        });
    }
});

module.exports = router;
