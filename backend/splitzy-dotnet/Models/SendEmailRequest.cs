namespace splitzy_dotnet.Models
{
    public class SendEmailRequest
    {
        public string To { get; set; } = default!;
        public string Subject { get; set; } = default!;
        public string Body { get; set; } = default!;
        public string UserName { get; set; } = default!;

    }
    public class EmailMessage
    {
        public string ToEmail { get; set; }
        public string TemplateType { get; set; }
        public object Payload { get; set; }
        public int RetryCount { get; set; } = 0;
    }
}

