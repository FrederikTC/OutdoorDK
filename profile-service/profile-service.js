const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const amqp = require('amqplib/callback_api');

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

// RabbitMQ setup
const PROFILE_SERVICE_QUEUE = 'profile_service';

amqp.connect('amqp://localhost', (err, conn) => {
    if (err) {
        throw err;
    }
    conn.createChannel((err, channel) => {
        if (err) {
            throw err;
        }

        channel.assertQueue(PROFILE_SERVICE_QUEUE, { durable: true });

        channel.consume(PROFILE_SERVICE_QUEUE, async (msg) => {
            if (msg !== null) {
                const messageContent = JSON.parse(msg.content.toString());

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
            }
        }, {
            noAck: false
        });
    });
});

// Profile handlers
async function handleGetProfile(data, channel, msg) {
    const { user_id } = data;
    // Implement the logic to get the profile based on user_id
    console.log(`Fetching profile for user ID: ${user_id}`);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Profile data received for user ID: ${user_id}`);
    channel.ack(msg);
}

async function handleUpdateProfile(data, channel, msg) {
    const { user_id, ...updateData } = data;
    // Implement the logic to update the profile based on user_id
    console.log(`Updating profile for user ID: ${user_id}`);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Profile updated for user ID: ${user_id}`);
    channel.ack(msg);
}

async function handleChangePassword(data, channel, msg) {
    const { user_id, newPassword } = data;
    // Implement the logic to change the password based on user_id
    console.log(`Changing password for user ID: ${user_id}`);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Password changed for user ID: ${user_id}`);
    channel.ack(msg);
}

async function handleListBookings(data, channel, msg) {
    const { user_id } = data;
    // Implement the logic to list bookings based on user_id
    console.log(`Fetching bookings for user ID: ${user_id}`);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Bookings data received for user ID: ${user_id}`);
    channel.ack(msg);
}

// Start the server
app.listen(PORT, () => {
    console.log(`Profile service is running on port ${PORT}`);
});
