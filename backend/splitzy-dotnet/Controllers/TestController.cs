using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace splitzy_dotnet.Controllers
{
    public class TestController : ControllerBase
    {
        /// <summary>
        /// Testing Endpoint to verify rate limiting.
        /// </summary>
        /// <returns></returns>
        [EnableRateLimiting("fixed")]
        [HttpGet("test")]
        [AllowAnonymous]
        public IActionResult Test() => Ok("Allowed");
    }
}
