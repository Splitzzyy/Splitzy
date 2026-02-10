
namespace splitzy_dotnet.Templates
{
    // --- Welcome Email Template ---
    public class WelcomeEmailTemplate : EmailTemplateBase
    {
        public string Build(string userName, string verificationLink)
        {
            var body = $"""
        <p style="font-size:16px; margin:0 0 12px 0;">
            Hey <strong>{userName}</strong> 👋
        </p>

        <p style="
            font-size:15px;
            line-height:1.6;
            margin:0 0 20px 0;
        ">
            Welcome to <strong>Splitzy</strong>! 🎉  
            Before you get started, please verify your email address to activate your account.
        </p>

        <p style="margin:24px 0; text-align:center;">
            <a href="{verificationLink}"
               style="
                   background-color:#4F46E5;
                   color:#ffffff;
                   padding:12px 24px;
                   text-decoration:none;
                   font-size:15px;
                   font-weight:600;
                   border-radius:6px;
                   display:inline-block;
               ">
                Verify Email Address
            </a>
        </p>

        <p style="
            font-size:14px;
            line-height:1.6;
            margin:20px 0 0 0;
            color:#555;
        ">
            This link will expire in <strong>24 hours</strong>.
            If you didn’t sign up for Splitzy, you can safely ignore this email.
        </p>

        <p style="
            font-size:14px;
            line-height:1.6;
            margin:20px 0 0 0;
        ">
            We’re excited to have you on board 🚀
        </p>
        """;

            return Layout("Verify your email – Splitzy", body);
        }
    }

    // --- Welcome Google Email Template ---
    public class WelcomeGoogleTemplate : EmailTemplateBase
    {
        public string Build(string userName)
        {
            var body = $"""
        <p style="font-size:16px; margin:0 0 12px 0;">
            Hey <strong>{userName}</strong> 👋
        </p>

        <p style="
            font-size:15px;
            line-height:1.6;
            margin:0 0 20px 0;
        ">
            Welcome to <strong>Splitzy</strong>! 🎉  
            Your Google account has been successfully connected and you're all set to start tracking expenses.
        </p>

        <p style="
            font-size:15px;
            line-height:1.6;
            margin:0 0 20px 0;
        ">
            You can now:
        </p>

        <ul style="
            font-size:15px;
            line-height:1.8;
            margin:0 0 20px 0;
        ">
            <li>Create and manage expense groups</li>
            <li>Invite friends and split expenses</li>
            <li>Track and settle up payments</li>
        </ul>

        <p style="
            font-size:14px;
            line-height:1.6;
            margin:20px 0 0 0;
        ">
            We're excited to have you on board 🚀
        </p>
        """;

            return Layout("Welcome to Splitzy", body);
        }
    }

    // --- Reminder Email Template ---
    public class ReminderTemplate : EmailTemplateBase
    {
        public string Build(string userName, decimal amount, string owedTo)
        {
            var body = $"""
                <p>Hi {userName},</p>
                <p>This is a friendly reminder that you owe <strong>₹{amount:N2}</strong> 
                to <strong>{owedTo}</strong></p>
                <p>Please settle up when you can!</p>
            """;

            return Layout("⏰ Payment Reminder", body);
        }
    }

    // --- Added To Group Email Template ---
    public class GroupAddedTemplate : EmailTemplateBase
    {
        public string Build(string userName, string groupName, string addedBy)
        {
            var body = $"""
                <p>Hey {userName},</p>
                <p><strong>{addedBy}</strong> has added you to the group 
                <strong>{groupName}</strong> on Splitzy.</p>
                <p>Log in to check the expenses.</p>
            """;

            return Layout("You've been added to a group", body);
        }
    }

    // --- Forgot Password Email Template ---
    public class ForgotPasswordTemplate : EmailTemplateBase
    {
        public string Build(string resetLink)
        {
            var body = $"""
                <p>We received a request to reset your password.</p>
                <p>Click the button below to reset it:</p>
                <div style="text-align:center; margin: 30px 0;">
                    <a href="{resetLink}" style="
                        background:#007bff;
                        color:#fff;
                        padding:12px 24px;
                        text-decoration:none;
                        border-radius:5px;
                        font-weight:bold;
                    ">
                        Reset Password
                    </a>
                </div>
                <p>If you didn't ask for this, you can ignore this email.</p>
            """;

            return Layout("🔒 Reset Your Password", body);
        }
    }
    // --- Group Invitation (New User) Template ---
    public class GroupInvitationTemplate : EmailTemplateBase
    {
        private const string SignupUrl = "https://splitzy.aarshiv.xyz";

        public string Build(string inviterName, string groupName)
        {
            var body = $"""
                <p>Hi,</p>
                <p><strong>{inviterName}</strong> has asked you to join the group <strong>{groupName}</strong>.</p>
                <p>To view the expenses, check your balance, and settle up, please create an account.</p>
                
                <p style="margin: 25px 0;">
                    <a href="{SignupUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Accept Invite & Sign Up
                    </a>
                </p>
                
                <p style="font-size: 0.9em; color: #555;">
                    If the button above doesn't work, click this link to join:<br>
                    <a href="{SignupUrl}">{SignupUrl}</a>
                </p>
            """;

            return Layout($"You've been added to {groupName}", body);
        }
    }
}
