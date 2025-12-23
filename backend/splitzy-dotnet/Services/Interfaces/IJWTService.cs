namespace splitzy_dotnet.Services.Interfaces
{
    public interface IJWTService
    {
        string GenerateToken(int id);
        bool ValidateToken(string token);

    }
}
