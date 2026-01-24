using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.Models;

namespace spllitzy_dotnet_tests
{
    /// <summary>
    /// Helper class for setting up test database and test data
    /// </summary>
    public static class TestHelper
    {
        /// <summary>
        /// Creates an in-memory SplitzyContext for testing
        /// </summary>
        public static SplitzyContext CreateTestContext()
        {
            var options = new DbContextOptionsBuilder<SplitzyContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new SplitzyContext(options);
        }

        /// <summary>
        /// Creates a test user
        /// </summary>
        public static User CreateTestUser(string email = "test@example.com", string name = "Test User")
        {
            return new User
            {
                Email = email,
                Name = name,
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            };
        }

        /// <summary>
        /// Creates a test group
        /// </summary>
        public static Group CreateTestGroup(string name = "Test Group")
        {
            return new Group
            {
                Name = name,
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            };
        }

        /// <summary>
        /// Creates a test group member
        /// </summary>
        public static GroupMember CreateTestGroupMember(int groupId, int userId)
        {
            return new GroupMember
            {
                GroupId = groupId,
                UserId = userId,
                JoinedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            };
        }

        /// <summary>
        /// Creates a test group balance
        /// </summary>
        public static GroupBalance CreateTestGroupBalance(int groupId, int userId, decimal netBalance = 0)
        {
            return new GroupBalance
            {
                GroupId = groupId,
                UserId = userId,
                NetBalance = netBalance
            };
        }

        /// <summary>
        /// Creates a test expense
        /// </summary>
        public static Expense CreateTestExpense(int groupId, int paidByUserId, decimal amount = 100, string name = "Test Expense")
        {
            return new Expense
            {
                GroupId = groupId,
                PaidByUserId = paidByUserId,
                Amount = amount,
                Name = name,
                SplitPer = "[]",
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            };
        }

        /// <summary>
        /// Creates a test expense split
        /// </summary>
        public static ExpenseSplit CreateTestExpenseSplit(int expenseId, int userId, decimal owedAmount)
        {
            return new ExpenseSplit
            {
                ExpenseId = expenseId,
                UserId = userId,
                OwedAmount = owedAmount
            };
        }

        /// <summary>
        /// Creates a test settlement
        /// </summary>
        public static Settlement CreateTestSettlement(int groupId, int paidBy, int paidTo, decimal amount)
        {
            return new Settlement
            {
                GroupId = groupId,
                PaidBy = paidBy,
                PaidTo = paidTo,
                Amount = amount,
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            };
        }

        /// <summary>
        /// Seed a context with basic test data
        /// </summary>
        public static async Task SeedTestDataAsync(SplitzyContext context)
        {
            // Create users
            var user1 = CreateTestUser("user1@example.com", "User One");
            var user2 = CreateTestUser("user2@example.com", "User Two");
            var user3 = CreateTestUser("user3@example.com", "User Three");

            context.Users.AddRange(user1, user2, user3);
            await context.SaveChangesAsync();

            // Create group
            var group = CreateTestGroup("Test Group");
            context.Groups.Add(group);
            await context.SaveChangesAsync();

            // Add group members
            context.GroupMembers.AddRange(
                CreateTestGroupMember(group.GroupId, user1.UserId),
                CreateTestGroupMember(group.GroupId, user2.UserId),
                CreateTestGroupMember(group.GroupId, user3.UserId)
            );

            // Create balances
            context.GroupBalances.AddRange(
                CreateTestGroupBalance(group.GroupId, user1.UserId, 50),
                CreateTestGroupBalance(group.GroupId, user2.UserId, -30),
                CreateTestGroupBalance(group.GroupId, user3.UserId, -20)
            );

            await context.SaveChangesAsync();
        }
    }
}
