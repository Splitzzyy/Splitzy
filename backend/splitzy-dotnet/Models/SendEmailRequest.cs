namespace splitzy_dotnet.Models
{
    public class SendEmailRequest
    {
        public string To { get; set; } = default!;
        public string Subject { get; set; } = default!;
        public string Body { get; set; } = default!;
        public string UserName { get; set; } = default!;

    }
}

