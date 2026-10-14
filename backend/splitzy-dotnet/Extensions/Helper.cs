using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.Models;

namespace splitzy_dotnet.Extensions
{
    public static class Helper
    {
        public static decimal Normalize(decimal value)
        {
            return Math.Round(value, 2, MidpointRounding.AwayFromZero);
        }

        public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

        // Row locks held until the current transaction ends, so concurrent writers to the same group/user run
        // one after another and read each other's committed state. FOR NO KEY UPDATE still lets other
        // transactions insert rows that reference the locked one. No-op on the in-memory test provider.

        public static async Task LockGroupAsync(this SplitzyContext db, int groupId)
        {
            if (db.Database.IsRelational())
                await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM groups WHERE group_id = {groupId} FOR NO KEY UPDATE");
        }

        public static async Task LockUserAsync(this SplitzyContext db, int userId)
        {
            if (db.Database.IsRelational())
                await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM users WHERE user_id = {userId} FOR NO KEY UPDATE");
        }
    }
}
