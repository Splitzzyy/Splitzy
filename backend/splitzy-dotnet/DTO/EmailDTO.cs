namespace splitzy_dotnet.DTO
{
    public record WelcomeRequest(string To, string UserName, string VerificationLink);

    public record ReminderRequest(
            string To,
            string UserName,
            decimal Amount,
            string GroupName,
            string OwedTo
        );

    public record GroupAddedRequest(string To, string UserName, string GroupName, string AddedBy);

    public record ForgotPasswordRequest(string To, string ResetLink);

    public record GroupInvitationRequest(string To, string InviterName, string GroupName);
}