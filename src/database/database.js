const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '../../data/soldiers.db');
        this.init();
    }

    init() {
        
        const fs = require('fs');
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                pin_hash TEXT NOT NULL,
                rank TEXT NOT NULL,
                full_name TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        `;

        
        const createSignOutsTable = `
            CREATE TABLE IF NOT EXISTS signouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                signout_id TEXT NOT NULL,
                soldier_rank TEXT NOT NULL,
                soldier_first_name TEXT NOT NULL,
                soldier_last_name TEXT NOT NULL,
                soldier_dod_id TEXT,
                location TEXT NOT NULL,
                sign_out_time DATETIME NOT NULL,
                sign_in_time DATETIME,
                signed_out_by_id INTEGER NOT NULL,
                signed_out_by_name TEXT NOT NULL,
                signed_in_by_id INTEGER,
                signed_in_by_name TEXT,
                status TEXT DEFAULT 'OUT' CHECK(status IN ('OUT', 'IN')),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (signed_out_by_id) REFERENCES users(id),
                FOREIGN KEY (signed_in_by_id) REFERENCES users(id)
            )
        `;

        this.db.run(createUsersTable, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            } else {
                console.log('Users table ready');
                this.createDefaultAdmin();
                this.createTestUsers(); 
            }
        });

        this.db.run(createSignOutsTable, (err) => {
            if (err) {
                console.error('Error creating signouts table:', err.message);
            } else {
                console.log('SignOuts table ready');
                this.migrateSignOutsTable();
            }
        });

        
        const updateTrigger = `
            CREATE TRIGGER IF NOT EXISTS update_signouts_timestamp 
            AFTER UPDATE ON signouts
            BEGIN
                UPDATE signouts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `;

        this.db.run(updateTrigger, (err) => {
            if (err) {
                console.error('Error creating trigger:', err.message);
            }
        });
    }

    
    createDefaultAdmin() {
        const bcrypt = require('bcrypt');
        const defaultUsername = 'admin';
        const defaultPassword = 'admin123';
        const defaultPin = '1234';
        
        
        this.db.get('SELECT id FROM users WHERE username = ?', [defaultUsername], (err, row) => {
            if (err) {
                console.error('Error checking for admin user:', err.message);
                return;
            }
            
            if (!row) {
                
                const passwordHash = bcrypt.hashSync(defaultPassword, 10);
                const pinHash = bcrypt.hashSync(defaultPin, 10);
                
                this.db.run(
                    'INSERT INTO users (username, password_hash, pin_hash, rank, full_name) VALUES (?, ?, ?, ?, ?)',
                    [defaultUsername, passwordHash, pinHash, 'Admin', 'System Administrator'],
                    function(err) {
                        if (err) {
                            console.error('Error creating default user:', err.message);
                        } else {
                            console.log('Default admin user created:');
                            console.log('  Username: admin');
                            console.log('  Password: admin123');
                            console.log('  PIN: 1234');
                        }
                    }
                );
            }
        });
    }

    
    createTestUsers() {
        const bcrypt = require('bcrypt');
        
        const testUsers = [
            {
                username: 'testnco',
                password: 'test123',
                pin: '1234',
                rank: 'SGT',
                full_name: 'Test NCO'
            },
            {
                username: 'testsgt',
                password: 'test123', 
                pin: '5678',
                rank: 'SSG',
                full_name: 'Staff Sergeant Test'
            }
        ];

        testUsers.forEach(user => {
            
            this.db.get('SELECT id FROM users WHERE username = ?', [user.username], (err, row) => {
                if (err) {
                    console.error('Error checking for test user:', err.message);
                    return;
                }
                
                const passwordHash = bcrypt.hashSync(user.password, 10);
                const pinHash = bcrypt.hashSync(user.pin, 10);
                
                if (!row) {
                    
                    this.db.run(
                        'INSERT INTO users (username, password_hash, pin_hash, rank, full_name) VALUES (?, ?, ?, ?, ?)',
                        [user.username, passwordHash, pinHash, user.rank, user.full_name],
                        function(err) {
                            if (err) {
                                console.error(`Error creating test user ${user.username}:`, err.message);
                            } else {
                                console.log(`Test user created: ${user.rank} ${user.full_name} (PIN: ${user.pin})`);
                            }
                        }
                    );
                } else {
                    
                    this.db.run(
                        'UPDATE users SET pin_hash = ? WHERE username = ?',
                        [pinHash, user.username],
                        function(err) {
                            if (err) {
                                console.error(`Error updating PIN for ${user.username}:`, err.message);
                            } else {
                                console.log(`Updated PIN for ${user.rank} ${user.full_name} to: ${user.pin}`);
                            }
                        }
                    );
                }
            });
        });
    }

    
    
    verifySystemPassword(password, callback) {
        const bcrypt = require('bcrypt');
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
        const query = 'SELECT id, username, rank, full_name FROM users WHERE is_active = 1 ORDER BY rank, full_name';
        
        this.db.all(query, [], (err, users) => {
            if (err) return callback(err, null);
            callback(null, users);
        });
    }

    
    verifyUserPinById(userId, pin, callback) {
        const bcrypt = require('bcrypt');
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
        const bcrypt = require('bcrypt');
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
        const bcrypt = require('bcrypt');
        const query = 'SELECT pin_hash FROM users WHERE id = ? AND is_active = 1';
        
        this.db.get(query, [userId], (err, row) => {
            if (err) return callback(err, null);
            if (!row) return callback(null, false);
            
            bcrypt.compare(pin, row.pin_hash, callback);
        });
    }

    
    getAllSignOuts(callback) {
        const query = `
            SELECT 
                signout_id,
                location,
                sign_out_time,
                sign_in_time,
                signed_out_by_id,
                signed_out_by_name,
                signed_in_by_id,
                signed_in_by_name,
                status,
                notes,
                created_at,
                updated_at,
                GROUP_CONCAT(
                    CASE 
                        WHEN soldier_rank != '' THEN soldier_rank || ' ' || soldier_first_name || ' ' || soldier_last_name
                        ELSE soldier_first_name || ' ' || soldier_last_name
                    END, ', '
                ) as soldier_names,
                COUNT(*) as soldier_count,
                '[' || GROUP_CONCAT(
                    '{"rank":"' || COALESCE(soldier_rank, '') || 
                    '","firstName":"' || soldier_first_name || 
                    '","lastName":"' || soldier_last_name || 
                    '","dodId":"' || COALESCE(soldier_dod_id, '') || '"}'
                    , ',') || ']' as soldiers
            FROM signouts 
            GROUP BY signout_id, location, sign_out_time, sign_in_time, signed_out_by_id, signed_out_by_name, signed_in_by_id, signed_in_by_name, status, notes, created_at, updated_at
            ORDER BY sign_out_time DESC
        `;
        this.db.all(query, [], (err, rows) => {
            if (err) {
                return callback(err);
            }
            
            
            const processedRows = rows.map(row => {
                try {
                    row.soldiers = JSON.parse(row.soldiers);
                } catch (e) {
                    console.error('Error parsing soldiers JSON:', e);
                    row.soldiers = [];
                }
                return row;
            });
            
            callback(null, processedRows);
        });
    }

    
    getCurrentSignOuts(callback) {
        const query = `
            SELECT 
                signout_id,
                location,
                sign_out_time,
                signed_out_by_id,
                signed_out_by_name,
                status,
                notes,
                created_at,
                updated_at,
                GROUP_CONCAT(
                    CASE 
                        WHEN soldier_rank != '' THEN soldier_rank || ' ' || soldier_first_name || ' ' || soldier_last_name
                        ELSE soldier_first_name || ' ' || soldier_last_name
                    END, ', '
                ) as soldier_names,
                COUNT(*) as soldier_count,
                '[' || GROUP_CONCAT(
                    '{"rank":"' || COALESCE(soldier_rank, '') || 
                    '","firstName":"' || soldier_first_name || 
                    '","lastName":"' || soldier_last_name || 
                    '","dodId":"' || COALESCE(soldier_dod_id, '') || '"}'
                    , ',') || ']' as soldiers
            FROM signouts 
            WHERE status = 'OUT' 
            GROUP BY signout_id, location, sign_out_time, signed_out_by_id, signed_out_by_name, status, notes, created_at, updated_at
            ORDER BY sign_out_time ASC
        `;
        this.db.all(query, [], (err, rows) => {
            if (err) {
                return callback(err);
            }
            
            
            const processedRows = rows.map(row => {
                try {
                    row.soldiers = JSON.parse(row.soldiers);
                } catch (e) {
                    console.error('Error parsing soldiers JSON:', e);
                    row.soldiers = [];
                }
                return row;
            });
            
            callback(null, processedRows);
        });
    }

    
    addSignOut(signOutData, callback) {
        
        const signOutId = this.generateSignOutId();
        const signOutTime = new Date().toISOString();
        
        
        const soldiers = signOutData.soldiers || [];
        
        if (!soldiers || soldiers.length === 0) {
            return callback(new Error('No soldiers provided for sign-out'));
        }
        
        
        const db = this.db; 
        
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            let completed = 0;
            let hasError = false;
            
            const insertQuery = `
                INSERT INTO signouts (
                    signout_id, soldier_rank, soldier_first_name, soldier_last_name, 
                    soldier_dod_id, location, sign_out_time, signed_out_by_id, 
                    signed_out_by_name, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            
            soldiers.forEach((soldier, index) => {
                const params = [
                    signOutId,
                    soldier.rank || '',
                    soldier.firstName || '',
                    soldier.lastName || '',
                    soldier.dodId || null,
                    signOutData.location,
                    signOutTime,
                    signOutData.signed_out_by_id,
                    signOutData.signed_out_by_name,
                    signOutData.notes || ''
                ];
                
                db.run(insertQuery, params, function(err) {
                    completed++;
                    
                    if (err && !hasError) {
                        hasError = true;
                        console.error('Error inserting soldier:', err.message);
                        db.run('ROLLBACK');
                        return callback(err);
                    }
                    
                    
                    if (completed === soldiers.length && !hasError) {
                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                                console.error('Error committing transaction:', commitErr.message);
                                return callback(commitErr);
                            }
                            
                            callback(null, { 
                                signout_id: signOutId,
                                soldiers_count: soldiers.length 
                            });
                        });
                    }
                });
            });
        });
    }

    
    signInSoldiers(signOutId, signedInById, signedInByName, callback) {
        const query = `
            UPDATE signouts 
            SET status = 'IN', sign_in_time = datetime('now'), 
                signed_in_by_id = ?, signed_in_by_name = ?
            WHERE signout_id = ? AND status = 'OUT'
        `;
        this.db.run(query, [signedInById, signedInByName, signOutId], function(err) {
            if (err) {
                return callback(err, null);
            }
            callback(null, { changes: this.changes });
        });
    }

    
    getSignOutById(signOutId, callback) {
        const query = `
            SELECT 
                signout_id,
                location,
                sign_out_time,
                sign_in_time,
                signed_out_by_id,
                signed_out_by_name,
                signed_in_by_id,
                signed_in_by_name,
                status,
                notes,
                created_at,
                updated_at,
                GROUP_CONCAT(
                    CASE 
                        WHEN soldier_rank != '' THEN soldier_rank || ' ' || soldier_first_name || ' ' || soldier_last_name
                        ELSE soldier_first_name || ' ' || soldier_last_name
                    END, ', '
                ) as soldier_names,
                COUNT(*) as soldier_count,
                '[' || GROUP_CONCAT(
                    '{"rank":"' || COALESCE(soldier_rank, '') || 
                    '","firstName":"' || soldier_first_name || 
                    '","lastName":"' || soldier_last_name || 
                    '","dodId":"' || COALESCE(soldier_dod_id, '') || '"}'
                    , ',') || ']' as soldiers
            FROM signouts 
            WHERE signout_id = ?
            GROUP BY signout_id, location, sign_out_time, sign_in_time, signed_out_by_id, signed_out_by_name, signed_in_by_id, signed_in_by_name, status, notes, created_at, updated_at
        `;
        this.db.get(query, [signOutId], (err, row) => {
            if (err) {
                return callback(err);
            }
            if (!row) {
                return callback(null, null);
            }
            
            
            try {
                row.soldiers = JSON.parse(row.soldiers);
            } catch (e) {
                console.error('Error parsing soldiers JSON for signout:', signOutId, e);
                row.soldiers = [];
            }
            
            callback(null, row);
        });
    }

    
    getFilteredSignOuts(filters, callback) {
        let baseQuery = `
            SELECT 
                signout_id,
                location,
                sign_out_time,
                sign_in_time,
                signed_out_by_id,
                signed_out_by_name,
                signed_in_by_id,
                signed_in_by_name,
                status,
                notes,
                created_at,
                updated_at,
                GROUP_CONCAT(
                    CASE 
                        WHEN soldier_rank != '' THEN soldier_rank || ' ' || soldier_first_name || ' ' || soldier_last_name
                        ELSE soldier_first_name || ' ' || soldier_last_name
                    END, ', '
                ) as soldier_names,
                COUNT(*) as soldier_count,
                '[' || GROUP_CONCAT(
                    '{"rank":"' || COALESCE(soldier_rank, '') || 
                    '","firstName":"' || soldier_first_name || 
                    '","lastName":"' || soldier_last_name || 
                    '","dodId":"' || COALESCE(soldier_dod_id, '') || '"}'
                    , ',') || ']' as soldiers
            FROM signouts 
            WHERE 1=1
        `;
        let params = [];

        if (filters.startDate) {
            baseQuery += ' AND date(sign_out_time) >= date(?)';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            baseQuery += ' AND date(sign_out_time) <= date(?)';
            params.push(filters.endDate);
        }

        if (filters.soldierName) {
            baseQuery += ' AND (soldier_first_name LIKE ? OR soldier_last_name LIKE ? OR (soldier_rank || " " || soldier_first_name || " " || soldier_last_name) LIKE ?)';
            params.push(`%${filters.soldierName}%`, `%${filters.soldierName}%`, `%${filters.soldierName}%`);
        }

        if (filters.location) {
            baseQuery += ' AND location LIKE ?';
            params.push(`%${filters.location}%`);
        }

        if (filters.status) {
            baseQuery += ' AND status = ?';
            params.push(filters.status);
        }

        baseQuery += ` 
            GROUP BY signout_id, location, sign_out_time, sign_in_time, signed_out_by_id, signed_out_by_name, signed_in_by_id, signed_in_by_name, status, notes, created_at, updated_at
            ORDER BY sign_out_time DESC
        `;

        this.db.all(baseQuery, params, (err, rows) => {
            if (err) {
                return callback(err);
            }
            
            
            const processedRows = rows.map(row => {
                try {
                    row.soldiers = JSON.parse(row.soldiers);
                } catch (e) {
                    console.error('Error parsing soldiers JSON:', e);
                    row.soldiers = [];
                }
                return row;
            });
            
            callback(null, processedRows);
        });
    }

    
    getIndividualSignOutRecords(filters, callback) {
        let baseQuery = `
            SELECT 
                signout_id,
                soldier_rank,
                soldier_first_name,
                soldier_last_name,
                soldier_dod_id,
                location,
                sign_out_time,
                sign_in_time,
                signed_out_by_id,
                signed_out_by_name,
                signed_in_by_id,
                signed_in_by_name,
                status,
                notes,
                created_at,
                updated_at
            FROM signouts 
            WHERE 1=1
        `;
        let params = [];

        if (filters.startDate) {
            baseQuery += ' AND date(sign_out_time) >= date(?)';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            baseQuery += ' AND date(sign_out_time) <= date(?)';
            params.push(filters.endDate);
        }

        if (filters.soldierName) {
            baseQuery += ' AND (soldier_first_name LIKE ? OR soldier_last_name LIKE ? OR (soldier_rank || " " || soldier_first_name || " " || soldier_last_name) LIKE ?)';
            params.push(`%${filters.soldierName}%`, `%${filters.soldierName}%`, `%${filters.soldierName}%`);
        }

        if (filters.location) {
            baseQuery += ' AND location LIKE ?';
            params.push(`%${filters.location}%`);
        }

        if (filters.status) {
            baseQuery += ' AND status = ?';
            params.push(filters.status);
        }

        baseQuery += ` ORDER BY sign_out_time DESC, signout_id, soldier_last_name, soldier_first_name`;

        this.db.all(baseQuery, params, (err, rows) => {
            if (err) {
                return callback(err);
            }
            
            callback(null, rows);
        });
    }

    
    generateSignOutId() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const time = now.getTime().toString().slice(-4);
        
        return `SO${year}${month}${day}-${time}`;
    }

    
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
   }

    
    migrateSignOutsTable() {
        
        this.db.all("PRAGMA table_info(signouts)", (err, columns) => {
            if (err) {
                console.error('Error checking table structure:', err.message);
                return;
            }
            
            const hasOldStructure = columns.some(col => col.name === 'soldier_names');
            
            if (hasOldStructure) {
                console.log('Migrating signouts table to new structure...');
                this.performSignOutsMigration();
            } else {
                console.log('SignOuts table already has correct structure');
            }
        });
    }

    performSignOutsMigration() {
        
        const backupTableQuery = `
            CREATE TABLE IF NOT EXISTS signouts_backup AS 
            SELECT * FROM signouts
        `;
        
        this.db.run(backupTableQuery, (err) => {
            if (err) {
                console.error('Error creating backup table:', err.message);
                return;
            }
            
            
            this.db.run('DROP TABLE signouts', (err) => {
                if (err) {
                    console.error('Error dropping old table:', err.message);
                    return;
                }
                
                
                const createNewTable = `
                    CREATE TABLE signouts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        signout_id TEXT NOT NULL,
                        soldier_rank TEXT NOT NULL,
                        soldier_first_name TEXT NOT NULL,
                        soldier_last_name TEXT NOT NULL,
                        soldier_dod_id TEXT,
                        location TEXT NOT NULL,
                        sign_out_time DATETIME NOT NULL,
                        sign_in_time DATETIME,
                        signed_out_by_id INTEGER NOT NULL,
                        signed_out_by_name TEXT NOT NULL,
                        signed_in_by_id INTEGER,
                        signed_in_by_name TEXT,
                        status TEXT DEFAULT 'OUT' CHECK(status IN ('OUT', 'IN')),
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (signed_out_by_id) REFERENCES users(id),
                        FOREIGN KEY (signed_in_by_id) REFERENCES users(id)
                    )
                `;
                
                this.db.run(createNewTable, (err) => {
                    if (err) {
                        console.error('Error creating new table:', err.message);
                        return;
                    }
                    
                    
                    this.migrateOldData();
                });
            });
        });
    }

    migrateOldData() {
        
        this.db.all('SELECT * FROM signouts_backup', (err, oldRecords) => {
            if (err) {
                console.error('Error reading backup data:', err.message);
                return;
            }
            
            if (oldRecords.length === 0) {
                console.log('No old data to migrate');
                this.db.run('DROP TABLE signouts_backup');
                return;
            }
            
            console.log(`Migrating ${oldRecords.length} old records...`);
            
            oldRecords.forEach(record => {
                
                const soldierNames = record.soldier_names.split(',').map(name => name.trim());
                
                soldierNames.forEach(soldierName => {
                    
                    const nameParts = soldierName.trim().split(' ');
                    let rank = 'Unknown';
                    let firstName = 'Unknown';
                    let lastName = 'Unknown';
                    
                    if (nameParts.length >= 3) {
                        rank = nameParts[0];
                        firstName = nameParts[1];
                        lastName = nameParts.slice(2).join(' ');
                    } else if (nameParts.length === 2) {
                        firstName = nameParts[0];
                        lastName = nameParts[1];
                    } else if (nameParts.length === 1) {
                        lastName = nameParts[0];
                    }
                    
                    const insertQuery = `
                        INSERT INTO signouts (
                            signout_id, soldier_rank, soldier_first_name, soldier_last_name,
                            location, sign_out_time, sign_in_time, signed_out_by_id, 
                            signed_out_by_name, signed_in_by_id, signed_in_by_name, 
                            status, notes, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    this.db.run(insertQuery, [
                        record.signout_id,
                        rank,
                        firstName,
                        lastName,
                        record.location,
                        record.sign_out_time,
                        record.sign_in_time,
                        record.signed_out_by_id,
                        record.signed_out_by_name,
                        record.signed_in_by_id,
                        record.signed_in_by_name,
                        record.status,
                        record.notes,
                        record.created_at,
                        record.updated_at
                    ], (err) => {
                        if (err) {
                            console.error('Error migrating record:', err.message);
                        }
                    });
                });
            });
            
            console.log('Migration completed');
            
            setTimeout(() => {
                this.db.run('DROP TABLE signouts_backup');
            }, 1000);
        });
    }

    
    
    clearOldRecords(cutoffDate, callback) {
        const deleteOldRecords = `
            DELETE FROM signouts 
            WHERE created_at < ? 
            AND status = 'IN'
        `;
        
        this.db.run(deleteOldRecords, [cutoffDate.toISOString()], function(err) {
            if (err) {
                console.error('Error clearing old records:', err.message);
                return callback(err);
            }
            console.log(`Cleared ${this.changes} old records`);
            callback(null, this.changes);
        });
    }
    
    resetSystem(callback) {
        const deleteSignouts = 'DELETE FROM signouts';
        const deleteSystemPasswords = 'DELETE FROM system_passwords';
        
        this.db.serialize(() => {
            this.db.run('BEGIN TRANSACTION');
            
            this.db.run(deleteSignouts, (err) => {
                if (err) {
                    console.error('Error deleting signouts:', err.message);
                    this.db.run('ROLLBACK');
                    return callback(err);
                }
            });
            
            this.db.run(deleteSystemPasswords, (err) => {
                if (err) {
                    console.error('Error deleting system passwords:', err.message);
                    this.db.run('ROLLBACK');
                    return callback(err);
                }
            });
            
            this.db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Error committing system reset:', err.message);
                    this.db.run('ROLLBACK');
                    return callback(err);
                }
                console.log('System reset completed successfully');
                callback(null);
            });
        });
    }
    
    
    
    createUser(userData, callback) {
        const bcrypt = require('bcrypt');
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
            
            this.db.run(insertQuery, [username, passwordHash, pinHash, rank, fullName], function(err) {
                if (err) {
                    return callback(err);
                }
                
                callback(null, {
                    id: this.lastID,
                    username,
                    rank,
                    full_name: fullName
                });
            });
        });
    }
    
    changeUserPin(userId, currentPin, newPin, callback) {
        const bcrypt = require('bcrypt');
        
        
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
    
    deleteUser(userId, userPin, systemPassword, callback) {
        const bcrypt = require('bcrypt');
        
        
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
}

module.exports = Database;
