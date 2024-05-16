const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const session = require('express-session');

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
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Set up session management
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Registration API
app.post("/register", (req, res) => {
    const { name, email, password, password_confirm } = req.body;

    if (password !== password_confirm) {
        return res.status(400).json({ message: 'Passwords do not match!' });
    }

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'This email is already in use' });
        }

        let hashedPassword = await bcrypt.hash(password, 8);

        db.query('INSERT INTO users SET ?', { name: name, email: email, password: hashedPassword }, (error, results) => {
            if (error) {
                return res.status(500).json({ message: 'Internal Server Error' });
            } else {
                return res.status(201).json({ message: 'User registered successfully!' });
            }
        });
    });
});

// Login API
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        if (results.length == 0 || !(await bcrypt.compare(password, results[0].password))) {
            return res.status(400).json({ message: 'Email or Password is incorrect' });
        }

        // Set up session
        req.session.userId = results[0].id;
        return res.status(200).json({ message: 'Logged in successfully', userId: results[0].id });
    });
});

// Logout API
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Authentication service is running on port ${port}`);
});
