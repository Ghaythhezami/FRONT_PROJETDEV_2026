using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace AgileAi.Api.Services
{
    public class CloudinaryUploadResult
    {
        public string Url { get; set; }
        public string PublicId { get; set; }
        public string ResourceType { get; set; }
        public long Bytes { get; set; }
    }

    public interface ICloudinaryStorageService
    {
        Task<CloudinaryUploadResult> UploadAsync(IFormFile file);
    }

    public class CloudinaryStorageService : ICloudinaryStorageService
    {
        private readonly CloudinaryOptions _options;
        private readonly IHttpClientFactory _httpClientFactory;

        public CloudinaryStorageService(
            IOptions<CloudinaryOptions> options,
            IHttpClientFactory httpClientFactory)
        {
            _options = options.Value;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<CloudinaryUploadResult> UploadAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                throw new InvalidOperationException("File is required.");
            }

            if (string.IsNullOrWhiteSpace(_options.CloudName))
            {
                throw new InvalidOperationException("Cloudinary is not configured.");
            }

            var folder = _options.Folder?.Trim() ?? "agile-ai";
            var resourceType = ResolveResourceType(file.FileName);
            var hasApiCredentials = !string.IsNullOrWhiteSpace(_options.ApiKey) &&
                                    !string.IsNullOrWhiteSpace(_options.ApiSecret);
            var hasUploadPreset = !string.IsNullOrWhiteSpace(_options.UploadPreset);

            if (!hasApiCredentials && !hasUploadPreset)
            {
                throw new InvalidOperationException(
                    "Cloudinary requires API key + secret (signed/basic auth) or an unsigned UploadPreset.");
            }

            using var stream = file.OpenReadStream();
            using var content = new MultipartFormDataContent();

            if (!string.IsNullOrWhiteSpace(folder))
            {
                content.Add(new StringContent(folder), "folder");
            }

            if (!hasApiCredentials && hasUploadPreset)
            {
                content.Add(new StringContent(_options.UploadPreset.Trim()), "upload_preset");
            }

            content.Add(new StreamContent(stream), "file", file.FileName);

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"https://api.cloudinary.com/v1_1/{_options.CloudName}/{resourceType}/upload")
            {
                Content = content,
            };

            if (hasApiCredentials)
            {
                // Server-side uploads: Basic Auth (recommended by Cloudinary — no manual signature).
                // https://cloudinary.com/documentation/image_upload_api_reference
                var credentials = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes($"{_options.ApiKey}:{_options.ApiSecret}"));
                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
            }

            var client = _httpClientFactory.CreateClient();
            var response = await client.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Cloudinary upload failed: {body}");
            }

            using var json = JsonDocument.Parse(body);
            var root = json.RootElement;

            return new CloudinaryUploadResult
            {
                Url = root.GetProperty("secure_url").GetString(),
                PublicId = root.GetProperty("public_id").GetString(),
                ResourceType = root.TryGetProperty("resource_type", out var rt) ? rt.GetString() : resourceType,
                Bytes = root.TryGetProperty("bytes", out var bytes) ? bytes.GetInt64() : file.Length,
            };
        }

        private static string ResolveResourceType(string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension is ".jpg" or ".jpeg" or ".png" or ".gif" or ".webp" or ".bmp" or ".svg"
                ? "image"
                : "raw";
        }
    }
}
