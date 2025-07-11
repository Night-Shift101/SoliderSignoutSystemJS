const bcrypt = require('bcrypt');

class UserManager {
    constructor(db, permissionsManager = null) {
        this.db = db;
        this.permissionsManager = permissionsManager;
    }

    createDefaultAdmin() {
        this.db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
            if (err) {
                console.error('Error checking for admin user:', err.message);
                return;
            }
            
            if (!row) {
                console.log('⚠️  No admin user found in database.');
                console.log('   Please run "node setup.js" to initialize the system.');
            }
        });
    }
    
    verifySystemPassword(password, callback) {
        const query = 'SELECT password_hash FROM users WHERE username = "admin" AND is_active = 1';
        
        this.db.get(query, [], (err, user) => {
            if (err) return callback(err, null);
            if (!user) return callback(null, { success: false, message: 'System access not configured' });
            
            bcrypt.compare(password, user.password_hash, (err, match) => {
                if (err) return callback(err, null);
                callback(null, { success: match, message: match ? 'System authenticated' : 'Invalid system password' });
            });
        });
    }
    
    getAllUsers(callback) {
        const query = 'SELECT id, username, rank, full_name FROM users WHERE is_active = 1 ORDER BY id ASC';
        
        this.db.all(query, [], (err, users) => {
            if (err) return callback(err, null);
            callback(null, users);
        });
    }
    
    verifyUserPinById(userId, pin, callback) {
        const query = 'SELECT pin_hash, rank, full_name FROM users WHERE id = ? AND is_active = 1';
        
        this.db.get(query, [userId], (err, user) => {
            if (err) return callback(err, null);
            if (!user) return callback(null, { success: false, message: 'User not found' });
            
            bcrypt.compare(pin, user.pin_hash, (err, match) => {
                if (err) return callback(err, null);
                callback(null, { 
                    success: match, 
                    user: match ? { id: userId, rank: user.rank, full_name: user.full_name } : null,
                    message: match ? 'PIN verified' : 'Invalid PIN'
                });
            });
        });
    }

    authenticateUser(username, password, callback) {
        const query = 'SELECT * FROM users WHERE username = ? AND is_active = 1';
        
        this.db.get(query, [username], (err, user) => {
            if (err) return callback(err, null);
            if (!user) return callback(null, { success: false, message: 'User not found' });
            
            bcrypt.compare(password, user.password_hash, (err, match) => {
                if (err) return callback(err, null);
                if (!match) return callback(null, { success: false, message: 'Invalid password' });
                
                this.db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
                
                callback(null, { 
                    success: true, 
                    user: { 
                        id: user.id, 
                        username: user.username, 
                        rank: user.rank, 
                        full_name: user.full_name 
                    } 
                });
            });
        });
    }

    verifyUserPin(userId, pin, callback) {
        const query = 'SELECT pin_hash FROM users WHERE id = ? AND is_active = 1';
        
        this.db.get(query, [userId], (err, row) => {
            if (err) return callback(err, null);
            if (!row) return callback(null, false);
            
            bcrypt.compare(pin, row.pin_hash, callback);
        });
    }

    createUser(userData, callback) {
        const { username, password, pin, rank, firstName, lastName } = userData;
        
        this.db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                return callback(err);
            }
            
            if (row) {
                return callback(new Error('Username already exists'));
            }
            
            const passwordHash = bcrypt.hashSync(password, 10);
            const pinHash = bcrypt.hashSync(pin, 10);
            const fullName = `${firstName} ${lastName}`;
            
            const insertQuery = `
                INSERT INTO users (username, password_hash, pin_hash, rank, full_name) 
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const self = this; // Store reference to this for use in callback
            
            this.db.run(insertQuery, [username, passwordHash, pinHash, rank, fullName], function(err) {
                if (err) {
                    return callback(err);
                }
                
                const newUserId = this.lastID;
                const userResult = {
                    id: newUserId,
                    username,
                    rank,
                    full_name: fullName
                };
                
                // Assign default permissions to the new user asynchronously
                if (self.permissionsManager) {
                    self.permissionsManager.assignDefaultPermissions(newUserId, 1) // Granted by admin (ID 1)
                        .then(() => {
                            console.log(`Default permissions assigned to new user: ${username}`);
                        })
                        .catch(permError => {
                            console.error('Error assigning default permissions to new user:', permError);
                            // Continue with user creation even if permission assignment fails
                        });
                }
                
                callback(null, userResult);
            });
        });
    }
    
    changeUserPin(userId, currentPin, newPin, callback) {
        this.verifyUserPin(userId, currentPin, (err, isValid) => {
            if (err) {
                return callback(err);
            }
            
            if (!isValid) {
                return callback(new Error('Current PIN is incorrect'));
            }
            
            const newPinHash = bcrypt.hashSync(newPin, 10);
            
            this.db.run(
                'UPDATE users SET pin_hash = ? WHERE id = ?',
                [newPinHash, userId],
                function(err) {
                    if (err) {
                        return callback(err);
                    }
                    
                    if (this.changes === 0) {
                        return callback(new Error('User not found'));
                    }
                    
                    callback(null, { success: true });
                }
            );
        });
    }
    
    changeUserPinAsAdmin(userId, newPin, adminUserId, callback) {
        this.db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
            if (err) {
                return callback(err);
            }
            
            if (!user) {
                return callback(new Error('User not found'));
            }
            
            const newPinHash = bcrypt.hashSync(newPin, 10);
            
            this.db.run(
                'UPDATE users SET pin_hash = ? WHERE id = ?',
                [newPinHash, userId],
                function(err) {
                    if (err) {
                        return callback(err);
                    }
                    
                    callback(null, { success: true });
                }
            );
        });
    }
    
    deleteUser(userId, userPin, systemPassword, callback) {
        this.verifySystemPassword(systemPassword, (err, systemResult) => {
            if (err) {
                return callback(err);
            }
            
            if (!systemResult.success) {
                return callback(new Error('Invalid system password'));
            }
            
            this.verifyUserPin(userId, userPin, (err, pinValid) => {
                if (err) {
                    return callback(err);
                }
                
                if (!pinValid) {
                    return callback(new Error('Invalid user PIN'));
                }
                
                this.db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
                    if (err) {
                        return callback(err);
                    }
                    
                    if (!user) {
                        return callback(new Error('User not found'));
                    }
                    
                    if (user.username === 'admin') {
                        return callback(new Error('Cannot delete admin user'));
                    }
                    
                    this.db.serialize(() => {
                        this.db.run('BEGIN TRANSACTION');
                        
                        this.db.run(
                            'UPDATE signouts SET signed_out_by_name = signed_out_by_name || " (deleted user)" WHERE signed_out_by_id = ?',
                            [userId],
                            (err) => {
                                if (err) {
                                    this.db.run('ROLLBACK');
                                    return callback(err);
                                }
                                
                                this.db.run(
                                    'UPDATE signouts SET signed_in_by_name = signed_in_by_name || " (deleted user)" WHERE signed_in_by_id = ?',
                                    [userId],
                                    (err) => {
                                        if (err) {
                                            this.db.run('ROLLBACK');
                                            return callback(err);
                                        }
                                        
                                        this.db.run(
                                            'DELETE FROM users WHERE id = ?',
                                            [userId],
                                            function(err) {
                                                if (err) {
                                                    this.db.run('ROLLBACK');
                                                    return callback(err);
                                                }
                                                
                                                this.db.run('COMMIT', (err) => {
                                                    if (err) {
                                                        this.db.run('ROLLBACK');
                                                        return callback(err);
                                                    }
                                                    
                                                    callback(null, { success: true });
                                                });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    });
                });
            });
        });
    }
    
    deleteUserAsAdmin(userId, adminUserId, callback) {
        this.db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
            if (err) {
                return callback(err);
            }
            
            if (!user) {
                return callback(new Error('User not found'));
            }
            
            if (user.username === 'admin') {
                return callback(new Error('Cannot delete admin user'));
            }
            
            this.db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    return callback(err);
                }
                
                this.db.run(
                    'DELETE FROM users WHERE id = ?',
                    [userId],
                    (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            return callback(err);
                        }
                        
                        this.db.run('COMMIT', (err) => {
                            if (err) {
                                this.db.run('ROLLBACK');
                                return callback(err);
                            }
                            
                            callback(null, { success: true });
                        });
                    }
                );
            });
        });
    }

    getAllUsersExtended(callback) {
        const query = `SELECT id, username, rank, full_name, is_active, created_at, last_login FROM users ORDER BY id ASC`;
        this.db.all(query, [], (err, rows) => {
            if (err) {
                return callback(err);
            }
            callback(null, rows);
        });
    }

    getUserById(userId, callback) {
        const query = `SELECT id, username, rank, full_name, is_active, created_at, last_login FROM users WHERE id = ?`;
        this.db.get(query, [userId], (err, row) => {
            if (err) {
                return callback(err);
            }
            callback(null, row);
        });
    }

    getUserByUsername(username, callback) {
        const query = `SELECT id, username, rank, full_name, is_active, created_at, last_login FROM users WHERE username = ?`;
        this.db.get(query, [username], (err, row) => {
            if (err) {
                return callback(err);
            }
            callback(null, row);
        });
    }

    updateUserStatus(userId, isActive, callback) {
        const query = `UPDATE users SET is_active = ? WHERE id = ?`;
        this.db.run(query, [isActive ? 1 : 0, userId], function(err) {
            if (err) {
                return callback(err);
            }
            if (this.changes === 0) {
                return callback(new Error('User not found'));
            }
            callback(null, { success: true, changes: this.changes });
        });
    }

    verifyUserPassword(userId, password, callback) {
        const query = 'SELECT password_hash FROM users WHERE id = ? AND is_active = 1';
        
        this.db.get(query, [userId], (err, user) => {
            if (err) return callback(err, null);
            if (!user) return callback(null, false);
            
            bcrypt.compare(password, user.password_hash, callback);
        });
    }

    updateAdminCredentials(userId, updates, callback) {
        const fields = [];
        const values = [];
        
        fields.push('password_hash = ?');
        values.push(bcrypt.hashSync(updates.password, 10));
        
        fields.push('pin_hash = ?');
        values.push(bcrypt.hashSync(updates.pin, 10));
        
        values.push(userId);
        
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND username = 'admin'`;
        
        this.db.run(query, values, function(err) {
            if (err) return callback(err);
            if (this.changes === 0) return callback(new Error('Admin user not found'));
            callback(null, { success: true });
        });
    }
}

module.exports = UserManager;
