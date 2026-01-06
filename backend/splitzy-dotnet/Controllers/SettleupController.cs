using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Models;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
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

            using var tx = await _context.Database.BeginTransactionAsync();

            var balances = await _context.GroupBalances
                .Where(b => b.GroupId == dto.GroupId &&
                       (b.UserId == dto.PaidByUserId || b.UserId == dto.PaidToUserId))
                .ToListAsync();

            if (balances.Count != 2)
                return BadRequest("Invalid users");

            var payer = balances.Single(b => b.UserId == dto.PaidByUserId); // owes
            var receiver = balances.Single(b => b.UserId == dto.PaidToUserId); // owed

            // ✅ VALIDATIONS
            if (payer.NetBalance >= 0)
                return BadRequest("Payer does not owe money");

            if (receiver.NetBalance <= 0)
                return BadRequest("Receiver is not owed money");

            var maxAllowed = Math.Min(
                Math.Abs(payer.NetBalance),
                receiver.NetBalance
            );

            if (dto.Amount > maxAllowed)
                return BadRequest($"Maximum allowed is {maxAllowed}");

            // ✅ UPDATE BALANCES
            payer.NetBalance += dto.Amount;
            receiver.NetBalance -= dto.Amount;

            _context.Settlements.Add(new Settlement
            {
                GroupId = dto.GroupId,
                PaidBy = dto.PaidByUserId,
                PaidTo = dto.PaidToUserId,
                Amount = dto.Amount,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Settlement successful",
                amount = dto.Amount
            });
        }


    }
}
