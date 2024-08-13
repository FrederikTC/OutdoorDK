const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { connectRabbitMQ, consumeQueue, closeRabbitMQ } = require('../utils/rabbitmq');
const amqp = require('amqplib');

dotenv.config();

console.log('Database host:', process.env.DATABASE_HOST);
console.log('Database user:', process.env.DATABASE_USER);
console.log('Database password:', process.env.DATABASE_PASSWORD);
console.log('Database name:', process.env.DATABASE);
console.log('Session secret:', process.env.SESSION_SECRET);

const app = express();
let channel;

// Set up MySQL connection
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
    port: 3306
});

db.connect((error) => {
    if (error) {
        console.log('Database connection error:', error);
    } else {
        console.log("MySQL connected...");
    }
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

const AUTH_SERVICE_QUEUE = 'auth_service';

async function start() {
    try {
        await connectRabbitMQ();
        channel = await amqp.connect('amqp://localhost').then(conn => conn.createChannel());

        consumeQueue(AUTH_SERVICE_QUEUE, async (messageContent, msg) => {
            try {
                switch (messageContent.action) {
                    case 'register':
                        await handleRegister(messageContent.data, msg);
                        break;
                    case 'login':
                        await handleLogin(messageContent.data, msg);
                        break;
                    case 'logout':
                        await handleLogout(messageContent.data, msg);
                        break;
                    default:
                        console.log(`Unknown action: ${messageContent.action}`);
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });
    } catch (error) {
        console.error('Failed to start the authentication service:', error);
        process.exit(1);
    }
}

async function handleRegister(data, msg) {
    const { name, email, password, password_confirm } = data;

    if (password !== password_confirm) {
        sendResponse(msg, { success: false, message: 'Passwords do not match!' });
        return;
    }

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            sendResponse(msg, { success: false, message: 'Database error' });
            return;
        }

        if (results.length > 0) {
            sendResponse(msg, { success: false, message: 'This email is already in use' });
            return;
        }

        let hashedPassword = await bcrypt.hash(password, 8);

        db.query('INSERT INTO users SET ?', { name, email, password: hashedPassword }, (error) => {
            if (error) {
                console.error('Database insert error:', error);
                sendResponse(msg, { success: false, message: 'Database error' });
            } else {
                console.log('User registered successfully!');
                sendResponse(msg, { success: true, message: 'User registered successfully!' });
            }
        });
    });
}

function sendResponse(msg, response) {
    if (!msg || !msg.properties) {
        console.error('Message or message properties are missing');
        return;
    }

    const replyTo = msg.properties.replyTo;
    const correlationId = msg.properties.correlationId;

    if (!replyTo) {
        console.error('No replyTo queue specified in message');
        return;
    }

    const messageBuffer = Buffer.from(JSON.stringify(response));

    channel.sendToQueue(replyTo, messageBuffer, { correlationId }, (err, ok) => {
        if (err) {
            console.error('Failed to send response to queue:', err);
        } else {
            console.log(`Response sent to queue ${replyTo} with correlationId ${correlationId}`);
        }
    });
}


async function handleLogin(data, msg) {
    const { email, password } = data;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            sendResponse(msg, { success: false, message: 'Database error' });
            return;
        }

        if (results.length == 0 || !(await bcrypt.compare(password, results[0].password))) {
            console.log('Email or Password is incorrect');
            sendResponse(msg, { success: false, message: 'Email or Password is incorrect' });
            return;
        }

        console.log('Logged in successfully', results[0].id);
        sendResponse(msg, { success: true, userId: results[0].id, message: 'Logged in successfully' });
    });
}

async function handleLogout(data, msg) {
    console.log('Logged out successfully');
    sendResponse(msg, { success: true, message: 'Logged out successfully' });
}

// Function to send a response back to the queue
function sendResponse(msg, response) {
    const replyTo = msg.properties.replyTo;
    const correlationId = msg.properties.correlationId;

    if (!replyTo) {
        console.error('No replyTo queue specified in message');
        return;
    }

    const messageBuffer = Buffer.from(JSON.stringify(response));

    channel.sendToQueue(replyTo, messageBuffer, { correlationId }, (err, ok) => {
        if (err) {
            console.error('Failed to send response to queue:', err);
        } else {
            console.log(`Response sent to queue ${replyTo} with correlationId ${correlationId}`);
        }
    });
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Authentication service is running on port ${port}`);
    start();
});

process.on('SIGINT', async () => {
    console.log('Closing RabbitMQ connection...');
    await closeRabbitMQ();
    db.end(() => {
        console.log('MySQL connection closed.');
        process.exit(0);
    });
});
