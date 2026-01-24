namespace splitzy_dotnet.Services.Interfaces
{
    public interface IJWTService
    {
        string GenerateAccessToken(int id);
        bool ValidateToken(string token);
        string GetUserIdFromToken(string token);
        string GeneratePasswordResetToken(int userId);
        int ValidatePasswordResetToken(string token);
        string GenerateRefreshToken();
    }
}
