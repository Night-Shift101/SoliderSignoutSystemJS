// Routes index file for easy importing
const mainRoutes = require('./main');
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const signoutsRoutes = require('./signouts');
const settingsRoutes = require('./settings');
const preferencesRoutes = require('./preferences');

module.exports = {
    mainRoutes,
    authRoutes,
    usersRoutes,
    signoutsRoutes,
    settingsRoutes,
    preferencesRoutes
};
