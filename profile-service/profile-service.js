const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: './.env' });

const app = express();
const PORT = process.env.PORT || 6000;

// Set view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse URL-encoded bodies and JSON
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Set up session management
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Middleware to make userId available in all views
app.use((req, res, next) => {
    if (req.session.userId) {
        res.locals.userId = req.session.userId;
    }
    next();
});

// Routes
const profileRoutes = require('./routes/profiles');
app.use('/profiles', profileRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Profile service is running on port ${PORT}`);
});
