const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
require('dotenv').config();

// Import routes
const mainRoutes = require('./src/routes/main');
const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
const signoutsRoutes = require('./src/routes/signouts');
const settingsRoutes = require('./src/routes/settings');
const preferencesRoutes = require('./src/routes/preferences');
const permissionsRoutes = require('./src/routes/permissions');
const Database = require('./src/database/database');

const app = express();
const PORT = process.env.PORT || 3000;


const db = new Database();


app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));


app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'","https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.5.3/jspdf.min.js"],
            imgSrc: ["'self'", "data:"]
        }
    }
}));





app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
    
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
});
// Database middleware
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Routes
app.use('/', mainRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/signouts', signoutsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/preferences', preferencesRoutes(db));
app.use('/api/permissions', permissionsRoutes);

// Health check endpoint for connection monitoring
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});


app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});


app.listen(PORT, () => {
    console.log(`Soldier Sign-Out System running on http://localhost:${PORT}`);
    console.log('Database initialized successfully');
});


process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close();
    process.exit(0);
});
