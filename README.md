# DLS-OutdoorDK
This project is a Shelter Booking System implemented using a microservices architecture. It allows users to register, log in, view and update their profiles, book shelters, and view their booking history. Admins can create and update shelter information.

Before you begin, ensure you have met the following requirements:
- Node.js: Version 14.x or later
- MySQL: Version 5.7 or later
- Git: Version control system to clone the repository

# Clone the Repository #
Clone this repository to your local machine using the following command:

git clone [https://github.com/yourusername/shelter-booking-system.git](https://github.com/FrederikTC/OutdoorDK.git)
cd OutdoorDK

# For main-app
cd main-app
npm install

# For auth-service
cd ../auth-service
npm install

# For profile-service
cd ../profile-service
npm install

# For shelter-service
cd ../shelter-service
npm install

# Create a .env file in each service directory

# Start the Authentication Service
cd auth-service
npm run dev

# Start the Profile Service
cd ../profile-service
npm run dev

# Start the Shelter Service
cd ../shelter-service
npm run dev

# Start the Main Application
cd ../main-app
npm start







 
