# Soldier Sign-Out System

[CC BY-NC-ND 4.0][cc-by-nc-nd]

A comprehensive web-based application for tracking military soldier sign-outs and returns. This system provides real-time monitoring, secure authentication, and detailed logging capabilities for military unit management.

## Features

- **Real-time Tracking**: Monitor soldier sign-outs and returns in real-time
- **Secure Authentication**: Multi-level user authentication with role-based access
- **Barcode Integration**: Support for CAC card and ID barcode scanning
- **Comprehensive Logging**: Detailed audit trails and reporting
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Offline Capability**: Works with without network connectivity

## Technology Stack

- **Backend**: Node.js with Express.js framework
- **Database**: SQLite3 for data persistence
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (no frameworks)
- **Security**: Helmet, CORS, rate limiting, input validation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:

   ```bash
   git clone [repository-url]
   cd SignOutsJSFinal
   ```
2. Install dependencies:

   ```bash
   npm install
   ```
3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
4. Initialize the database:

   ```bash
   npm run setup
   ```
5. Start the development server:

   ```bash
   npm run dev
   ```
6. Open your browser and navigate to `http://localhost:3000`

### Production Deployment

For production deployment:

1. Set environment variables:

   ```bash
   export NODE_ENV=production
   export SESSION_SECRET=your-secure-secret
   export PORT=3000
   ```
2. Start the server:

   ```bash
   npm start
   ```

## Project Structure

```
├── server.js              # Main server file
├── setup.js               # Database initialization
├── package.json           # Project dependencies
├── data/                  # Database files
├── public/                # Static assets
│   ├── index.html         # Main application page
│   ├── login.html         # Authentication page
│   ├── css/               # Stylesheets
│   └── js/                # Client-side JavaScript
└── src/                   # Server-side source code
    ├── database/          # Database modules
    ├── middleware/        # Express middleware
    ├── routes/            # API routes
    └── utils/             # Utility functions
```

## API Endpoints

- `GET /` - Main application page
- `POST /api/auth/login` - User authentication
- `GET /api/signouts` - Retrieve sign-out records
- `POST /api/signouts` - Create new sign-out
- `PUT /api/signouts/:id` - Update sign-out record
- `GET /api/users` - User management
- `GET /api/health` - Health check endpoint

## Security Features

- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: API endpoints are protected against abuse
- **CORS Protection**: Cross-origin requests are properly configured
- **Helmet Security**: Security headers are automatically set
- **Session Management**: Secure session handling with proper expiration
- **SQL Injection Prevention**: Parameterized queries throughout

## Military Domain Features

- **Rank Structure**: Supports all military ranks and titles
- **Unit Organization**: Hierarchical unit structure support
- **Operational Status**: Track soldier availability and status
- **CAC Integration**: Common Access Card barcode support

## Development

### Code Style Guidelines

- Use modern JavaScript (ES6+) features
- Follow RESTful API conventions
- Use async/await for asynchronous operations
- Implement proper error handling and validation
- Use meaningful variable and function names
- Keep code clean and self-documenting

### Database Schema

The application uses SQLite with the following main tables:

- `users` - User accounts and authentication
- `soldiers` - Soldier profiles and information
- `signouts` - Sign-out records and tracking
- `preferences` - User and system preferences

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the code style guidelines
4. Test your changes thoroughly
5. Submit a pull request

## Configuration

Environment variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `SESSION_SECRET` - Session encryption key
- `DB_PATH` - Database file path

## Troubleshooting

### Common Issues

1. **Database Connection Error**: Ensure the database file exists and has proper permissions
2. **Port Already in Use**: Change the PORT environment variable
3. **Session Issues**: Verify SESSION_SECRET is set in production

### Logs

Application logs are written to the console. In production, consider redirecting to log files:

```bash
npm start > app.log 2>&1
```

## Support

For technical support or questions:

- Check the troubleshooting section
- Review the API documentation
- Contact the development team

## License

This work is licensed under a
[Creative Commons Attribution-NonCommercial-NoDerivs 4.0 International License][cc-by-nc-nd].

[CC BY-NC-ND 4.0][cc-by-nc-nd]

[cc-by-nc-nd]: http://creativecommons.org/licenses/by-nc-nd/4.0/
[cc-by-nc-nd-image]: https://licensebuttons.net/l/by-nc-nd/4.0/88x31.png
[cc-by-nc-nd-shield]: https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg
