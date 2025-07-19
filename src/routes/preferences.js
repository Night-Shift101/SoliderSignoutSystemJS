const express = require('express');
const { ErrorCategory, ErrorSeverity } = require('../utils/error-handler');
const router = express.Router();

module.exports = (database) => {
    
    router.get('/:userId/:settingKey', async (req, res) => {
        try {
            const { userId, settingKey } = req.params;
            
            database.getUserPreference(userId, settingKey, (err, value) => {
                if (err) {
                    console.error('Error getting user preference:', err);
                    const errorResponse = req.errorHandler.databaseError(err, 'Get user preference');
                    return res.status(500).json(errorResponse);
                }
                
                const successResponse = req.errorHandler.success({ [settingKey]: value }, 'User preference retrieved successfully');
                res.json(successResponse);
            });
        } catch (error) {
            console.error('Error in get preference route:', error);
            const errorResponse = req.errorHandler.failure('Internal server error', {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.HIGH,
                originalError: error
            });
            res.status(500).json(errorResponse);
        }
    });

    router.get('/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            
            database.getUserPreferences(userId, (err, preferences) => {
                if (err) {
                    console.error('Error getting user preferences:', err);
                    const errorResponse = req.errorHandler.databaseError(err, 'Get user preferences');
                    return res.status(500).json(errorResponse);
                }
                
                const successResponse = req.errorHandler.success(preferences, 'User preferences retrieved successfully');
                res.json(successResponse);
            });
        } catch (error) {
            console.error('Error in get preferences route:', error);
            const errorResponse = req.errorHandler.failure('Internal server error', {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.HIGH,
                originalError: error
            });
            res.status(500).json(errorResponse);
        }
    });

    router.post('/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { setting_key, setting_value } = req.body;
            
            if (!setting_key || setting_value === undefined) {
                const errorResponse = req.errorHandler.validationError('setting_key and setting_value are required');
                return res.status(400).json(errorResponse);
            }
            
            database.setUserPreference(userId, setting_key, setting_value, (err, result) => {
                if (err) {
                    console.error('Error setting user preference:', err);
                    const errorResponse = req.errorHandler.databaseError(err, 'Set user preference');
                    return res.status(500).json(errorResponse);
                }
                
                const successResponse = req.errorHandler.success(null, 'Preference saved successfully');
                res.json(successResponse);
            });
        } catch (error) {
            console.error('Error in set preference route:', error);
            const errorResponse = req.errorHandler.failure('Internal server error', {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.HIGH,
                originalError: error
            });
            res.status(500).json(errorResponse);
        }
    });

    router.delete('/:userId/:settingKey', async (req, res) => {
        try {
            const { userId, settingKey } = req.params;
            
            database.deleteUserPreference(userId, settingKey, (err, result) => {
                if (err) {
                    console.error('Error deleting user preference:', err);
                    const errorResponse = req.errorHandler.databaseError(err, 'Delete user preference');
                    return res.status(500).json(errorResponse);
                }
                
                const successResponse = req.errorHandler.success({ deleted: result.deleted }, 'User preference deleted successfully');
                res.json(successResponse);
            });
        } catch (error) {
            console.error('Error in delete preference route:', error);
            const errorResponse = req.errorHandler.failure('Internal server error', {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.HIGH,
                originalError: error
            });
            res.status(500).json(errorResponse);
        }
    });

    router.delete('/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            
            database.deleteAllUserPreferences(userId, (err, result) => {
                if (err) {
                    console.error('Error deleting all user preferences:', err);
                    const errorResponse = req.errorHandler.databaseError(err, 'Delete all user preferences');
                    return res.status(500).json(errorResponse);
                }
                
                const successResponse = req.errorHandler.success({ deleted: result.deleted }, 'All user preferences deleted successfully');
                res.json(successResponse);
            });
        } catch (error) {
            console.error('Error in delete all preferences route:', error);
            const errorResponse = req.errorHandler.failure('Internal server error', {
                category: ErrorCategory.SYSTEM,
                severity: ErrorSeverity.HIGH,
                originalError: error
            });
            res.status(500).json(errorResponse);
        }
    });

    return router;
};
