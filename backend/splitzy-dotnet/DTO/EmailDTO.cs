namespace splitzy_dotnet.DTO
{
    public record WelcomeRequest(string To, string UserName);

    public record ReminderRequest(
            string To,
            string UserName,
            decimal Amount,
            string GroupName,
            string OwedTo
        );

    public record GroupAddedRequest(string To, string UserName, string GroupName, string AddedBy);

    public record ForgotPasswordRequest(string To, string ResetLink);
}