using Microsoft.AspNetCore.Mvc;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Services.Interfaces;
using splitzy_dotnet.Templates;

namespace splitzy_dotnet.Controllers
{
    [ApiController]
    [Route("api/email")]
    public class EmailController : ControllerBase
    {
        private readonly IEmailService _emailService;

        public EmailController(IEmailService emailService)
        {
            _emailService = emailService;
        }

        // 1. WELCOME EMAIL
        [HttpPost("welcome")]
        public async Task<IActionResult> SendWelcome([FromBody] WelcomeRequest request)
        {
            var html = new WelcomeEmailTemplate().Build(request.UserName, request.VerificationLink);
            await _emailService.SendAsync(request.To, "Welcome to Splitzy! 👋", html);
            return Ok("Welcome email sent.");
        }

        // 2. PAYMENT REMINDER
        [HttpPost("reminder")]
        public async Task<IActionResult> SendReminder([FromBody] ReminderRequest request)
        {
            var html = new ReminderTemplate().Build(
                request.UserName,
                request.Amount,
                request.GroupName,
                request.OwedTo
            );

            // Subject now looks like: "Reminder: You owe ₹1,200.00 to Bob"
            var subject = $"Reminder: You owe ₹{request.Amount:N2} to {request.OwedTo}";

            await _emailService.SendAsync(request.To, subject, html);
            return Ok("Reminder email sent.");
        }

        // 3. ADDED TO GROUP
        [HttpPost("group-added")]
        public async Task<IActionResult> SendGroupAdded([FromBody] GroupAddedRequest request)
        {
            var html = new GroupAddedTemplate().Build(request.UserName, request.GroupName, request.AddedBy);
            await _emailService.SendAsync(request.To, $"You were added to {request.GroupName}", html);
            return Ok("Group notification sent.");
        }

        // 4. FORGOT PASSWORD
        [HttpPost("forgot-password")]
        public async Task<IActionResult> SendForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var html = new ForgotPasswordTemplate().Build(request.ResetLink);
            await _emailService.SendAsync(request.To, "Reset your Splitzy password", html);
            return Ok("Password reset email sent.");
        }

        // 5. SEND GROUP INVITATION
        [HttpPost("send-invite")]
        public async Task<IActionResult> SendGroupInvite([FromBody] GroupInvitationRequest request)
        {
            var html = new GroupInvitationTemplate().Build(request.InviterName, request.GroupName);
            await _emailService.SendAsync(request.To, $"You've been invited to join {request.GroupName}", html);
            return Ok("Invitation email sent.");
        }
    }
}