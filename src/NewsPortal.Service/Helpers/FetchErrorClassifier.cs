using System.Net;

namespace NewsPortal.Service.Helpers;

public static class FetchErrorClassifier
{
    public static string Classify(Exception exception)
    {
        return exception switch
        {
            TimeoutException => "NETWORK_TIMEOUT",
            TaskCanceledException => "NETWORK_TIMEOUT",

            HttpRequestException httpEx => ClassifyHttpRequestException(httpEx),

            InvalidOperationException => "PARSER_FAILED",
            NotSupportedException => "PARSER_FAILED",
            FormatException => "PARSER_FAILED",

            InvalidDataException => "INVALID_PAYLOAD",

            _ => ClassifyByTypeName(exception)
        };
    }

    public static string ClassifyHttpStatus(HttpStatusCode? statusCode)
    {
        if (statusCode is null)
        {
            return "DNS_FAILURE";
        }

        return statusCode switch
        {
            HttpStatusCode.TooManyRequests => "RATE_LIMITED",
            HttpStatusCode.Unauthorized => "AUTH_FAILED",
            HttpStatusCode.Forbidden => "AUTH_FAILED",
            _ => "HTTP_ERROR"
        };
    }

    private static string ClassifyHttpRequestException(HttpRequestException exception)
    {
        return ClassifyHttpStatus(exception.StatusCode);
    }

    private static string ClassifyByTypeName(Exception exception)
    {
        var typeName = exception.GetType().FullName;

        return typeName switch
        {
            "System.Xml.XmlException" => "PARSER_FAILED",
            "System.Text.Json.JsonException" => "INVALID_PAYLOAD",
            _ when IsStorageException(typeName) => "STORAGE_FAILED",
            _ => "UNKNOWN"
        };
    }

    private static bool IsStorageException(string? typeName)
    {
        if (string.IsNullOrEmpty(typeName))
        {
            return false;
        }

        return typeName.StartsWith("Microsoft.EntityFrameworkCore.DbUpdate", StringComparison.Ordinal) ||
               typeName.StartsWith("MongoDB.Driver.Mongo", StringComparison.Ordinal);
    }
}
