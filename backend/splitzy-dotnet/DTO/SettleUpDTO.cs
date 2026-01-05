namespace splitzy_dotnet.DTO
{
    public class SettleUpDTO
    {
        public int GroupId { get; set; }
        public int PaidByUserId { get; set; }   // who pays
        public int PaidToUserId { get; set; }   // who receives
        public decimal Amount { get; set; }
    }
}
