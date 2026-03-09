using splitzy_dotnet.Models;
using splitzy_dotnet.Repository.Interfaces;

namespace splitzy_dotnet.Repository
{
    public class UserRepository : IUserRepository
    {
        private readonly SplitzyContext _context;
        private readonly ILogger<UserRepository> _logger;
        public UserRepository(SplitzyContext context, ILogger<UserRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task GetAllUserDetails(int userId)
        {

        }
    }
}
