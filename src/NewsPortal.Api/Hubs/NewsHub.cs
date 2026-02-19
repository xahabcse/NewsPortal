using Microsoft.AspNetCore.SignalR;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Hubs;

public class NewsHub : Hub<INewsHub>
{
    public override Task OnConnectedAsync()
    {
        Console.WriteLine($"Client connected: {Context.ConnectionId}");
        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"Client disconnected: {Context.ConnectionId}");
        return base.OnDisconnectedAsync(exception);
    }
}
