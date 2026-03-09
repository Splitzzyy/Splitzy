using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;

namespace splitzy_dotnet.Controllers
{
    //[Authorize]
    [EnableRateLimiting("per-user")]
    [ApiController]
    [Route("api/[controller]")]
    public class BotController : ControllerBase
    {
        public readonly SplitzyContext _context;

        public BotController(SplitzyContext context)
        {
            _context = context;
        }

        [HttpGet("ask")]
        public async Task<IActionResult> Ask([FromQuery] string question)
        {
            if (string.IsNullOrWhiteSpace(question))
            {
                return BadRequest("Kindly enter a valid question.");
            }

            // Extracting the user id 
            int userId = HttpContext.GetCurrentUserId();

            var userDetails = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);

            if (userDetails == null)
            {
                return BadRequest("User is not found");
            }

            var systemPrompt = $"""
            You are a personal finance assistant. Answer only questions related to the user's finances.
            
            User Context:
            - Name: {userDetails.Name}
            - Total Debt: {context.TotalDebt:C}
            - This Month's Spending: {context.MonthlyTotal:C}
            - Top Categories: {string.Join(", ", context.CategorySummaries.Select(c => $"{c.Category}: {c.Total:C}"))}
            
            Rules:
            - Only use the data provided above.
            - Never fabricate financial data.
            - Be concise and friendly.
            - If data is insufficient, say so.
            """;

            return Ok(userId);
        }
    }
}
