using Middleware.APM;
using Serilog;
using Serilog.Events;
using Serilog.Sinks.OpenTelemetry;
using splitzy_dotnet.Application;

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ============================
    // Serilog bootstrap logger
    // ============================
    Log.Logger = new LoggerConfiguration()
        .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
        .Enrich.FromLogContext()
        .Enrich.WithEnvironmentName()
        .Enrich.WithMachineName()           // adds MachineName
        .Enrich.WithProcessId()             // adds ProcessId
        .Enrich.WithProcessName()           // adds ProcessName
        .Enrich.WithThreadId()
        .WriteTo.Console(
            outputTemplate:
            "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId} {Message:lj}{NewLine}{Exception}")
        .WriteTo.File(
            path: "logs/splitzy-.log",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 14,
            shared: true)
        .WriteTo.OpenTelemetry(options =>
        {
            options.Endpoint = Environment.GetEnvironmentVariable("MW_TARGET")
                               ?? builder.Configuration["MW:TargetURL"]
                               ?? "http://localhost:9319/v1/logs";
            options.Protocol = OtlpProtocol.HttpProtobuf;
            options.Headers = new Dictionary<string, string>
            {
                ["Authorization"] = $"Bearer {Environment.GetEnvironmentVariable("MW_API_KEY") ?? builder.Configuration["MW:ApiKey"]}"
            };
            options.ResourceAttributes = new Dictionary<string, object>
            {
                ["service.name"] = Environment.GetEnvironmentVariable("SERVICE_NAME")
                                   ?? builder.Configuration["MW:ServiceName"]
                                   ?? "unknown_service"
            };
        })
        .CreateLogger();

    // Replace default logging with Serilog
    builder.Host.UseSerilog();

    Console.WriteLine("🌍 Environment: " + builder.Environment.EnvironmentName);

    // ============================
    // Startup.cs integration
    // ============================
    var startup = new Startup(builder.Configuration, builder.Environment);
    startup.ConfigureServices(builder.Services);

    var app = builder.Build();

    Logger.Init(app.Services.GetRequiredService<ILoggerFactory>());

    startup.Configure(app);

    Logger.LogInformation("Starting Splitzy API...");

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException && ex.Source != "Microsoft.EntityFrameworkCore.Design")
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
