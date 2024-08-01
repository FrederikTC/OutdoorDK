const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const { publishToQueue } = require('../utils/rabbitmq'); // Correct import path

dotenv.config({ path: './.env' });

const app = express();

const AUTH_SERVICE_QUEUE = 'auth_service';
const SHELTER_SERVICE_QUEUE = 'shelter_service';
const PROFILE_SERVICE_QUEUE = 'profile_service';

// Set view engine to hbs
app.set('view engine', 'hbs');

// Set views directory
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse URL-encoded bodies and JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

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

// Home route
app.get('/', (req, res) => {
    res.render('index');
});

// Register route
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/auth/register', async (req, res) => {
    try {
        publishToQueue(AUTH_SERVICE_QUEUE, {
            action: 'register',
            data: {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                password_confirm: req.body.password_confirm
            }
        });
        res.render('register', { message: 'Registration request sent.' });
    } catch (error) {
        console.error('Error during registration:', error.message);
        res.render('register', { message: 'An error occurred' });
    }
});

// Login route
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/auth/login', async (req, res) => {
    try {
        publishToQueue(AUTH_SERVICE_QUEUE, {
            action: 'login',
            data: req.body
        });
        res.redirect('/');
    } catch (error) {
        console.error('Error during login:', error.message);
        res.render('login', { message: 'An error occurred' });
    }
});

// Logout route
app.post('/auth/logout', async (req, res) => {
    try {
        publishToQueue(AUTH_SERVICE_QUEUE, {
            action: 'logout',
            data: {}
        });
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
            }
            res.redirect('/');
        });
    } catch (error) {
        console.log('Error during logout:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Protected route example
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('dashboard', { userId: req.session.userId });
});

// Route to create a new shelter
app.get('/shelters/new', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('new-shelter');
});

app.post('/shelters', async (req, res) => {
    try {
        publishToQueue(SHELTER_SERVICE_QUEUE, {
            action: 'create_shelter',
            data: req.body
        });
        res.redirect('/shelters');
    } catch (error) {
        let message = 'An error occurred';
        res.render('new-shelter', { message });
    }
});

// Route to list all shelters
app.get('/shelters', async (req, res) => {
    try {
        publishToQueue(SHELTER_SERVICE_QUEUE, {
            action: 'list_shelters',
            data: {}
        });
        res.render('shelters', { shelters: [] }); // Placeholder until you implement a way to get the response back
    } catch (error) {
        console.error('Error fetching shelters:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Route to book a shelter
app.post('/bookings', async (req, res) => {
    try {
        publishToQueue(SHELTER_SERVICE_QUEUE, {
            action: 'book_shelter',
            data: {
                user_id: req.session.userId,
                shelter_id: req.body.shelter_id,
                booking_date: req.body.booking_date
            }
        });
        res.redirect('/bookings');
    } catch (error) {
        let message = 'An error occurred';
        res.render('shelters', { message });
    }
});

// Route to display user bookings
app.get('/bookings', async (req, res) => {
    try {
        publishToQueue(SHELTER_SERVICE_QUEUE, {
            action: 'list_bookings',
            data: { user_id: req.session.userId }
        });
        res.render('bookings', { bookings: [] }); // Placeholder until you implement a way to get the response back
    } catch (error) {
        console.error('Error fetching bookings:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Profile routes
app.get('/profiles/:id', async (req, res) => {
    console.log(`Fetching profile for user ID: ${req.params.id}`);
    try {
        publishToQueue(PROFILE_SERVICE_QUEUE, {
            action: 'get_profile',
            data: { user_id: req.params.id }
        });
        res.render('profile', { user: {} }); // Placeholder until you implement a way to get the response back
    } catch (error) {
        console.error(`Error fetching profile: ${error.message}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/profiles/:id', async (req, res) => {
    console.log(`Updating profile for user ID: ${req.params.id}`);
    try {
        publishToQueue(PROFILE_SERVICE_QUEUE, {
            action: 'update_profile',
            data: {
                user_id: req.params.id,
                ...req.body
            }
        });
        res.redirect(`/profiles/${req.params.id}`);
    } catch (error) {
        console.error(`Error updating profile: ${error.message}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/profiles/:id/change-password', async (req, res) => {
    console.log(`Changing password for user ID: ${req.params.id}`);
    try {
        publishToQueue(PROFILE_SERVICE_QUEUE, {
            action: 'change_password',
            data: {
                user_id: req.params.id,
                ...req.body
            }
        });
        res.redirect(`/profiles/${req.params.id}`);
    } catch (error) {
        console.error(`Error changing password: ${error.message}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/profiles/:id/bookings', async (req, res) => {
    console.log(`Fetching booking history for user ID: ${req.params.id}`);
    try {
        publishToQueue(PROFILE_SERVICE_QUEUE, {
            action: 'list_bookings',
            data: { user_id: req.params.id }
        });
        res.render('booking-history', { bookings: [] }); // Placeholder until you implement a way to get the response back
    } catch (error) {
        console.error(`Error fetching booking history: ${error.message}`);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Main application is running on port ${port}`);
});
