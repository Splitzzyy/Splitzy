using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Models;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
    [EnableRateLimiting("per-user")]
    [ApiController]
    [Route("api/[controller]")]
    public class SettleupController : ControllerBase
    {
        private readonly SplitzyContext _context;

        public SettleupController(SplitzyContext context)
        {
            _context = context;
        }

        [HttpPost("settle-up")]
        public async Task<IActionResult> SettleUp([FromBody] SettleUpDTO dto)
        {
            if (dto.Amount <= 0)
                return BadRequest("Invalid amount");

            if (dto.PaidByUserId == dto.PaidToUserId)
                return BadRequest("Cannot settle with yourself");

            using var tx = await _context.Database.BeginTransactionAsync();

            // Ensure both users belong to group
            var groupUserIds = await _context.GroupMembers
                .Where(gm => gm.GroupId == dto.GroupId)
                .Select(gm => gm.UserId)
                .ToListAsync();

            if (!groupUserIds.Contains(dto.PaidByUserId) ||
                !groupUserIds.Contains(dto.PaidToUserId))
                return BadRequest("Users do not belong to the group");

            // Fetch balances (row-locked via transaction)
            var balances = await _context.GroupBalances
                .Where(b => b.GroupId == dto.GroupId &&
                       (b.UserId == dto.PaidByUserId || b.UserId == dto.PaidToUserId))
                .ToListAsync();

            if (balances.Count != 2)
                return BadRequest("Balances not found");

            var payer = balances.Single(b => b.UserId == dto.PaidByUserId);     // owes (negative)
            var receiver = balances.Single(b => b.UserId == dto.PaidToUserId); // owed (positive)

            // Debt model validations
            if (payer.NetBalance >= 0)
                return BadRequest("Payer does not owe money");

            if (receiver.NetBalance <= 0)
                return BadRequest("Receiver is not owed money");

            var maxAllowed = Math.Min(
                Math.Abs(payer.NetBalance),
                receiver.NetBalance
            );

            if (dto.Amount > maxAllowed)
                return BadRequest($"Maximum allowed settlement is {maxAllowed}");

            // Normalize amount
            var amount = Math.Round(dto.Amount, 2);

            // Apply settlement
            payer.NetBalance = Math.Round(payer.NetBalance + amount, 2);
            receiver.NetBalance = Math.Round(receiver.NetBalance - amount, 2);

            _context.Settlements.Add(new Settlement
            {
                GroupId = dto.GroupId,
                PaidBy = dto.PaidByUserId,
                PaidTo = dto.PaidToUserId,
                Amount = amount,
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            });

            _context.ActivityLogs.Add(new ActivityLog
            {
                GroupId = dto.GroupId,
                UserId = dto.PaidByUserId,
                ActionType = "SettleUp",
                Description = $"Paid {amount}",
                Amount = amount,
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Settlement successful",
                amount
            });
        }


    }
}
