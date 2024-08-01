// utils/rabbitmq.js
const amqp = require('amqplib/callback_api');

let channel = null;

amqp.connect('amqp://localhost', (err, conn) => {
    if (err) {
        throw err;
    }
    conn.createChannel((err, ch) => {
        if (err) {
            throw err;
        }
        channel = ch;
    });
});

function publishToQueue(queueName, data) {
    if (channel) {
        channel.assertQueue(queueName, { durable: true });
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), { persistent: true });
    }
}

function consumeQueue(queueName, callback) {
    if (channel) {
        channel.assertQueue(queueName, { durable: true });
        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                console.log(`Received message: ${msg.content.toString()}`);
                const messageContent = JSON.parse(msg.content.toString());
                await callback(messageContent);
                channel.ack(msg);
            }
        }, { noAck: false });
    }
}

module.exports = { publishToQueue, consumeQueue };
