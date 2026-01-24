using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Serilog.Context;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services;
using splitzy_dotnet.Services.BackgroundServices;
using splitzy_dotnet.Services.Interfaces;
using System.Reflection;
using System.Text;

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

            // Core services
            services.AddScoped<IEmailService, EMailService>();
            services.AddScoped<IMessageProducer, RabbitMqProducer>();
            services.AddScoped<IJWTService, JWTService>();
            services.AddHostedService<EmailConsumer>();

            // Config bindings
            services.Configure<GoogleSettings>(_config.GetSection("Google"));
            services.Configure<JwtSettings>(_config.GetSection("Jwt"));
            services.Configure<OtpJwtSettings>(_config.GetSection("OtpJwt"));
            services.Configure<EmailSettings>(_config.GetSection("Email"));
            services.Configure<MessagingSettings>(_config.GetSection("MessagingService"));
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
                        Console.WriteLine("AUTH FAILED: " + ctx.Exception.Message);
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = ctx =>
                    {
                        Console.WriteLine("TOKEN VALIDATED");
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
                            "https://42761f8c7efd.ngrok-free.app")
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials();
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
            app.UseExceptionHandler(errorApp =>
            {
                errorApp.Run(async context =>
                {
                    var feature = context.Features.Get<IExceptionHandlerFeature>();
                    var exception = feature?.Error;

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

                    // Optional: map specific exceptions
                    if (exception is UnauthorizedAccessException)
                    {
                        problem.Status = StatusCodes.Status401Unauthorized;
                        problem.Title = "Unauthorized";
                        problem.Type = "https://httpstatuses.com/401";
                    }

                    context.Response.StatusCode = problem.Status.Value;
                    context.Response.ContentType = "application/problem+json";
                    await context.Response.WriteAsJsonAsync(problem);
                });
            });

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
            // Serilog request logging
            // ============================
            app.UseSerilogRequestLogging(options =>
            {
                options.MessageTemplate =
                    "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
            });

            // ============================
            // ProblemDetails (replaces generic handler)
            // ===========================
            app.UseStatusCodePages();

            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseCors("AllowFrontend");
            app.UseHttpsRedirection();
            app.UseAuthentication();
            app.UseAuthorization();
            if (app.Environment.IsDevelopment())
            {
                app.UseMiniProfiler();
            }

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
        }
    }
}