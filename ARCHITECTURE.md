# System Architecture Documentation

## Components
- **Frontend**: Developed using React.js for a responsive and dynamic user interface.
- **Backend**: Node.js with Express.js for handling API requests.
- **Database**: MongoDB for storing user data and application state.
- **Storage**: Backblaze B2 for storing large files and backups.

## Technology Stack
- **Languages**: JavaScript (Node.js and React.js)
- **Database**: MongoDB
- **Server**: Nginx for serving the application and providing reverse proxy capabilities.

## Data Flow
1. The user interacts with the frontend (React.js interface).
2. API requests are sent to the backend (Node.js + Express.js).
3. The backend processes these requests and interacts with MongoDB for data storage and retrieval.
4. Media files are stored in Backblaze B2, accessed via the backend if needed.
5. Responses are sent back to the frontend.

## Security
- HTTPS is enforced for all connections to ensure data security.
- Input validation and sanitation are enforced in the backend to prevent SQL injection and XSS attacks.
- Sensitive information is stored securely in environment variables.

## Deployment on OVH Server without Docker
1. SSH into the OVH server.
2. Install Node.js and Nginx.
3. Clone the repository from GitHub:
   ```bash
   git clone https://github.com/Salty-Dragon/rtm-asset-explorer.git
   cd rtm-asset-explorer
   npm install
   ```
4. Build the React app:
   ```bash
   npm run build
   ```
5. Configure Nginx as follows:
   ```nginx
   server {
       listen 80;
       server_name your_domain.com;
       location / {
           root /path/to/rtm-asset-explorer/build;
           try_files $uri /index.html;
       }
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
6. Start the Node.js application using PM2:
   ```bash
   pm2 start server.js
   ```

## Backblaze Backups
- Regular backups of necessary files are scheduled using Backblaze B2 SDK to upload files to the cloud.

## Logging with Winston
- Implement Winston logging in the Node.js backend to track errors and important information:
   ```javascript
   const winston = require('winston');

   const logger = winston.createLogger({
       level: 'info',
       format: winston.format.json(),
       transports: [
           new winston.transports.File({ filename: 'error.log', level: 'error' }),
           new winston.transports.File({ filename: 'combined.log' })
       ]
   });
   ```

## Monitoring
- Utilize uptime monitoring services like UptimeRobot or create custom monitoring scripts to ensure the application is running smoothly without downtime.