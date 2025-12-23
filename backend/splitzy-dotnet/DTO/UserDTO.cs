namespace splitzy_dotnet.DTO
{
    public class UserDTO
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public decimal TotalBalance { get; set; }
        public decimal YouOwe { get; set; }
        public decimal YouAreOwed { get; set; }
        public List<PersonAmount> OweTo { get; set; } = new();
        public List<PersonAmount> OwedFrom { get; set; } = new();
        public List<GroupSummary> GroupWiseSummary { get; set; } = new();
    }
    public class PersonAmount
    {
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }

    public class GroupSummary
    {
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public decimal NetBalance { get; set; }
    }
    public class LoginUserDTO
    {
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public DateTime? CreatedAt { get; set; }
    }
    public class LoginRequestDTO
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
    }
    public class SignupRequestDTO
    {
        public required string Name { get; set; } 
        public required string Email { get; set; }
        public required string Password { get; set; }
    }
    public class GoogleLoginRequestDTO
    {
        public string IdToken { get; set; }
    }
}
