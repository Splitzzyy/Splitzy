using splitzy_dotnet.Services.Interfaces;

namespace splitzy_dotnet.Services
{
    public class ContextInjectionService
    {
        private readonly IAIService _service;
        private readonly ILogger<ContextInjectionService> _logger;
        public ContextInjectionService(IAIService service, ILogger<ContextInjectionService> logger)
        {
            _service = service;
            _logger = logger;
        }

        // To decide which route AI need to select
        internal async Task<string> DetermineQueryRoute(string question)
        {
            string routerPrompt = """
                            You are a query router. Given a user question, decide if it needs:
                            - "simple": can be answered from pre-aggregated data (totals, summaries)
                            - "sql": needs detailed data query (comparisons, date ranges, specific transactions)
                            Reply with ONLY one word: simple or sql
                            """;
            var route = await _service.AskAsync(routerPrompt);
            _logger.LogInformation("Route selected: {Route} for question: {Question}", route, question);
            return route.Trim().ToLower();
        }

        internal async Task<string> SimpleQueryRouteAsync()
        {
            
        }
    }
}
