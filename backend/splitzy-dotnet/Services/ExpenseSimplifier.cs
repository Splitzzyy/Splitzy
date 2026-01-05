using splitzy_dotnet.DTO;

public static class ExpenseSimplifier
{
    public static List<ExpensesDTO> Simplify(Dictionary<int, decimal> netBalances)
    {
        var result = new List<ExpensesDTO>();

        while (true)
        {
            var creditor = netBalances
                .Where(x => x.Value > 0.01m)
                .OrderByDescending(x => x.Value)
                .FirstOrDefault();

            var debtor = netBalances
                .Where(x => x.Value < -0.01m)
                .OrderBy(x => x.Value)
                .FirstOrDefault();

            if (creditor.Key == 0 || debtor.Key == 0)
                break;

            var amount = Math.Min(creditor.Value, -debtor.Value);

            netBalances[creditor.Key] -= amount;
            netBalances[debtor.Key] += amount;

            result.Add(new ExpensesDTO
            {
                FromUser = debtor.Key,
                ToUser = creditor.Key,
                Amount = Math.Round(amount, 2)
            });
        }

        return result;
    }
}
