const amqp = require('amqplib');

let connection;
let channel;

async function connectRabbitMQ() {
    if (connection && channel) {
        return;
    }

    try {
        connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        throw error;
    }
}

async function publishToQueue(queueName, message, correlationId, replyTo) {
    if (!channel) {
        throw new Error('RabbitMQ channel is not initialized');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));

    channel.sendToQueue(queueName, messageBuffer, {
        correlationId,
        replyTo
    });

    console.log(`Message sent to ${queueName}:`, message);
}

async function consumeQueue(queueName, onMessage) {
    if (!channel) {
        throw new Error('RabbitMQ channel is not initialized');
    }

    await channel.assertQueue(queueName, { durable: true });
    console.log(`Waiting for messages in ${queueName}`);

    return channel.consume(queueName, async (msg) => {
        if (msg !== null) {
            const messageContent = JSON.parse(msg.content.toString());
            try {
                await onMessage(messageContent, msg); // Passing msg to onMessage callback
                channel.ack(msg);
            } catch (error) {
                console.error('Error processing message:', error);
            }
        }
    });
}

async function closeRabbitMQ() {
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('RabbitMQ connection closed');
    } catch (error) {
        console.error('Error closing RabbitMQ connection:', error);
    }
}

module.exports = {
    connectRabbitMQ,
    publishToQueue,
    consumeQueue,
    closeRabbitMQ,
};
