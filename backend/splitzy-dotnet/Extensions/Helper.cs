namespace splitzy_dotnet.Extensions
{
    public static class Helper
    {
        public static decimal Normalize(decimal value)
        {
            return Math.Round(value, 2, MidpointRounding.AwayFromZero);
        }
    }
}
