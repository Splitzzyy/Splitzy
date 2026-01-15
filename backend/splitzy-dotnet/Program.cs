using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services;
using splitzy_dotnet.Services.BackgroundServices;
using splitzy_dotnet.Services.Interfaces;
using System.Reflection;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

Constants.Init(builder.Configuration);

#region Configuration
builder.Configuration
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json",
        optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

var startupLogger = LoggerFactory
    .Create(logging => logging.AddConsole())
    .CreateLogger("Startup");

startupLogger.LogInformation(
    "🌍 ASPNETCORE_ENVIRONMENT = {Environment}",
    builder.Environment.EnvironmentName
);
#endregion

#region Controllers
builder.Services.AddControllers();
#endregion

builder.Services.AddScoped<IEmailService, EMailService>();
builder.Services.AddHostedService<EmailConsumer>();
builder.Services.AddScoped<IMessageProducer, RabbitMqProducer>();
#region Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = Constants.JwtIssuer,
        ValidAudience = Constants.JwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(Constants.JwtKey)
        ),
        ClockSkew = TimeSpan.Zero
    };
});
#endregion

#region Authorization
builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder(JwtBearerDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser()
        .Build();
});
#endregion

#region Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    c.IncludeXmlComments(xmlPath);

    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Splitzy API",
        Version = "v1",
        Description = "Splitzy API with JWT Authentication"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Bearer {your JWT token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
#endregion

#region CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "https://42761f8c7efd.ngrok-free.app"
            )
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});
#endregion

#region Database
builder.Services.AddDbContext<SplitzyContext>(options =>
{
    var connectionString = builder.Configuration["Postgres:ConnectionString"];

    if (string.IsNullOrWhiteSpace(connectionString))
        throw new InvalidOperationException("Postgres connection string is missing");

    options.UseNpgsql(connectionString);
});
#endregion

#region HealthChecks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<SplitzyContext>("postgres");
#endregion

builder.Services.AddMiniProfiler();

#region Services
builder.Services.AddScoped<IJWTService, JWTService>();
#endregion

var app = builder.Build();

#region Global Exception Handling
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();

        logger.LogError(exception, "Unhandled exception occurred");

        await context.Response.WriteAsJsonAsync(new
        {
            Success = false,
            Message = "An unexpected error occurred"
        });
    });
});
#endregion

#region Request Logging 
#region Request Logging + Response Time
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    var sw = System.Diagnostics.Stopwatch.StartNew();

    var correlationId =
        context.Request.Headers["X-Correlation-Id"].FirstOrDefault()
        ?? Guid.NewGuid().ToString();

    context.Response.Headers["X-Correlation-Id"] = correlationId;

    using (logger.BeginScope(new Dictionary<string, object>
    {
        ["CorrelationId"] = correlationId
    }))
    {
        logger.LogInformation(
            "HTTP {Method} {Path} started",
            context.Request.Method,
            context.Request.Path);

        await next();

        sw.Stop();

        logger.LogInformation(
            "HTTP {Method} {Path} completed with {StatusCode} in {ElapsedMs} ms",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            sw.ElapsedMilliseconds);
    }
});
#endregion

#endregion

app.UseSwagger();
app.UseSwaggerUI();


app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.UseAuthentication();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        var exceptionHandler =
            context.Features.Get<IExceptionHandlerFeature>();

        if (exceptionHandler != null)
        {
            var ex = exceptionHandler.Error;

            var response = new
            {
                message = "Something went wrong",
                detail = ex.Message // hide in prod if needed
            };

            await context.Response.WriteAsJsonAsync(response);
        }
    });
});

app.UseAuthorization();
app.UseMiniProfiler();
app.MapHealthChecks("/health");
app.MapControllers();

#region Auto DB Migration (Non-Prod Friendly)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<SplitzyContext>();
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogCritical(ex, "Database migration failed");
        throw;
    }
}
#endregion

app.Run();
