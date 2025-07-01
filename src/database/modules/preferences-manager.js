class PreferencesManager {
    constructor(db) {
        this.db = db;
    }

    getUserPreference(userId, settingKey, callback) {
        const query = 'SELECT setting_value FROM user_preferences WHERE user_id = ? AND setting_key = ?';
        this.db.get(query, [userId, settingKey], (err, row) => {
            if (err) return callback(err, null);
            callback(null, row ? row.setting_value : null);
        });
    }

    setUserPreference(userId, settingKey, settingValue, callback) {
        const query = `
            INSERT OR REPLACE INTO user_preferences (user_id, setting_key, setting_value, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `;
        this.db.run(query, [userId, settingKey, settingValue], function(err) {
            if (err) return callback(err, null);
            callback(null, { success: true });
        });
    }

    getUserPreferences(userId, callback) {
        const query = 'SELECT setting_key, setting_value FROM user_preferences WHERE user_id = ?';
        this.db.all(query, [userId], (err, rows) => {
            if (err) return callback(err, null);
            
            const preferences = {};
            rows.forEach(row => {
                preferences[row.setting_key] = row.setting_value;
            });
            
            callback(null, preferences);
        });
    }

    deleteUserPreference(userId, settingKey, callback) {
        const query = 'DELETE FROM user_preferences WHERE user_id = ? AND setting_key = ?';
        this.db.run(query, [userId, settingKey], function(err) {
            if (err) return callback(err, null);
            callback(null, { success: true, deleted: this.changes > 0 });
        });
    }

    deleteAllUserPreferences(userId, callback) {
        const query = 'DELETE FROM user_preferences WHERE user_id = ?';
        this.db.run(query, [userId], function(err) {
            if (err) return callback(err, null);
            callback(null, { success: true, deleted: this.changes });
        });
    }
}

module.exports = PreferencesManager;
