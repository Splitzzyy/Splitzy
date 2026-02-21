using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Middleware.APM;
using Serilog;
using Serilog.Context;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services;
using splitzy_dotnet.Services.BackgroundServices;
using splitzy_dotnet.Services.Interfaces;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;

namespace splitzy_dotnet.Application
{
    public class Startup
    {
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;

        public Startup(IConfiguration config, IWebHostEnvironment env)
        {
            _config = config;
            _env = env;
        }

        // ============================
        // Configure Services
        // ============================
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();

            // ============================
            // Forwarded Headers (fixes ClientIp showing ::1 behind nginx/proxy)
            // ============================
            services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                // Clear default networks to trust all proxies, or restrict to specific IPs:
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });

            // Core services
            services.AddScoped<IEmailService, EMailService>();
            services.AddScoped<IMessageProducer, RabbitMqProducer>();
            services.AddScoped<IJWTService, JWTService>();
            services.AddScoped<IRefreshTokenCleanupService, RefreshTokenCleanupService>();
            services.AddHostedService<EmailConsumer>();
            services.AddHostedService<RefreshTokenBackgroundCleanupService>();

            // Config bindings
            services.Configure<GoogleSettings>(_config.GetSection("Google"));
            services.Configure<JwtSettings>(_config.GetSection("Jwt"));
            services.Configure<OtpJwtSettings>(_config.GetSection("OtpJwt"));
            services.Configure<EmailSettings>(_config.GetSection("Email"));
            services.Configure<MessagingSettings>(_config.GetSection("MessagingService"));

            // ============================
            // MW Instrumentation
            // ============================
            var mwSettings = _config.GetSection("MW").Get<MWSettings>();
            if (mwSettings is not null)
            {
                Environment.SetEnvironmentVariable("MW_API_KEY", mwSettings.ApiKey);
                Environment.SetEnvironmentVariable("MW_TARGET", mwSettings.TargetUrl);
                Environment.SetEnvironmentVariable("MW_SERVICE_NAME", mwSettings.ServiceName);
            }
            services.ConfigureMWInstrumentation(_config);

            services.AddSingleton<ISplitzyConfig, SplitzyConfig>();

            // Auth
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                var config = services.BuildServiceProvider()
                                     .GetRequiredService<ISplitzyConfig>();

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,

                    ValidIssuer = config.Jwt.Issuer,
                    ValidAudience = config.Jwt.Audience,

                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(config.Jwt.Key)
                    ),

                    ClockSkew = TimeSpan.Zero
                };

                options.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = ctx =>
                    {
                        // Structured log instead of Console.WriteLine
                        Log.Warning("JWT authentication failed for {RequestPath}: {ErrorMessage}",
                            ctx.HttpContext.Request.Path,
                            ctx.Exception.Message);
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = ctx =>
                    {
                        var userId = ctx.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                                  ?? ctx.Principal?.FindFirstValue("sub")
                                  ?? "unknown";
                        Log.Debug("JWT token validated for UserId={UserId} on {RequestPath}",
                            userId,
                            ctx.HttpContext.Request.Path);
                        return Task.CompletedTask;
                    }
                };
            });

            services.AddAuthorization(options =>
            {
                options.DefaultPolicy =
                    new AuthorizationPolicyBuilder()
                        .AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme)
                        .RequireAuthenticatedUser()
                        .Build();
            });

            // Swagger
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen(c =>
            {
                var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));

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

            // CORS
            services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.WithOrigins(
                            "http://localhost:4200",
                            "https://splitzy.aarshiv.xyz",
                            "https://splitzy-dev.aarshiv.xyz")
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials();
                });
            });

            // Rate Limiting
            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                //Global limiter
                options.AddFixedWindowLimiter("global", opt =>
                {
                    opt.PermitLimit = 100; // 100 requests
                    opt.Window = TimeSpan.FromMinutes(1); // per 1 minute
                    opt.QueueLimit = 0;
                });

                // Login-specific stricter policy
                options.AddFixedWindowLimiter("login", opt =>
                {
                    opt.PermitLimit = 5;
                    opt.Window = TimeSpan.FromMinutes(1);
                });

                // Per-user JWT-based limiter
                options.AddPolicy("per-user", context =>
                {
                    // JWT subject (best)
                    var userId =
                        context.User.FindFirst("sub")?.Value
                        ?? context.User.FindFirst("userId")?.Value
                        ?? context.Connection.RemoteIpAddress?.ToString();

                    return RateLimitPartition.GetFixedWindowLimiter(
                        userId!,
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 60,
                            Window = TimeSpan.FromMinutes(1)
                        });
                });

                // For testing purposes
                options.AddFixedWindowLimiter("fixed", opt =>
                {
                    opt.Window = TimeSpan.FromMinutes(1);
                    opt.PermitLimit = 5;
                    opt.QueueLimit = 0;
                });
            });

            // DB
            services.AddDbContext<SplitzyContext>(options =>
            {
                var cs = _config["Postgres:ConnectionString"];
                if (string.IsNullOrWhiteSpace(cs))
                    throw new InvalidOperationException("Postgres connection string missing");

                options.UseNpgsql(cs);
            });

            services.AddHealthChecks()
                    .AddDbContextCheck<SplitzyContext>("postgres");

            if (_env.IsDevelopment())
            {
                services.AddMiniProfiler();
            }
        }

        // ============================
        // Configure Middleware
        // ============================
        public void Configure(WebApplication app)
        {
            // ============================
            // 1. Forwarded Headers — must be FIRST
            //    Fixes ClientIp showing ::1 behind nginx/reverse proxy
            // ============================
            app.UseForwardedHeaders();

            // ============================
            // 2. Exception Handler — catches unhandled exceptions
            //    Now with structured logging to middleware.io
            // ============================
            app.UseExceptionHandler(errorApp =>
            {
                errorApp.Run(async context =>
                {
                    var feature = context.Features.Get<IExceptionHandlerFeature>();
                    var exception = feature?.Error;

                    var userId = context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                              ?? context.User?.FindFirstValue("sub")
                              ?? "anonymous";

                    // Structured error log — all fields searchable in middleware.io
                    Log.Error(exception,
                        "Unhandled {ExceptionType} on {RequestMethod} {RequestPath} by UserId={UserId}",
                        exception?.GetType().Name,
                        context.Request.Method,
                        context.Request.Path,
                        userId);

                    var problem = new ProblemDetails
                    {
                        Type = "https://httpstatuses.com/500",
                        Title = "An unexpected error occurred",
                        Status = StatusCodes.Status500InternalServerError,
                        Detail = app.Environment.IsDevelopment()
                            ? exception?.Message
                            : "An internal server error occurred",
                        Instance = context.Request.Path
                    };

                    context.Response.StatusCode = problem.Status!.Value;
                    context.Response.ContentType = "application/problem+json";
                    await context.Response.WriteAsJsonAsync(problem);
                });
            });

            // ============================
            // 3. Correlation ID middleware
            //    Reads X-Correlation-Id header or generates one,
            //    pushes into Serilog LogContext for every log in the request
            // ============================
            app.Use(async (context, next) =>
            {
                var correlationId =
                    context.Request.Headers["X-Correlation-Id"].FirstOrDefault()
                    ?? Guid.NewGuid().ToString();

                context.Response.Headers["X-Correlation-Id"] = correlationId;

                using (LogContext.PushProperty("CorrelationId", correlationId))
                {
                    await next();
                }
            });

            // ============================
            // 4. Authentication & Authorization
            //    Must run BEFORE LogEnrichmentMiddleware so context.User is populated
            // ============================

            app.UseCors("AllowFrontend");
            app.UseAuthentication();
            app.UseAuthorization();

            // ============================
            // 5. Serilog Request Logging
            //    EnrichDiagnosticContext runs AFTER auth, so UserId is always real
            //    This replaces LogEnrichmentMiddleware for request-scoped properties
            // ============================
            app.UseSerilogRequestLogging(options =>
            {
                options.MessageTemplate =
                    "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";

                options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
                {
                    // User identity — populated because UseAuthentication ran first
                    var userId = httpContext.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                              ?? httpContext.User?.FindFirstValue("sub")
                              ?? "anonymous";

                    // Real client IP — resolved correctly via UseForwardedHeaders above
                    var clientIp =
                        httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                        ?? httpContext.Connection.RemoteIpAddress?.ToString()
                        ?? "unknown";

                    diagnosticContext.Set("UserId", userId);
                    diagnosticContext.Set("ClientIp", clientIp);
                    diagnosticContext.Set("UserAgent", httpContext.Request.Headers["User-Agent"].FirstOrDefault() ?? "unknown");
                    diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
                    diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
                    diagnosticContext.Set("ContentType", httpContext.Request.ContentType ?? "none");
                };
            });

            // ============================
            // 6. Remaining middleware pipeline
            // ============================
            app.UseStatusCodePages();
            app.UseSwagger();
            app.UseSwaggerUI();
            app.UseHttpsRedirection();
            app.UseRateLimiter();

            if (app.Environment.IsDevelopment())
            {
                app.UseMiniProfiler();
            }

            app.MapHealthChecks("/health").DisableRateLimiting();
            app.MapControllers();

            // ============================
            // 7. Auto DB Migration
            // ============================
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
                    logger.LogCritical(ex, "Database migration failed on startup");
                    throw;
                }
            }
        }
    }
}