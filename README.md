# 🪖 Soldier Sign-Out System

A comprehensive Node.js web application for tracking military group sign-outs with secure authentication, real-time monitoring, and detailed logging capabilities.

## ✨ Features

### Core Functionality

- **Group Sign-Outs**: Track groups of soldiers with their locations and purposes
- **Real-Time Monitoring**: Live duration tracking with status indicators
- **Secure Authentication**: Username/password login with PIN verification for actions
- **Comprehensive Logging**: Full audit trail with filtering and CSV export
- **Multi-User Support**: NCO/Admin user management with role-based access

### Dashboard Features

- **Current Sign-Outs**: View all currently signed-out groups with live duration
- **Status Indicators**: Visual alerts for overdue sign-outs (🟢 Normal, 🟡 4+ hours, 🔴 8+ hours)
- **Quick Actions**: One-click sign-in with PIN verification
- **Statistics**: Real-time counts of current, daily, and total sign-outs

### Logs & Reporting

- **Advanced Filtering**: Filter by date range, soldier name, location, or status
- **CSV Export**: Export filtered logs for external reporting
- **Complete Audit Trail**: Track who signed out/in each group and when
- **Duration Tracking**: Automatic calculation of time spent signed out

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ and npm
- Git (for cloning)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd JS
   ```
2. **Install dependencies**

   ```bash
   npm install
   ```
3. **Start the development server**

   ```bash
   npm run dev
   ```
4. **Access the application**

   - Open your browser to `http://localhost:3000`
   - You'll be redirected to the login page

## 🔐 Authentication

### Default Admin Account

- **Username**: `admin`
- **Password**: `admin123`
- **PIN**: `1234`

## 📚 User Guide

### Logging In

1. Navigate to the application URL
2. Enter your username and password
3. Click "Sign In"

### Creating a Sign-Out

1. Click "New Sign-Out" on the dashboard
2. Enter soldier names (comma-separated)
3. Specify the location/destination
4. Add optional notes
5. Enter your PIN to confirm
6. Click "Sign Out"

### Signing In Soldiers

1. Find the group in the "Current Sign-Outs" table
2. Click the "Sign In" button
3. Enter your PIN to confirm
4. Click "Confirm Sign In"

### Viewing Logs

1. Click "View Logs" to switch to the logs view
2. Use filters to narrow down results:
   - Date range
   - Soldier name
   - Location
   - Status (Out/In)
3. Click "Export CSV" to download filtered results

## 🛠 Technical Details

### Technology Stack

- **Backend**: Node.js with Express.js framework
- **Database**: SQLite3 for data persistence
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Security**: Helmet, CORS, rate limiting, bcrypt password hashing
- **Session Management**: express-session with secure configuration

### Database Schema

#### Users Table

- `id`: Primary key
- `username`: Unique username
- `password_hash`: Bcrypt hashed password
- `pin_hash`: Bcrypt hashed PIN
- `rank`: Military rank
- `full_name`: Full name
- `is_active`: Account status
- `created_at`, `last_login`: Timestamps

#### SignOuts Table

- `id`: Primary key
- `signout_id`: Unique sign-out identifier (SO240627-1234 format)
- `soldier_names`: Comma-separated list of soldiers
- `location`: Destination/purpose
- `sign_out_time`, `sign_in_time`: Timestamps
- `signed_out_by_id`, `signed_in_by_id`: User references
- `status`: 'OUT' or 'IN'
- `notes`: Optional additional information

### Security Features

- Password hashing with bcrypt
- PIN verification for all actions
- Session-based authentication
- CSRF protection
- Rate limiting
- Input validation and sanitization
- SQL injection prevention with parameterized queries

### API Endpoints

#### Authentication

- `POST /api/auth/system` - System password authentication
- `POST /api/auth/user` - User PIN authentication  
- `POST /api/auth/logout` - User logout
- `GET /api/auth/status` - Check authentication status

#### Sign-Outs

- `GET /api/signouts/current` - Get currently signed-out groups
- `GET /api/signouts/logs` - Get filtered sign-out logs
- `GET /api/signouts/logs/export` - Export logs as CSV
- `POST /api/signouts` - Create new sign-out (requires PIN)
- `PATCH /api/signouts/:id/signin` - Sign in group (requires PIN)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-secret-session-key-change-this-in-production
SQLITE_DB_PATH=./data/soldiers.db
```

### Production Considerations

- Change default admin credentials
- Use a strong session secret
- Enable HTTPS
- Configure proper logging
- Set up database backups
- Consider using PostgreSQL/MySQL for high-volume environments

## 🧪 Testing

### Run API Tests

```bash
node test-api.js
```

### Add Test Data

```bash
node test-data.js
```

### Manual Testing Workflow

1. Login with admin credentials
2. Create a few sign-outs with different soldiers and locations
3. Test sign-in functionality with PIN verification
4. View logs and test filtering
5. Export CSV to verify data integrity
6. Test logout and re-login

## 📁 Project Structure

```
JS/
├── server.js                 # Main application server
├── package.json             # Dependencies and scripts
├── .env                     # Environment configuration
├── data/                    # Database storage
│   └── soldiers.db          # SQLite database
├── src/                     # Source code
│   ├── database/
│   │   └── database.js      # Database abstraction layer
│   └── routes/
│       └── soldiers.js      # API routes
├── public/                  # Static frontend files
│   ├── index.html          # Main dashboard
│   ├── login.html          # Login page
│   ├── SoldierSignOutApp.js   # Main Frontend JavaScript Controller
│   └── styles.css          # Styles
└── test-*.js               # Test utilities
```

## 🚧 Development

### Adding New Features

1. Database changes: Update `src/database/database.js`
2. API endpoints: Add to `src/routes/soldiers.js`
3. Frontend: Update `public/SoldierSignOutApp.js` and `public/index.html`
4. Styling: Modify `public/styles.css`

### Best Practices

- Always use parameterized queries for database operations
- Validate input on both client and server sides
- Require PIN verification for all state-changing operations
- Follow military terminology and conventions
- Implement proper error handling and user feedback

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues, questions, or feature requests, please create an issue in the repository.
This starts the server with nodemon for auto-reloading on file changes.

### Building for Production

```bash
npm start
```

## Security Features

- **Helmet.js**: Sets various HTTP headers for security
- **CORS**: Cross-Origin Resource Sharing configuration
- **Rate Limiting**: Prevents abuse with request rate limiting
- **Input Validation**: Server-side validation of all inputs
- **SQL Injection Protection**: Parameterized queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Support

For support or questions, please open an issue in the repository.
