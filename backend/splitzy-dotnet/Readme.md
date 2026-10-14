# Splitzy .NET Backend

Splitzy is a group expense management API built with ASP.NET Core (.NET 10) and Entity Framework Core, using PostgreSQL as the database. It supports JWT and Google authentication, groups, expenses, settlements and email notifications.

---

## Features

- **Authentication**: Email/password signup with email verification, Google sign-in, JWT access tokens with refresh tokens.
- **Group Management**: Create groups and add people by email, including people who have not signed up yet (see [Invited users](#invited-users-placeholder-accounts)).
- **Expense Tracking**: Add, update and delete expenses split by exact amounts between group members.
- **Settlement**: Record payments between members; balances are kept per group.
- **Email Notifications**: Sent asynchronously through RabbitMQ (`EmailConsumer`).
- **Swagger API Documentation**: Interactive API testing with JWT support.

---

## Technologies Used

- ASP.NET Core (.NET 10)
- Entity Framework Core 10 + Npgsql (PostgreSQL)
- RabbitMQ (email queue)
- JWT Authentication
- Swagger (OpenAPI)
- NUnit + Moq (tests)

---

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download) (pinned in `global.json`)
- [PostgreSQL](https://www.postgresql.org/download/)
- [RabbitMQ](https://www.rabbitmq.com/) for email delivery

### Setup

1. **Clone the repository**
```
git clone https://github.com/Splitzzyy/Splitzy.git
cd Splitzy/backend/splitzy-dotnet
```

2. **Configure settings** (environment variables or a local, untracked settings file; never commit real secrets)
   - `Postgres:ConnectionString`
   - `Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience`, `Jwt:ExpiryMinutes`
   - `OtpJwt:Key`
   - `MessagingService:*` (RabbitMQ host, port, credentials and queue names)
   - `Email:*` (SMTP sender) and `Google:ClientId`

   Environment variables use `__` as the separator, e.g. `Postgres__ConnectionString`.

3. **Run the application**
```
dotnet run
```
   Pending EF Core migrations are applied automatically at startup. To apply them manually:
```
dotnet tool restore
dotnet ef database update
```

4. **Access Swagger UI**
- Navigate to `/swagger` in your browser for interactive API documentation.

5. **Run the tests**
```
dotnet test ../spllitzy-dotnet-tests
```

---

## Invited users (placeholder accounts)

Adding an email that has no account (`CreateGroup` or `AddUsersToGroup`) creates a **placeholder user**: a normal `users` row with `is_registered = false` and no password. The placeholder becomes a group member immediately, so expenses can be split with them and they appear in the group.

- Placeholders cannot log in or reset a password.
- When the person signs up with that email, the same row is claimed, so every expense, split and balance recorded for them is kept. It becomes registered once the email is verified. Google sign-in claims it immediately.
- Members in `GetGroupOverview` (and `CreateGroup` / `AddUsersToGroup` responses) include `IsRegistered`, so clients can show a "Pending" badge.
- Emails are stored and compared in lowercase.

## Rules worth knowing

- **Email verification**: password signups must verify their email before they can log in (`/api/Auth/verify-email`, `/api/Auth/resend-verification`).
- **Authorization**: group-scoped endpoints (expenses, settle-up, group overview/summary, add members, delete group) return `403` unless the caller is a member of the group. Payer and split users must be group members (`400` otherwise).
- **Concurrency**: writes that change a group's balances or members lock that group's row for the duration of the transaction, so parallel requests apply one after another.
- **Idempotency**: write endpoints (add/update/delete expense, settle-up, create group, add members, delete group, reminders) accept an optional `Idempotency-Key` header (max 100 chars, scoped per user, kept 24 hours).
  - The first request with a key runs; repeats with the same key and payload get the stored response with `Idempotent-Replayed: true` instead of running again.
  - A repeat that arrives while the first is still running waits for it (up to 10 s, then `409`).
  - Reusing a key for a different request returns `422`.
  - Only successful (2xx) responses are stored; a rejected or failed request releases its key, so it can be retried.
  - Requests without the header behave as before. The web and Android apps send a key automatically and reuse it when they resend the same request.

---

## API Endpoints (selection)

### Authentication

- **POST** `/api/Auth/signup` – `{ "name": "Alice", "email": "alice@example.com", "password": "..." }` → `201`, sends a verification email.
- **POST** `/api/Auth/login` – `{ "email": "alice@example.com", "password": "..." }`
- Response:
 ```json
 {
   "success": true,
   "message": "Login successful",
   "data": { "id": 1, "token": "<JWT_TOKEN>", "refreshToken": null }
 }
 ```
  Mobile clients send `X-Platform: mobile` to receive the refresh token in the body; web clients get it as an HTTP-only cookie.

### Group Management

- **POST** `/api/Group/CreateGroup`
- Request:
 ```json
 {
   "groupName": "Trip to Goa",
   "userEmails": ["bob@example.com", "new.friend@example.com"]
 }
 ```
- Response:
 ```json
 {
   "groupId": 1,
   "name": "Trip to Goa",
   "members": [
     { "userId": 1, "name": "Alice", "email": "alice@example.com", "isRegistered": true },
     { "userId": 2, "name": "Bob", "email": "bob@example.com", "isRegistered": true },
     { "userId": 3, "name": "new.friend", "email": "new.friend@example.com", "isRegistered": false }
   ]
 }
 ```

- **POST** `/api/Group/AddUsersToGroup/{groupId}` – `{ "userEmails": ["..."] }`. Unknown emails are invited as placeholders and listed in `invitedEmails`.
- **GET** `/api/Group/GetGroupOverview/{groupId}` – expenses, balances, settlements and members.
- **DELETE** `/api/Group/DeleteGroup/{groupId}` – only when all balances are settled.

### Expense Management

- **POST** `/api/Expense/AddExpense`
- Request:
 ```json
 {
   "groupId": 1,
   "name": "Dinner",
   "amount": 1200,
   "paidByUserId": 2,
   "category": 0,
   "splitDetails": [
     { "userId": 1, "amount": 600 },
     { "userId": 2, "amount": 600 }
   ]
 }
 ```
  Split amounts must add up to `amount`.
- **PUT** `/api/Expense/UpdateExpense` – same body plus `expenseId`; `groupId` must be the expense's group.
- **DELETE** `/api/Expense/DeleteExpense/{expenseId}`
- **POST** `/api/Settleup/settle-up` – `{ "groupId": 1, "paidByUserId": 1, "paidToUserId": 2, "amount": 600 }`

---

## Authentication in Swagger

1. Login via `/api/Auth/login` to get your JWT token.
2. Click the **Authorize** button in Swagger UI.
3. Enter your token as:
```
Bearer <your_token>
```
4. Now you can access protected endpoints.

---

## Project Structure

- `Controllers/` - API endpoints
- `Models/` - Entity models and `SplitzyContext`
- `DTO/` - Data transfer objects
- `Migrations/` - EF Core migrations (applied at startup)
- `Services/` - JWT, hashing, expense simplification, RabbitMQ producer/consumer
- `Templates/` - Email templates
- `Application/Startup.cs` - Service and middleware configuration
- `Program.cs` - Entry point
