const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { consumeQueue } = require('../utils/rabbitmq');

// Load environment variables from .env file
dotenv.config({ path: './.env' });

// Log environment variables to ensure they are loaded correctly
console.log('Database host:', process.env.DATABASE_HOST);
console.log('Database user:', process.env.DATABASE_USER);
console.log('Database password:', process.env.DATABASE_PASSWORD);
console.log('Database name:', process.env.DATABASE);
console.log('Session secret:', process.env.SESSION_SECRET);

const app = express();

// Set up MySQL connection
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
    port: 3306
});

// Connect to MySQL
db.connect((error) => {
    if (error) {
        console.log('Database connection error:', error);
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

// RabbitMQ setup
const AUTH_SERVICE_QUEUE = 'auth_service';

consumeQueue(AUTH_SERVICE_QUEUE, async (messageContent) => {
    try {
        switch (messageContent.action) {
            case 'register':
                await handleRegister(messageContent.data);
                break;
            case 'login':
                await handleLogin(messageContent.data);
                break;
            case 'logout':
                await handleLogout(messageContent.data);
                break;
            default:
                console.log(`Unknown action: ${messageContent.action}`);
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

// Registration handler
async function handleRegister(data) {
    const { name, email, password, password_confirm } = data;

    if (password !== password_confirm) {
        console.log('Passwords do not match!');
        return;
    }

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            return;
        }

        if (results.length > 0) {
            console.log('This email is already in use');
            return;
        }

        let hashedPassword = await bcrypt.hash(password, 8);

        db.query('INSERT INTO users SET ?', { name, email, password: hashedPassword }, (error) => {
            if (error) {
                console.error('Database insert error:', error);
            } else {
                console.log('User registered successfully!');
            }
        });
    });
}

// Login handler
async function handleLogin(data) {
    const { email, password } = data;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            return;
        }

        if (results.length == 0 || !(await bcrypt.compare(password, results[0].password))) {
            console.log('Email or Password is incorrect');
            return;
        }

        // Simulate session setup
        console.log('Logged in successfully', results[0].id);
    });
}

// Logout handler
async function handleLogout(data) {
    // Simulate session destruction
    console.log('Logged out successfully');
}

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Authentication service is running on port ${port}`);
});
