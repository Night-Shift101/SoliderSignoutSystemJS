const Database = require('./src/database/database');
const PermissionsMiddleware = require('./src/middleware/permissions');

// Test the permissions system
async function testPermissionsSystem() {
    console.log('🔐 Testing Permissions System...\n');

    try {
        const db = new Database();
        const permissions = new PermissionsMiddleware(db.db);

        // Wait a bit for database initialization
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1: Check permissions setup
        console.log('📋 Test 1: Check permissions setup');
        const setupInfo = await db.checkPermissionsSetup();
        console.log('Setup info:', setupInfo);
        console.log('✅ Permissions tables exist:', setupInfo.isSetup);
        console.log();

        // Test 2: Get all permissions
        console.log('📋 Test 2: Get all available permissions');
        const allPermissions = await db.getAllPermissions();
        console.log('Available permissions:', allPermissions.length);
        allPermissions.forEach(perm => {
            console.log(`  - ${perm.name}: ${perm.description}`);
        });
        console.log();

        // Test 3: Get users with permissions
        console.log('📋 Test 3: Get users with permissions');
        const usersWithPerms = await db.getAllUsersWithPermissions();
        console.log('Users with permissions:');
        usersWithPerms.forEach(user => {
            console.log(`  - User ${user.user_id} (${user.rank} ${user.full_name}): ${user.permissions.length} permissions`);
            if (user.permissions.length > 0) {
                console.log(`    Permissions: ${user.permissions.join(', ')}`);
            }
        });
        console.log();

        // Test 4: Test permission checking for first user
        if (usersWithPerms.length > 0) {
            const testUserId = usersWithPerms[0].user_id;
            console.log(`📋 Test 4: Test permission checking for user ${testUserId}`);
            
            const hasViewDashboard = await permissions.hasPermission(testUserId, 'view_dashboard');
            console.log(`  - Has 'view_dashboard': ${hasViewDashboard}`);
            
            const hasCreateSignout = await permissions.hasPermission(testUserId, 'create_signout');
            console.log(`  - Has 'create_signout': ${hasCreateSignout}`);
            
            const hasSystemAdmin = await permissions.hasPermission(testUserId, 'system_admin');
            console.log(`  - Has 'system_admin': ${hasSystemAdmin}`);
            
            // Test AND logic
            const hasAllBasic = await permissions.hasAllPermissions(testUserId, ['view_dashboard', 'create_signout']);
            console.log(`  - Has ALL basic permissions: ${hasAllBasic}`);
            
            // Test OR logic
            const hasAnyAdmin = await permissions.hasAnyPermission(testUserId, ['system_admin', 'manage_users']);
            console.log(`  - Has ANY admin permissions: ${hasAnyAdmin}`);
            console.log();
        }

        // Test 5: Get permission statistics
        console.log('📋 Test 5: Get permission statistics');
        const stats = await db.getPermissionStats();
        console.log('Permission Statistics:');
        console.log(`  - Total permissions: ${stats.totalPermissions}`);
        console.log(`  - Total user permissions: ${stats.totalUserPermissions}`);
        console.log(`  - Users with permissions: ${stats.usersWithPermissions}`);
        console.log('  - Most common permissions:');
        stats.mostCommonPermissions.forEach(perm => {
            console.log(`    * ${perm.name}: ${perm.user_count} users`);
        });
        console.log();

        console.log('✅ All permissions tests completed successfully!');
        console.log('\n🚀 Permissions system is ready to use!');
        console.log('\nAvailable API endpoints:');
        console.log('  - GET /api/permissions - Get all permissions');
        console.log('  - GET /api/permissions/user/:userId - Get user permissions');
        console.log('  - POST /api/permissions/check - Check user permissions');
        console.log('  - POST /api/permissions/grant - Grant permissions');
        console.log('  - POST /api/permissions/revoke - Revoke permissions');
        console.log('  - PUT /api/permissions/user/:userId - Set user permissions');
        console.log('  - GET /api/permissions/stats - Get permission statistics');

    } catch (error) {
        console.error('❌ Error testing permissions system:', error);
    }

    process.exit(0);
}

// Run the test
testPermissionsSystem();
