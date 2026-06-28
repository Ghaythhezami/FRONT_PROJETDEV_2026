namespace AgileAi.Api.Services
{
    public class CloudinaryOptions
    {
        public string CloudName { get; set; }
        public string ApiKey { get; set; }
        public string ApiSecret { get; set; }
        public string Folder { get; set; } = "agile-ai";
        public string UploadPreset { get; set; }
    }
}
