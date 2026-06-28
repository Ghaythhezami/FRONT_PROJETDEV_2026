using System.Collections.Generic;

namespace AgileAi.Domain.Dto
{
    public class PagedResponseDto<T>
    {
        public IEnumerable<T> Items { get; set; }
        public int Page { get; set; }
        public int Limit { get; set; }
        public int Total { get; set; }
        public bool HasMore { get; set; }
    }
}
