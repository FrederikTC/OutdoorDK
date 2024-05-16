const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
    port: 3306
});

db.connect((error) => {
    if (error) {
        console.error('Database connection failed:', error);
    } else {
        console.log("MySQL connected...");
    }
});

module.exports = db;
