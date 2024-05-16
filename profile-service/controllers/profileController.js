const bcrypt = require('bcryptjs');
const db = require('../models/Profile');

// Get user profile
exports.getProfile = (req, res) => {
    const userId = req.params.id;
    console.log(`Fetching profile for user ID: ${userId}`);
    
    db.query('SELECT * FROM users WHERE id = ?', [userId], (error, results) => {
        if (error) {
            console.error('Error fetching user profile:', error);
            return res.status(500).send('Internal Server Error: Database query failed');
        }
        if (results.length === 0) {
            console.log('No user found with this ID.');
            return res.status(404).send('User not found');
        }
        console.log('User profile fetched successfully:', results[0]);
        res.render('profile', { user: results[0] });
    });
};

// Update user profile
exports.updateProfile = (req, res) => {
    const userId = req.params.id;
    const { name, email } = req.body;
    console.log(`Updating profile for user ID: ${userId} with name: ${name}, email: ${email}`);

    db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId], (error, results) => {
        if (error) {
            console.error('Error updating user profile:', error);
            return res.status(500).send('Internal Server Error: Database update failed');
        }
        console.log('User profile updated successfully.');
        res.redirect(`/profiles/${userId}`);
    });
};

// Change user password
exports.changePassword = async (req, res) => {
    const userId = req.params.id;
    const { oldPassword, newPassword } = req.body;
    console.log(`Changing password for user ID: ${userId}`);

    db.query('SELECT password FROM users WHERE id = ?', [userId], async (error, results) => {
        if (error) {
            console.error('Error fetching user password:', error);
            return res.status(500).send('Internal Server Error: Database query failed');
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            console.log('Old password is incorrect.');
            return res.status(400).send('Old password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 8);
        db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], (error, results) => {
            if (error) {
                console.error('Error updating user password:', error);
                return res.status(500).send('Internal Server Error: Database update failed');
            }
            console.log('User password updated successfully.');
            res.redirect(`/profiles/${userId}`);
        });
    });
};

// Get user booking history
exports.getBookingHistory = (req, res) => {
    const userId = req.params.id;
    console.log(`Fetching booking history for user ID: ${userId}`);

    db.query('SELECT * FROM bookings WHERE user_id = ?', [userId], (error, results) => {
        if (error) {
            console.error('Error fetching booking history:', error);
            return res.status(500).send('Internal Server Error: Database query failed');
        }
        console.log('Booking history fetched successfully:', results);
        res.render('booking-history', { bookings: results });
    });
};
