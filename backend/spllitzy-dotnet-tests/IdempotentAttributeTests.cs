using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using System.Security.Claims;

namespace spllitzy_dotnet_tests
{
    [TestFixture]
    public class IdempotentAttributeTests
    {
        private ServiceProvider _services;
        private string _dbName;
        private int _runs;

        [SetUp]
        public void Setup()
        {
            _dbName = Guid.NewGuid().ToString();
            _runs = 0;
            _services = new ServiceCollection()
                .AddLogging()
                .AddDbContext<SplitzyContext>(o => o.UseInMemoryDatabase(_dbName))
                .AddOptions()
                .BuildServiceProvider();
        }

        [TearDown]
        public void TearDown() => _services.Dispose();

        /// <summary>Runs the filter around a fake action that counts executions and returns <paramref name="result"/>.</summary>
        private async Task<(IActionResult? Result, HttpContext Http)> InvokeAsync(
            string? key, object payload, IActionResult? result = null, int userId = 1, string path = "/api/Expense/AddExpense")
        {
            var http = new DefaultHttpContext
            {
                RequestServices = _services.CreateScope().ServiceProvider,
                User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId.ToString())], "Test"))
            };
            http.Request.Method = "POST";
            http.Request.Path = path;
            if (key != null)
                http.Request.Headers[IdempotentAttribute.HeaderName] = key;

            var actionContext = new ActionContext(http, new RouteData(), new ActionDescriptor());
            var executing = new ActionExecutingContext(actionContext, [], new Dictionary<string, object?> { ["dto"] = payload }, controller: null!);

            await new IdempotentAttribute().OnActionExecutionAsync(executing, () =>
            {
                _runs++;
                return Task.FromResult(new ActionExecutedContext(actionContext, [], controller: null!)
                {
                    Result = result ?? new OkObjectResult(new { expenseId = _runs })
                });
            });

            return (executing.Result, http);
        }

        private SplitzyContext Db() => _services.CreateScope().ServiceProvider.GetRequiredService<SplitzyContext>();

        [Test]
        public async Task NoHeader_RunsEveryTime()
        {
            await InvokeAsync(null, new { amount = 10 });
            await InvokeAsync(null, new { amount = 10 });

            Assert.That(_runs, Is.EqualTo(2));
            Assert.That(Db().IdempotencyKeys.Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task SameKeySamePayload_RunsOnce_ReplaysStoredResponse()
        {
            var (first, _) = await InvokeAsync("k1", new { amount = 10 });
            var (second, http) = await InvokeAsync("k1", new { amount = 10 });

            Assert.That(_runs, Is.EqualTo(1));
            Assert.That(first, Is.Null, "first request runs the action normally");
            var replay = second as ContentResult;
            Assert.That(replay, Is.Not.Null);
            Assert.That(replay!.StatusCode, Is.EqualTo(200));
            Assert.That(replay.Content, Is.EqualTo("{\"expenseId\":1}"));
            Assert.That(replay.ContentType, Does.StartWith("application/json"));
            Assert.That(http.Response.Headers[IdempotentAttribute.ReplayedHeaderName].ToString(), Is.EqualTo("true"));
        }

        [Test]
        public async Task SameKeyDifferentPayload_Returns422_DoesNotRun()
        {
            await InvokeAsync("k1", new { amount = 10 });
            var (second, _) = await InvokeAsync("k1", new { amount = 20 });

            Assert.That(_runs, Is.EqualTo(1));
            Assert.That(second, Is.TypeOf<UnprocessableEntityObjectResult>());
        }

        [Test]
        public async Task SameKeyDifferentEndpoint_Returns422()
        {
            await InvokeAsync("k1", new { amount = 10 });
            var (second, _) = await InvokeAsync("k1", new { amount = 10 }, path: "/api/Settleup/settle-up");

            Assert.That(second, Is.TypeOf<UnprocessableEntityObjectResult>());
        }

        [Test]
        public async Task RejectedRequest_ReleasesKey_RetryRunsAgain()
        {
            await InvokeAsync("k1", new { amount = 10 }, new BadRequestObjectResult("Invalid amount"));
            Assert.That(Db().IdempotencyKeys.Count(), Is.EqualTo(0));

            var (retry, _) = await InvokeAsync("k1", new { amount = 10 });

            Assert.That(_runs, Is.EqualTo(2));
            Assert.That(retry, Is.Null);
            Assert.That(Db().IdempotencyKeys.Single().StatusCode, Is.EqualTo(200));
        }

        [Test]
        public async Task ForbiddenRequest_IsNotStored()
        {
            await InvokeAsync("k1", new { amount = 10 }, new ForbidResult());

            Assert.That(Db().IdempotencyKeys.Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task KeysAreScopedPerUser()
        {
            await InvokeAsync("k1", new { amount = 10 }, userId: 1);
            var (other, _) = await InvokeAsync("k1", new { amount = 10 }, userId: 2);

            Assert.That(_runs, Is.EqualTo(2));
            Assert.That(other, Is.Null);
        }

        [Test]
        public async Task KeyTooLong_Returns400()
        {
            var (result, _) = await InvokeAsync(new string('x', IdempotentAttribute.MaxKeyLength + 1), new { amount = 10 });

            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
            Assert.That(_runs, Is.EqualTo(0));
        }

        [Test]
        public async Task StringResponse_IsReplayedAsPlainText()
        {
            await InvokeAsync("k1", new { amount = 10 }, new OkObjectResult("done"));
            var (second, _) = await InvokeAsync("k1", new { amount = 10 });

            var replay = (ContentResult)second!;
            Assert.That(replay.Content, Is.EqualTo("done"));
            Assert.That(replay.ContentType, Does.StartWith("text/plain"));
        }

        [Test]
        public async Task RepeatWhileFirstInFlight_WaitsAndReplays()
        {
            // Simulate the first request: key claimed, still running
            await InvokeAsync("k1", new { amount = 10 });
            var db = Db();
            var row = db.IdempotencyKeys.Single();
            var storedBody = row.ResponseBody;
            row.StatusCode = null;
            row.ResponseBody = null;
            await db.SaveChangesAsync();

            var finish = Task.Run(async () =>
            {
                await Task.Delay(400);
                var db2 = Db();
                var r = db2.IdempotencyKeys.Single();
                r.StatusCode = 201;
                r.ResponseBody = storedBody;
                await db2.SaveChangesAsync();
            });

            var (second, _) = await InvokeAsync("k1", new { amount = 10 });
            await finish;

            Assert.That(_runs, Is.EqualTo(1));
            Assert.That(((ContentResult)second!).StatusCode, Is.EqualTo(201));
        }

        /// <summary>Leaves a claimed, still-running row for "k1" with the hash of an amount-10 request.</summary>
        private async Task SimulateInFlightAsync()
        {
            await InvokeAsync("k1", new { amount = 10 });
            var db = Db();
            var row = db.IdempotencyKeys.Single();
            row.StatusCode = null;
            row.ResponseBody = null;
            await db.SaveChangesAsync();
        }

        [Test]
        public async Task KeyReleasedAndReclaimedByOtherPayloadWhileWaiting_Returns422()
        {
            await SimulateInFlightAsync();

            // The first request fails and releases the key; a corrected request claims it and succeeds
            var swap = Task.Run(async () =>
            {
                await Task.Delay(400);
                var db2 = Db();
                db2.IdempotencyKeys.Remove(db2.IdempotencyKeys.Single());
                db2.IdempotencyKeys.Add(new IdempotencyKey
                {
                    UserId = 1,
                    Key = "k1",
                    RequestHash = "hash-of-corrected-request",
                    StatusCode = 200,
                    ResponseBody = "{\"expenseId\":99}",
                    ResponseContentType = "application/json; charset=utf-8",
                    CreatedAt = DateTime.UtcNow
                });
                await db2.SaveChangesAsync();
            });

            var (waiting, _) = await InvokeAsync("k1", new { amount = 10 });
            await swap;

            Assert.That(waiting, Is.TypeOf<UnprocessableEntityObjectResult>(), "must not replay another payload's response");
            Assert.That(_runs, Is.EqualTo(1));
        }

        [Test]
        public async Task KeyReleasedWhileWaiting_RunsTheRepeat()
        {
            await SimulateInFlightAsync();

            var release = Task.Run(async () =>
            {
                await Task.Delay(400);
                var db2 = Db();
                db2.IdempotencyKeys.Remove(db2.IdempotencyKeys.Single());
                await db2.SaveChangesAsync();
            });

            var (waiting, _) = await InvokeAsync("k1", new { amount = 10 });
            await release;

            Assert.That(waiting, Is.Null, "the repeat runs the action itself");
            Assert.That(_runs, Is.EqualTo(2));
            Assert.That(Db().IdempotencyKeys.Single().StatusCode, Is.EqualTo(200));
        }
    }
}
