const express = require('express');
const router = express.Router();

module.exports = (database) => {
    
    router.get('/:userId/:settingKey', async (req, res) => {
        try {
            const { userId, settingKey } = req.params;
            
            database.getUserPreference(userId, settingKey, (err, value) => {
                if (err) {
                    console.error('Error getting user preference:', err);
                    return res.status(500).json({ error: 'Failed to get user preference' });
                }
                
                res.json({ [settingKey]: value });
            });
        } catch (error) {
            console.error('Error in get preference route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.get('/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            
            database.getUserPreferences(userId, (err, preferences) => {
                if (err) {
                    console.error('Error getting user preferences:', err);
                    return res.status(500).json({ error: 'Failed to get user preferences' });
                }
                
                res.json(preferences);
            });
        } catch (error) {
            console.error('Error in get preferences route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.post('/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { setting_key, setting_value } = req.body;
            
            if (!setting_key || setting_value === undefined) {
                return res.status(400).json({ error: 'setting_key and setting_value are required' });
            }
            
            database.setUserPreference(userId, setting_key, setting_value, (err, result) => {
                if (err) {
                    console.error('Error setting user preference:', err);
                    return res.status(500).json({ error: 'Failed to set user preference' });
                }
                
                res.json({ success: true, message: 'Preference saved successfully' });
            });
        } catch (error) {
            console.error('Error in set preference route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.delete('/:userId/:settingKey', async (req, res) => {
        try {
            const { userId, settingKey } = req.params;
            
            database.deleteUserPreference(userId, settingKey, (err, result) => {
                if (err) {
                    console.error('Error deleting user preference:', err);
                    return res.status(500).json({ error: 'Failed to delete user preference' });
                }
                
                res.json({ success: true, deleted: result.deleted });
            });
        } catch (error) {
            console.error('Error in delete preference route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.delete('/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            
            database.deleteAllUserPreferences(userId, (err, result) => {
                if (err) {
                    console.error('Error deleting all user preferences:', err);
                    return res.status(500).json({ error: 'Failed to delete user preferences' });
                }
                
                res.json({ success: true, deleted: result.deleted });
            });
        } catch (error) {
            console.error('Error in delete all preferences route:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};
