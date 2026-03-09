namespace splitzy_dotnet.Repository.Interfaces
{
    public interface IUserRepository
    {
        Task GetAllUserDetails(int userId);
    }
}
