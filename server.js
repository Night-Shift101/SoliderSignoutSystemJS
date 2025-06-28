const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require('dotenv').config();

const Database = require('./src/database/database');
const soldierRoutes = require('./src/routes/soldiers');

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
            styleSrc: ["'self'", "'unsafe-inline'", "https:
            fontSrc: ["'self'", "https:
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:"]
        }
    }
}));


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 500, 
    skip: (req, res) => {
        
        return req.path.endsWith('.css') || req.path.endsWith('.js') || 
               req.path.endsWith('.png') || req.path.endsWith('.jpg') || 
               req.path.endsWith('.jpeg') || req.path.endsWith('.gif');
    }
});
app.use(limiter);


app.use(cors());
app.use(morgan('combined'));
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
app.use(express.static(path.join(__dirname, 'public')));


app.use((req, res, next) => {
    req.db = db;
    next();
});


app.use('/api/signouts', soldierRoutes);


app.get('/', (req, res) => {
    if (!req.session.user || !req.session.systemAuthenticated) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/login', (req, res) => {
    if (req.session.user && req.session.systemAuthenticated) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});


app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});


app.listen(PORT, () => {
    console.log(`Soldier Sign-Out System running on http:
    console.log('Database initialized successfully');
});


process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close();
    process.exit(0);
});
