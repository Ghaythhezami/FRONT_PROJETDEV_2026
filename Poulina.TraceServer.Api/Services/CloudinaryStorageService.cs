using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
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
            var useUnsignedPreset = !string.IsNullOrWhiteSpace(_options.UploadPreset) &&
                                    (string.IsNullOrWhiteSpace(_options.ApiKey) ||
                                     string.IsNullOrWhiteSpace(_options.ApiSecret));

            if (!useUnsignedPreset &&
                (string.IsNullOrWhiteSpace(_options.ApiKey) ||
                 string.IsNullOrWhiteSpace(_options.ApiSecret)))
            {
                throw new InvalidOperationException("Cloudinary API key and secret are required for signed uploads.");
            }

            using var stream = file.OpenReadStream();
            using var content = new MultipartFormDataContent();

            if (useUnsignedPreset)
            {
                content.Add(new StringContent(_options.UploadPreset.Trim()), "upload_preset");
                content.Add(new StringContent(folder), "folder");
            }
            else
            {
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                var parameters = new SortedDictionary<string, string>
                {
                    ["folder"] = folder,
                    ["timestamp"] = timestamp.ToString(),
                };

                var signaturePayload = string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}")) +
                                       _options.ApiSecret;
                var signature = Sha1Hex(signaturePayload);

                content.Add(new StringContent(_options.ApiKey), "api_key");
                content.Add(new StringContent(timestamp.ToString()), "timestamp");
                content.Add(new StringContent(folder), "folder");
                content.Add(new StringContent(signature), "signature");
            }

            content.Add(new StreamContent(stream), "file", file.FileName);

            var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsync(
                $"https://api.cloudinary.com/v1_1/{_options.CloudName}/{resourceType}/upload",
                content);

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

        private static string Sha1Hex(string input)
        {
            using var sha1 = SHA1.Create();
            var hash = sha1.ComputeHash(Encoding.UTF8.GetBytes(input));
            var builder = new StringBuilder(hash.Length * 2);
            foreach (var b in hash)
            {
                builder.Append(b.ToString("x2"));
            }

            return builder.ToString();
        }
    }
}
