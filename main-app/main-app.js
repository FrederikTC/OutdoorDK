const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const { connectRabbitMQ, publishToQueue, closeRabbitMQ } = require('../utils/rabbitmq');
const amqp = require('amqplib');

dotenv.config();

const app = express();

const AUTH_SERVICE_QUEUE = 'auth_service';

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

let channel; // To hold the RabbitMQ channel

// Ensure RabbitMQ is connected before starting
async function initializeRabbitMQ() {
    try {
        await connectRabbitMQ();
        channel = await amqp.connect('amqp://localhost').then(conn => conn.createChannel());
        console.log('RabbitMQ connection initialized successfully.');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error.message);
        process.exit(1);
    }
}

// Initialize RabbitMQ at application start
initializeRabbitMQ();

// Root route
app.get('/', (req, res) => {
    res.render('index'); // Assuming you have an index.hbs in your views folder
});

// Register route
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/auth/register', async (req, res) => {
    try {
        const correlationId = generateCorrelationId();

        // Create a temporary response queue
        const responseQueue = await channel.assertQueue('', { exclusive: true });

        // Consuming the temporary response queue
        channel.consume(responseQueue.queue, (msg) => {
            if (msg.properties.correlationId === correlationId) {
                const response = JSON.parse(msg.content.toString());
                res.render('register', { message: response.message || 'Registration request sent.' });
            }
        }, { noAck: true });

        // Publishing the request to the queue
        await publishToQueue(AUTH_SERVICE_QUEUE, {
            action: 'register',
            data: {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                password_confirm: req.body.password_confirm
            }
        }, correlationId, responseQueue.queue);

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
        const correlationId = generateCorrelationId();

        // Create a temporary response queue
        const responseQueue = await channel.assertQueue('', { exclusive: true });

        // Consuming the temporary response queue
        channel.consume(responseQueue.queue, (msg) => {
            if (msg.properties.correlationId === correlationId) {
                const authResponse = JSON.parse(msg.content.toString());
                if (authResponse.success) {
                    req.session.userId = authResponse.userId;
                    res.redirect('/');
                } else {
                    res.render('login', { message: 'Invalid login credentials' });
                }
            }
        }, { noAck: true });

        // Publishing the request to the queue
        await publishToQueue(AUTH_SERVICE_QUEUE, {
            action: 'login',
            data: req.body
        }, correlationId, responseQueue.queue);

    } catch (error) {
        console.error('Error during login:', error.message);
        res.render('login', { message: 'An error occurred' });
    }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Main application is running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Closing RabbitMQ connection...');
    await closeRabbitMQ();
    process.exit(0);
});

// Helper function to generate a unique correlation ID
function generateCorrelationId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
