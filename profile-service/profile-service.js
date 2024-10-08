const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const amqp = require('amqplib/callback_api');

dotenv.config();

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

// RabbitMQ setup
const PROFILE_SERVICE_QUEUE = 'profile_service';

let channel;

// Graceful shutdown handling
function closeConnections() {
    if (channel) {
        channel.close((err) => {
            if (err) console.error('Error closing channel:', err);
        });
    }
    console.log('RabbitMQ channel closed');
    process.exit(0);
}

amqp.connect('amqp://localhost', (err, conn) => {
    if (err) {
        throw err;
    }
    conn.createChannel((err, ch) => {
        if (err) {
            throw err;
        }

        channel = ch;

        channel.assertQueue(PROFILE_SERVICE_QUEUE, { durable: true });
        
        // Limit the number of messages sent over the channel before an ack
        channel.prefetch(1);

        channel.consume(PROFILE_SERVICE_QUEUE, async (msg) => {
            if (msg !== null) {
                const messageContent = JSON.parse(msg.content.toString());

                try {
                    switch (messageContent.action) {
                        case 'get_profile':
                            await handleGetProfile(messageContent.data, channel, msg);
                            break;
                        case 'update_profile':
                            await handleUpdateProfile(messageContent.data, channel, msg);
                            break;
                        case 'change_password':
                            await handleChangePassword(messageContent.data, channel, msg);
                            break;
                        case 'list_bookings':
                            await handleListBookings(messageContent.data, channel, msg);
                            break;
                        default:
                            console.log(`Unknown action: ${messageContent.action}`);
                            channel.ack(msg);
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                    // Optionally, you can implement a retry or dead-letter strategy here
                }
            }
        }, {
            noAck: false
        });
    });
});

// Profile handlers
async function handleGetProfile(data, channel, msg) {
    const { user_id } = data;
    console.log(`Fetching profile for user ID: ${user_id}`);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Profile data received for user ID: ${user_id}`);

    // If you need to send a response back:
    if (msg.properties.replyTo) {
        channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify({ success: true, profile: {} })), {
            correlationId: msg.properties.correlationId
        });
    }

    channel.ack(msg);
}

async function handleUpdateProfile(data, channel, msg) {
    const { user_id, ...updateData } = data;
    console.log(`Updating profile for user ID: ${user_id}`);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Profile updated for user ID: ${user_id}`);

    // Send response back
    if (msg.properties.replyTo) {
        channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify({ success: true })), {
            correlationId: msg.properties.correlationId
        });
    }

    channel.ack(msg);
}

async function handleChangePassword(data, channel, msg) {
    const { user_id, newPassword } = data;
    console.log(`Changing password for user ID: ${user_id}`);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Password changed for user ID: ${user_id}`);

    // Send response back
    if (msg.properties.replyTo) {
        channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify({ success: true })), {
            correlationId: msg.properties.correlationId
        });
    }

    channel.ack(msg);
}

async function handleListBookings(data, channel, msg) {
    const { user_id } = data;
    console.log(`Fetching bookings for user ID: ${user_id}`);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Bookings data received for user ID: ${user_id}`);

    // Send response back
    if (msg.properties.replyTo) {
        channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify({ success: true, bookings: [] })), {
            correlationId: msg.properties.correlationId
        });
    }

    channel.ack(msg);
}

// Start the server
app.listen(PORT, () => {
    console.log(`Profile service is running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', closeConnections);
process.on('SIGTERM', closeConnections);
