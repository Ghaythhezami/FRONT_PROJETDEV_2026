using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Polly;
using AgileAi.Data.Context;
using AgileAi.Ioc;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using AgileAi.Domain.Models;
using AgileAi.Api.Services;
using AgileAi.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using AgileAi.Domain.Dto;
using AgileAi.Api.Hubs;
using Microsoft.Extensions.FileProviders;
using System.IO;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

var jwtSecret = builder.Configuration["Jwt:Secret"];
var connectionString = DatabaseConnectionHelper.ResolveConnectionString(
    builder.Configuration.GetConnectionString("Connection"),
    Environment.GetEnvironmentVariable("DATABASE_URL"));

if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException("Jwt:Secret is missing from configuration.");
}

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("ConnectionStrings:Connection is missing from configuration.");
}

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?.Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    options.AddPolicy("CorsPolicy", policy =>
    {
        if (corsOrigins != null && corsOrigins.Length > 0)
        {
            policy.WithOrigins(corsOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }
        else
        {
            policy.AllowAnyMethod()
                .AllowAnyHeader()
                .SetIsOriginAllowed(_ => true)
                .AllowCredentials();
        }
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));


builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateAudience = false,
        ValidateIssuer = false,
        ClockSkew = TimeSpan.Zero
    };
    x.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var authorization = context.Request.Headers["Authorization"].FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(authorization))
            {
                context.Token = authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                    ? authorization.Substring("Bearer ".Length).Trim()
                    : authorization.Trim();
            }

            var accessToken = context.Request.Query["access_token"].FirstOrDefault();
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrWhiteSpace(accessToken) &&
                path.StartsWithSegments("/hubs/board"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        },
        OnChallenge = async context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";

            var response = new ApiErrorResponse
            {
                Message = "Authentication is required to access this resource.",
                Code = "UNAUTHORIZED"
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        },
        OnForbidden = async context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";

            var response = new ApiErrorResponse
            {
                Message = "You are not allowed to access this resource.",
                Code = "FORBIDDEN"
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireAssertion(ctx =>
        RoleHelper.IsStaffRole(ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? string.Empty)));
    options.AddPolicy("ProjectStaff", policy => policy.RequireAssertion(ctx =>
    {
        var role = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? string.Empty;
        var normalized = role.Trim().ToLowerInvariant();
        return RoleHelper.IsStaffRole(role)
            || normalized is "developer" or "analyste" or "tester" or "agent de controle";
    }));
    options.AddPolicy("CanUseAi", policy => policy.RequireAssertion(ctx =>
    {
        var role = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? string.Empty;
        var normalized = role.Trim().ToLowerInvariant();
        return RoleHelper.IsStaffRole(role) || normalized is "developer" or "analyste";
    }));
});

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "AGILE AI", Version = "v1" });

    // This adds the "Authorize" button to the UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your access token returned by /api/User/authenticate}"
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
            new string[] {}
        }
    });
});

builder.Services.AddAutoMapper(typeof(Program));
builder.Services.AddSignalR();

builder.Services.AddControllers().AddNewtonsoftJson(options =>
    options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore);
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(entry => entry.Value.Errors.Count > 0)
            .ToDictionary(
                entry => entry.Key,
                entry => entry.Value.Errors.Select(error => error.ErrorMessage).ToArray());

        return new BadRequestObjectResult(new ApiErrorResponse
        {
            Message = "Request validation failed.",
            Code = "VALIDATION_ERROR",
            Errors = errors
        });
    };
});
DependencyContainer.RegisterServices(builder.Services);
// Ajoutez cette ligne avant d'enregistrer le middleware IPAddressMiddleware
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IProjectAuthorizationService, ProjectAuthorizationService>();
builder.Services.AddScoped<IProjectAnalyticsService, ProjectAnalyticsService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.Configure<CloudinaryOptions>(builder.Configuration.GetSection("Cloudinary"));
builder.Services.AddHttpClient();
builder.Services.AddScoped<ICloudinaryStorageService, CloudinaryStorageService>();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});


var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();

    const string devAdminEmail = "admin@agileai.com";
    const string devAdminPassword = "AgileAdmin@2026!";
    if (!dbContext.Users.Any(u => u.Email == devAdminEmail))
    {
        var passwordHasher = new PasswordHasher<User>();
        var devAdmin = new User
        {
            UserId = Guid.Parse("a0000001-0000-4000-8000-000000000001"),
            Nom = "Jeribi",
            Prenom = "Mohamed",
            Email = devAdminEmail,
            Telephone = "00000000",
            Role = "admin",
            Filiale = "HQ",
            isDeleted = false,
        };
        devAdmin.MotDePasse = passwordHasher.HashPassword(devAdmin, devAdminPassword);
        dbContext.Users.Add(devAdmin);
        dbContext.SaveChanges();
    }
    else
    {
        var admin = dbContext.Users.First(u => u.Email == devAdminEmail);
        admin.Nom = "Jeribi";
        admin.Prenom = "Mohamed";
        dbContext.SaveChanges();
    }

    DevDataSeeder.Seed(dbContext, new PasswordHasher<User>());
}

var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(Path.Combine(uploadsPath, "attachments"));

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "AGILE AI V1");
    });
}
else
{
    var servicePath = Environment.GetEnvironmentVariable("service");
    app.UseExceptionHandler("/Error");
    app.UseSwagger(c =>
    {
        c.RouteTemplate = "swagger/{documentName}/swagger.json";
        if (!string.IsNullOrWhiteSpace(servicePath))
        {
            var basePath = ":31633/" + servicePath;
            c.PreSerializeFilters.Add((swaggerDoc, httpReq) => swaggerDoc.Servers = new List<OpenApiServer>
            {
                new OpenApiServer { Url = $"{httpReq.Scheme}://{httpReq.Host.Value}{basePath}"}
            });
        }
    });

    var endpoint = string.IsNullOrWhiteSpace(servicePath)
        ? "/swagger/v1/swagger.json"
        : "/" + servicePath + "/swagger/v1/swagger.json";
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint(endpoint, "AGILE AI V1");
    });
}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads",
    ContentTypeProvider = new FileExtensionContentTypeProvider()
});
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStatusCodePages(async context =>
{
    var response = context.HttpContext.Response;

    if (response.HasStarted || !string.IsNullOrEmpty(response.ContentType))
        return;

    ApiErrorResponse error = null;

    if (response.StatusCode == StatusCodes.Status404NotFound)
    {
        error = new ApiErrorResponse
        {
            Message = "The requested resource was not found.",
            Code = "NOT_FOUND"
        };
    }
    else if (response.StatusCode == StatusCodes.Status403Forbidden)
    {
        error = new ApiErrorResponse
        {
            Message = "You are not allowed to access this resource.",
            Code = "FORBIDDEN"
        };
    }

    if (error == null)
        return;

    response.ContentType = "application/json";
    await response.WriteAsync(JsonSerializer.Serialize(error, new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    }));
});
app.UseRouting();
app.UseCors("CorsPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
    endpoints.MapHub<BoardHub>("/hubs/board");
});

app.Run();
