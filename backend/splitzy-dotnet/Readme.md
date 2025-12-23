# Splitzy .NET Backend

Splitzy is a group expense management API built with ASP.NET Core (.NET 8) and Entity Framework Core, using PostgreSQL as the database. It supports user authentication via JWT, group creation, expense tracking, and settlement calculation.

---

## Features

- **User Authentication**: Secure login with JWT token.
- **Group Management**: Create groups, add multiple users, view group details.
- **Expense Tracking**: Add expenses, split by equal, percentage, or exact amounts.
- **Settlement Calculation**: Simplifies debts between group members.
- **Swagger API Documentation**: Interactive API testing with JWT support.

---

## Technologies Used

- ASP.NET Core (.NET 8)
- Entity Framework Core (PostgreSQL)
- JWT Authentication
- Swagger (OpenAPI)
- C#

---

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [PostgreSQL](https://www.postgresql.org/download/)
- Visual Studio 2022 or VS Code

### Setup

1. **Clone the repository**
```
git clone <your-repo-url>
cd splitzy-dotnet
```

2. **Configure the database**
   - Update `appsettings.json` or `appsettings.Development.json` with your PostgreSQL connection string under `DefaultConnection`.
   - Set JWT settings (`Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience`, `Jwt:ExpiryInMinutes`).

3. **Apply migrations**
```
dotnet ef database update
```

4. **Run the application**
```
dotnet run
```
The API will be available at `https://localhost:5001` (or your configured port).

5. **Access Swagger UI**
- Navigate to `/swagger` in your browser for interactive API documentation.

---

## API Endpoints

### Authentication

- **POST** `/api/Auth/login`
- Request:
 ```json
 {
   "email": "alice@example.com",
   "password": "your_password"
 }
 ```
- Response:
 ```json
 {
   "Message": "Login Succesfully",
   "Id": 1,
   "Token": "<JWT_TOKEN>"
 }
 ```

### Group Management

- **POST** `/api/Group/CreateGroup`
- Create a group and add users.
- Request:
 ```json
 {
   "groupName": "Trip to Goa",
   "userIds": [1, 2, 3]
 }
 ```
- Response:
 ```json
 {
   "GroupId": 1,
   "GroupName": "Trip to Goa",
   "CreatedAt": "2025-07-25T12:34:56Z",
   "Members": [
     { "UserId": 1, "Name": "Alice", "Email": "alice@example.com" },
     { "UserId": 2, "Name": "Bob", "Email": "bob@example.com" }
   ]
 }
 ```

- **GET** `/api/Group/GetGroupSummary/{groupId}`
- Returns:
 ```json
 {
   "GroupId": 1,
   "GroupName": "Trip to Goa",
   "TotalMembers": 3,
   "Usernames": ["Alice", "Bob", "Charlie"],
   "Expenses": [
     { "PaidBy": "Alice", "Name": "Hotel", "Amount": 3000 },
     { "PaidBy": "Bob", "Name": "Food", "Amount": 1500 }
   ]
 }
 ```

### Expense Management

- **POST** `/api/Expense/AddExpense`
- Add an expense to a group.
- Request:
 ```json
 {
   "name": "Dinner",
   "amount": 1200,
   "groupId": 1,
   "paidByUserId": 2,
   "splitType": "Equal",
   "splitDetails": { "1": 0.5, "2": 0.5 }
 }
 ```
- Response:
 ```json
 {
   "message": "Expense added successfully",
   "expenseId": 5,
   "simplifiedTransactions": [
     { "FromUser": 1, "ToUser": 2, "Amount": 600 }
   ]
 }
 ```

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
- `Models/` - Entity models
- `DTO/` - Data transfer objects
- `Services/` - Business logic (JWT, hashing, expense simplification)
- `Program.cs` - Application startup/configuration