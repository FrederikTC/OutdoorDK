const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const session = require('express-session');
const bodyParser = require('body-parser');

dotenv.config({ path: './.env' });

const app = express();

// Set up MySQL connection
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_ROOT,
    password: process.env.DATABASE_ROOT_PASSWORD,
    database: process.env.DATABASE,
    port: 3306
});

// Connect to MySQL
db.connect((error) => {
    if (error) {
        console.log(error);
    } else {
        console.log("MySQL connected...");
    }
});

// Middleware to parse URL-encoded bodies and JSON
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Set up session management
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Route to create a new shelter
app.post('/shelters', (req, res) => {
    const { name, location, description } = req.body;

    if (!name || !location || !description) {
        return res.status(400).json({ message: 'Please provide all required fields: name, location, description' });
    }

    const query = 'INSERT INTO shelters (name, location, description) VALUES (?, ?, ?)';

    db.query(query, [name, location, description], (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.status(201).json({ message: 'Shelter created successfully', shelterId: results.insertId });
    });
});

// Route to get all shelters
app.get('/shelters', (req, res) => {
    const query = 'SELECT * FROM shelters';

    db.query(query, (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.status(200).json(results);
    });
});

// Route to book a shelter
app.post('/bookings', (req, res) => {
    const { user_id, shelter_id, booking_date } = req.body;

    if (!user_id || !shelter_id || !booking_date) {
        return res.status(400).json({ message: 'Please provide all required fields: user_id, shelter_id, booking_date' });
    }

    const query = 'INSERT INTO bookings (user_id, shelter_id, booking_date) VALUES (?, ?, ?)';

    db.query(query, [user_id, shelter_id, booking_date], (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.status(201).json({ message: 'Shelter booked successfully', bookingId: results.insertId });
    });
});

// Route to get all bookings for a user
app.get('/bookings/:userId', (req, res) => {
    const { userId } = req.params;

    const query = 'SELECT * FROM bookings WHERE user_id = ?';

    db.query(query, [userId], (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.status(200).json(results);
    });
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Shelter management service is running on port ${port}`);
});
