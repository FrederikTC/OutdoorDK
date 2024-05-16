const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

const authMiddleware = async (req, res, next) => {
    if (!req.session.userId) {
        console.log('User not logged in.');
        return res.redirect('/login');
    }

    try {
        const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/validate-session`, {
            headers: {
                'Authorization': `Bearer ${req.session.token}`
            }
        });

        if (response.data.valid) {
            next();
        } else {
            console.log('Invalid session.');
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Error validating session:', error);
        res.redirect('/login');
    }
};

module.exports = authMiddleware;
