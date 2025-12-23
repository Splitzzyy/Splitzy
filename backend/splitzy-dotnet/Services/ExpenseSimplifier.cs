using splitzy_dotnet.DTO;

namespace splitzy_dotnet.Services
{
    public class ExpenseSimplifier
    {
        public static List<ExpensesDTO> Simplify(Dictionary<int, decimal> netBalances)
        {
            List<ExpensesDTO> result = [];

            while (true)
            {
                var maxCreditor = netBalances.Aggregate((l, r) => l.Value > r.Value ? l : r).Key;
                var maxDebtor = netBalances.Aggregate((l, r) => l.Value < r.Value ? l : r).Key;

                // Break if all balances are settled
                if (netBalances.Values.All(v => Math.Abs(v) <= 0.01m))
                    break;

                var amount = Math.Min(-netBalances[maxDebtor], netBalances[maxCreditor]);

                netBalances[maxCreditor] -= amount;
                netBalances[maxDebtor] += amount;

                result.Add(new ExpensesDTO
                {
                    FromUser = maxDebtor,
                    ToUser = maxCreditor,
                    Amount = Math.Round(amount, 2)
                });
            }

            return result;
        }
    }
}
