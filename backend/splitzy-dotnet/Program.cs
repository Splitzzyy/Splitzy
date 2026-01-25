using Serilog;
using Serilog.Events;
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
        .Enrich.WithThreadId()
        .WriteTo.Console(
            outputTemplate:
            "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId} {Message:lj}{NewLine}{Exception}")
        .WriteTo.File(
            path: "logs/splitzy-.log",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 14,
            shared: true)
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

    startup.Configure(app);

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
