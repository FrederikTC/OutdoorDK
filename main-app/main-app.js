const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const app = express();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const SHELTER_SERVICE_URL = process.env.SHELTER_SERVICE_URL;
const PROFILE_SERVICE_URL = process.env.PROFILE_SERVICE_URL;

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
        const response = await axios.post(`${AUTH_SERVICE_URL}/register`, {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            password_confirm: req.body.password_confirm
        });
        res.render('register', { message: response.data.message });
    } catch (error) {
        console.error('Error during registration:', error.response ? error.response.data : error.message);
        res.render('register', { message: error.response ? error.response.data.message : 'An error occurred' });
    }
});

// Login route
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/auth/login', async (req, res) => {
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/login`, req.body, { withCredentials: true });
        req.session.userId = response.data.userId;
        res.redirect('/');
    } catch (error) {
        console.error('Error during login:', error.response ? error.response.data : error.message);
        res.render('login', { message: error.response ? error.response.data.message : 'An error occurred' });
    }
});

// Logout route
app.post('/auth/logout', async (req, res) => {
    try {
        await axios.post(`${AUTH_SERVICE_URL}/logout`, {}, { withCredentials: true });
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
            }
            res.redirect('/');
        });
    } catch (error) {
        console.log('Error during logout:', error.response ? error.response.data : error.message);
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
        const response = await axios.post(`${SHELTER_SERVICE_URL}/shelters`, req.body);
        res.redirect('/shelters');
    } catch (error) {
        let message = 'An error occurred';
        if (error.response) {
            message = error.response.data.message;
        }
        res.render('new-shelter', { message });
    }
});

// Route to list all shelters
app.get('/shelters', async (req, res) => {
    try {
        const response = await axios.get(`${SHELTER_SERVICE_URL}/shelters`);
        res.render('shelters', { shelters: response.data });
    } catch (error) {
        console.error('Error fetching shelters:', error.response ? error.response.data : error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Route to book a shelter
app.post('/bookings', async (req, res) => {
    try {
        const response = await axios.post(`${SHELTER_SERVICE_URL}/bookings`, {
            user_id: req.session.userId,
            shelter_id: req.body.shelter_id,
            booking_date: req.body.booking_date
        });
        res.redirect('/bookings');
    } catch (error) {
        let message = 'An error occurred';
        if (error.response) {
            message = error.response.data.message;
        }
        res.render('shelters', { message });
    }
});

// Route to display user bookings
app.get('/bookings', async (req, res) => {
    try {
        const response = await axios.get(`${SHELTER_SERVICE_URL}/bookings/${req.session.userId}`);
        res.render('bookings', { bookings: response.data });
    } catch (error) {
        console.error('Error fetching bookings:', error.response ? error.response.data : error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Profile routes
app.get('/profiles/:id', async (req, res) => {
    console.log(`Fetching profile for user ID: ${req.params.id}`);
    try {
        const response = await axios.get(`${PROFILE_SERVICE_URL}/profiles/${req.params.id}`);
        console.log(`Profile data received: ${JSON.stringify(response.data)}`);
        res.render('profile', { user: response.data });
    } catch (error) {
        console.error(`Error fetching profile: ${error.response ? error.response.data : error.message}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/profiles/:id', async (req, res) => {
    console.log(`Updating profile for user ID: ${req.params.id}`);
    try {
        await axios.post(`${PROFILE_SERVICE_URL}/profiles/${req.params.id}`, req.body);
        res.redirect(`/profiles/${req.params.id}`);
    } catch (error) {
        console.error(`Error updating profile: ${error.response ? error.response.data : error.message}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/profiles/:id/change-password', async (req, res) => {
    console.log(`Changing password for user ID: ${req.params.id}`);
    try {
        await axios.post(`${PROFILE_SERVICE_URL}/profiles/${req.params.id}/change-password`, req.body);
        res.redirect(`/profiles/${req.params.id}`);
    } catch (error) {
        console.error(`Error changing password: ${error.response ? error.response.data : error.message}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/profiles/:id/bookings', async (req, res) => {
    console.log(`Fetching booking history for user ID: ${req.params.id}`);
    try {
        const response = await axios.get(`${PROFILE_SERVICE_URL}/profiles/${req.params.id}/bookings`);
        console.log(`Booking history received: ${JSON.stringify(response.data)}`);
        res.render('booking-history', { bookings: response.data });
    } catch (error) {
        console.error(`Error fetching booking history: ${error.response ? error.response.data : error.message}`);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Main application is running on port ${port}`);
});
