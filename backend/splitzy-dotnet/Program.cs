using splitzy_dotnet.Application;

var builder = WebApplication.CreateBuilder(args);

var startup = new Startup(builder.Configuration, builder.Environment);
Console.WriteLine("🌍 Environment: " + builder.Environment.EnvironmentName);
startup.ConfigureServices(builder.Services);

var app = builder.Build();
startup.Configure(app, builder.Environment);

app.Run();
