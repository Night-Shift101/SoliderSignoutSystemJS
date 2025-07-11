#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'soldiers.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting permission migration...');

async function migratePermissions() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            console.log('Step 1: Adding new granular permissions...');
            
            // Add new permissions
            const newPermissions = [
                ['create_users', 'Create new user accounts'],
                ['delete_users', 'Delete user accounts'],
                ['deactivate_users', 'Deactivate and reactivate user accounts']
            ];

            db.run('BEGIN TRANSACTION');

            let insertCount = 0;
            newPermissions.forEach(([name, description]) => {
                const stmt = db.prepare('INSERT OR IGNORE INTO permissions (name, description) VALUES (?, ?)');
                stmt.run(name, description, function(err) {
                    if (err) {
                        console.error(`Error inserting permission ${name}:`, err);
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    if (this.changes > 0) {
                        console.log(`Added permission: ${name}`);
                    } else {
                        console.log(`Permission already exists: ${name}`);
                    }
                    
                    insertCount++;
                    if (insertCount === newPermissions.length) {
                        console.log('Step 2: Migrating users with manage_users to new granular permissions...');
                        migrateUserPermissions();
                    }
                });
                stmt.finalize();
            });

            function migrateUserPermissions() {
                // Get all users who have manage_users permission
                const getUsersStmt = db.prepare(`
                    SELECT DISTINCT up.user_id, up.granted_by
                    FROM user_permissions up
                    JOIN permissions p ON up.permission_id = p.id
                    WHERE p.name = 'manage_users'
                `);

                getUsersStmt.all((err, users) => {
                    if (err) {
                        console.error('Error getting users with manage_users permission:', err);
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    console.log(`Found ${users.length} users with manage_users permission`);

                    if (users.length === 0) {
                        finalizeMigration();
                        return;
                    }

                    let grantCount = 0;
                    users.forEach(user => {
                        // Grant all three new permissions to each user who had manage_users
                        const grantPermissions = ['create_users', 'delete_users', 'deactivate_users'];
                        
                        grantPermissions.forEach(permissionName => {
                            const grantStmt = db.prepare(`
                                INSERT OR IGNORE INTO user_permissions (user_id, permission_id, granted_by)
                                SELECT ?, p.id, ?
                                FROM permissions p
                                WHERE p.name = ?
                            `);

                            grantStmt.run(user.user_id, user.granted_by, permissionName, function(err) {
                                if (err) {
                                    console.error(`Error granting ${permissionName} to user ${user.user_id}:`, err);
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }

                                if (this.changes > 0) {
                                    console.log(`Granted ${permissionName} to user ${user.user_id}`);
                                }

                                grantCount++;
                                if (grantCount === users.length * grantPermissions.length) {
                                    finalizeMigration();
                                }
                            });
                            grantStmt.finalize();
                        });
                    });
                });

                getUsersStmt.finalize();
            }

            function finalizeMigration() {
                console.log('Step 3: Removing old manage_users permission from users...');
                
                // Remove manage_users permission from all users
                const removeStmt = db.prepare(`
                    DELETE FROM user_permissions 
                    WHERE permission_id = (SELECT id FROM permissions WHERE name = 'manage_users')
                `);

                removeStmt.run(function(err) {
                    if (err) {
                        console.error('Error removing manage_users permissions:', err);
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    console.log(`Removed manage_users permission from ${this.changes} user assignments`);

                    console.log('Step 4: Removing manage_users permission definition...');
                    
                    // Remove the manage_users permission itself
                    const deletePermStmt = db.prepare('DELETE FROM permissions WHERE name = ?');
                    deletePermStmt.run('manage_users', function(err) {
                        if (err) {
                            console.error('Error deleting manage_users permission:', err);
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        console.log('Deleted manage_users permission definition');

                        db.run('COMMIT', (err) => {
                            if (err) {
                                console.error('Error committing transaction:', err);
                                reject(err);
                            } else {
                                console.log('Permission migration completed successfully!');
                                resolve();
                            }
                        });
                    });
                    deletePermStmt.finalize();
                });
                removeStmt.finalize();
            }
        });
    });
}

migratePermissions()
    .then(() => {
        console.log('Migration finished successfully');
        db.close();
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        db.close();
        process.exit(1);
    });
