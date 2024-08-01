const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const session = require('express-session');
const bodyParser = require('body-parser');
const amqp = require('amqplib/callback_api');

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

// RabbitMQ setup
const SHELTER_SERVICE_QUEUE = 'shelter_service';

amqp.connect('amqp://localhost', (err, conn) => {
    if (err) {
        throw err;
    }
    conn.createChannel((err, channel) => {
        if (err) {
            throw err;
        }

        channel.assertQueue(SHELTER_SERVICE_QUEUE, { durable: true });

        channel.consume(SHELTER_SERVICE_QUEUE, async (msg) => {
            if (msg !== null) {
                const messageContent = JSON.parse(msg.content.toString());

                switch (messageContent.action) {
                    case 'create_shelter':
                        await handleCreateShelter(messageContent.data, channel, msg);
                        break;
                    case 'list_shelters':
                        await handleListShelters(channel, msg);
                        break;
                    case 'book_shelter':
                        await handleBookShelter(messageContent.data, channel, msg);
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

// Shelter creation handler
async function handleCreateShelter(data, channel, msg) {
    const { name, location, description } = data;

    if (!name || !location || !description) {
        console.log('Please provide all required fields: name, location, description');
        return channel.ack(msg);
    }

    const query = 'INSERT INTO shelters (name, location, description) VALUES (?, ?, ?)';

    db.query(query, [name, location, description], (error, results) => {
        if (error) {
            console.log('Internal Server Error');
            return channel.ack(msg);
        }
        console.log('Shelter created successfully', { shelterId: results.insertId });
        channel.ack(msg);
    });
}

// List shelters handler
async function handleListShelters(channel, msg) {
    const query = 'SELECT * FROM shelters';

    db.query(query, (error, results) => {
        if (error) {
            console.log('Internal Server Error');
            return channel.ack(msg);
        }
        console.log('Shelters fetched successfully', results);
        channel.ack(msg);
    });
}

// Shelter booking handler
async function handleBookShelter(data, channel, msg) {
    const { user_id, shelter_id, booking_date } = data;

    if (!user_id || !shelter_id || !booking_date) {
        console.log('Please provide all required fields: user_id, shelter_id, booking_date');
        return channel.ack(msg);
    }

    const query = 'INSERT INTO bookings (user_id, shelter_id, booking_date) VALUES (?, ?, ?)';

    db.query(query, [user_id, shelter_id, booking_date], (error, results) => {
        if (error) {
            console.log('Internal Server Error');
            return channel.ack(msg);
        }
        console.log('Shelter booked successfully', { bookingId: results.insertId });
        channel.ack(msg);
    });
}

// List bookings handler
async function handleListBookings(data, channel, msg) {
    const { userId } = data;

    const query = 'SELECT * FROM bookings WHERE user_id = ?';

    db.query(query, [userId], (error, results) => {
        if (error) {
            console.log('Internal Server Error');
            return channel.ack(msg);
        }
        console.log('Bookings fetched successfully', results);
        channel.ack(msg);
    });
}

// Start the server (optional, if you still want to expose HTTP endpoints)
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Shelter management service is running on port ${port}`);
});
