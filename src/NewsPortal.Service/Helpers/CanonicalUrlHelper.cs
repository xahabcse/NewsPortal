using System.Text;

namespace NewsPortal.Service.Helpers;

public static class CanonicalUrlHelper
{
    private static readonly HashSet<string> TrackingParameters = new(StringComparer.OrdinalIgnoreCase)
    {
        "fbclid",
        "gclid",
        "igshid",
        "mc_cid",
        "mc_eid",
        "ref",
        "ref_src",
        "_ga",
        "_gid",
        "_gl",
        "yclid",
        "_openstat",
        "pk_campaign",
        "pk_source",
        "pk_medium",
        "pk_keyword",
        "pk_content",
        "si",
        "spm",
        "share",
        "mkt_tok",
        "trk",
        "vero_id",
        "ncid"
    };

    public static string? Normalize(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri))
        {
            return null;
        }

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var builder = new UriBuilder(uri)
        {
            Fragment = string.Empty,
            Host = uri.Host.ToLowerInvariant()
        };

        if ((builder.Scheme == "http" && builder.Port == 80) ||
            (builder.Scheme == "https" && builder.Port == 443))
        {
            builder.Port = -1;
        }

        var path = string.IsNullOrWhiteSpace(builder.Path) ? "/" : builder.Path;
        builder.Path = path != "/" ? path.TrimEnd('/') : "/";

        var queryParams = ParseQuery(uri.Query)
            .Where(x => !x.Key.StartsWith("utm_", StringComparison.OrdinalIgnoreCase))
            .Where(x => !TrackingParameters.Contains(x.Key))
            .OrderBy(x => x.Key, StringComparer.Ordinal)
            .ThenBy(x => x.Value, StringComparer.Ordinal)
            .ToList();

        builder.Query = BuildQuery(queryParams);

        return builder.Uri.AbsoluteUri;
    }

    private static List<KeyValuePair<string, string>> ParseQuery(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new List<KeyValuePair<string, string>>();
        }

        return query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .Select(parts => new KeyValuePair<string, string>(
                Uri.UnescapeDataString(parts[0]),
                parts.Length > 1 ? Uri.UnescapeDataString(parts[1]) : string.Empty))
            .Where(x => !string.IsNullOrWhiteSpace(x.Key))
            .ToList();
    }

    private static string BuildQuery(IEnumerable<KeyValuePair<string, string>> parameters)
    {
        var items = parameters.ToList();
        if (!items.Any())
        {
            return string.Empty;
        }

        var sb = new StringBuilder();
        for (var i = 0; i < items.Count; i++)
        {
            if (i > 0)
            {
                sb.Append('&');
            }

            sb.Append(Uri.EscapeDataString(items[i].Key));

            if (!string.IsNullOrEmpty(items[i].Value))
            {
                sb.Append('=');
                sb.Append(Uri.EscapeDataString(items[i].Value));
            }
        }

        return sb.ToString();
    }
}
