
<img width="1536" height="1024" alt="ChatGPT Image Dec 26, 2025, 02_12_24 PM" src="https://github.com/user-attachments/assets/3fc5f000-7918-4bc9-b418-8dd3a2a20fe8" />

## Overview

Splitzy is a modern expense sharing platform that simplifies splitting bills and managing shared expenses with friends, roommates, and groups. Whether you're sharing dinner costs, splitting rent, or managing group travel expenses, Splitzy makes it easy to track who owes what and settle up seamlessly.

## Features

- **👥 Group Management**: Create and manage expense groups with multiple participants
- **💸 Easy Expense Tracking**: Add expenses with customizable splitting options
- **📊 Smart Calculations**: Automatic calculation of who owes whom and how much
- **🔄 Multiple Split Types**: 
  - Equal splits
  - Custom amounts
  - Percentage-based splits
  - Share-based splits
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **💳 Settlement Tracking**: Keep track of payments and settle debts
- **📈 Expense Analytics**: Visual insights into spending patterns
- **🔐 Secure Authentication**: Safe and secure user authentication
- **📧 Notifications**: Email reminders for pending expenses and settlements

## Tech Stack

- **Frontend**: Angular
- **Backend**: DotNet
- **Database**: MySQL
- **Authentication**: OAuth
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- [Database system] installed and running

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shubhamashish33/Splitzy.git
   cd Splitzy
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies (if separate)
   cd client
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   npm run migrate
   
   # Seed initial data (optional)
   npm run seed
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run start
   ```

The application will be available at `http://localhost:3000`

## Usage

### Creating Your First Group

1. Sign up or log in to your account
2. Click "Create Group" on the dashboard
3. Add group members by email
4. Start adding expenses!

### Adding Expenses

1. Select your group
2. Click "Add Expense"
3. Enter expense details (amount, description, date)
4. Choose how to split the expense
5. Save and notify group members

### Settling Up

1. View your balance in any group
2. Click "Settle Up" to record payments
3. Choose payment method and amount
4. Confirm settlement

## API Documentation

### Authentication Endpoints

```
POST /api/auth/register - Register new user
POST /api/auth/login - User login
POST /api/auth/logout - User logout
GET /api/auth/me - Get current user
```

### Group Endpoints

```
GET /api/groups - Get user's groups
POST /api/groups - Create new group
GET /api/groups/:id - Get group details
PUT /api/groups/:id - Update group
DELETE /api/groups/:id - Delete group
POST /api/groups/:id/members - Add member to group
```

### Expense Endpoints

```
GET /api/groups/:id/expenses - Get group expenses
POST /api/groups/:id/expenses - Create new expense
PUT /api/expenses/:id - Update expense
DELETE /api/expenses/:id - Delete expense
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write clean, documented code
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Using Docker

```bash
# Build the image
docker build -t splitzy .

# Run the container
docker run -p 3000:3000 splitzy
```

### Manual Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Start the production server: `npm run start`

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=your_database_url
DB_HOST=localhost
DB_PORT=5432
DB_NAME=splitzy
DB_USER=your_username
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Application
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:3000
```

## Roadmap

- [ ] Mobile app (React Native/Flutter)
- [ ] Receipt scanning with OCR
- [ ] Multiple currency support
- [ ] Expense categories and budgeting
- [ ] Integration with banking APIs
- [ ] Advanced analytics and reporting
- [ ] Recurring expenses
- [ ] Expense approval workflows

## FAQ

**Q: How are expenses calculated?**
A: Splitzy automatically calculates the optimal way to settle debts, minimizing the number of transactions needed.

**Q: Can I use Splitzy offline?**
A: Currently, Splitzy requires an internet connection. Offline support is planned for future releases.

**Q: Is my financial data secure?**
A: Yes, we use industry-standard encryption and security practices to protect your data.

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/shubhamashish33/Splitzy/issues)
- 📚 Documentation: [Wiki](https://github.com/shubhamashish33/Splitzy/wiki)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Splitwise and similar expense sharing apps
- Thanks to all contributors who have helped improve Splitzy

---

⭐ If you find Splitzy helpful, please give it a star on GitHub!
