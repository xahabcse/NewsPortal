import * as signalR from '@microsoft/signalr';
import toast from 'react-hot-toast';

type NotificationCallback = (type: 'article' | 'breaking', title: string, category?: string) => void;

class SignalRService {
    private connection: signalR.HubConnection | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private notificationCallbacks: NotificationCallback[] = [];

    public onNotification(callback: NotificationCallback): void {
        this.notificationCallbacks.push(callback);
    }

    public start(): void {
        // Get token from auth storage
        const authRaw = localStorage.getItem('newsportal_auth');
        let token = '';
        if (authRaw) {
            try {
                const auth = JSON.parse(authRaw);
                token = auth.token || '';
            } catch {
                token = '';
            }
        }

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl('/newsHub', {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // Handle new article notifications
        this.connection.on('NewArticleAvailable', (_articleId: number, title: string, categoryName: string) => {
            this.handleNewArticle(title, categoryName);
        });

        // Handle breaking news
        this.connection.on('BreakingNews', (title: string) => {
            this.handleBreakingNews(title);
        });

        // Handle connection events
        this.connection.onclose((error) => {
            console.log('SignalR connection closed', error);
        });

        this.connection.onreconnecting((error) => {
            console.log('SignalR reconnecting', error);
        });

        this.connection.onreconnected((connectionId) => {
            console.log('SignalR reconnected', connectionId);
            this.reconnectAttempts = 0;
        });

        // Start connection
        this.startConnection();
    }

    private async startConnection(): Promise<void> {
        try {
            await this.connection!.start();
            console.log('SignalR Connected');
            this.reconnectAttempts = 0;
        } catch (err) {
            console.error('SignalR connection error:', err);
            this.attemptReconnect();
        }
    }

    private async attemptReconnect(): Promise<void> {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            setTimeout(() => this.startConnection(), 2000 * this.reconnectAttempts);
        }
    }

    private handleNewArticle(title: string, categoryName: string): void {
        // Call notification callbacks
        this.notificationCallbacks.forEach(cb => cb('article', title, categoryName));

        // Also show toast
        toast.success(
            `New Article: ${title} (${categoryName})`,
            {
                duration: 5000,
                position: 'top-right',
            }
        );
    }

    private handleBreakingNews(title: string): void {
        // Call notification callbacks
        this.notificationCallbacks.forEach(cb => cb('breaking', title));

        // Also show toast
        toast(
            `🔴 Breaking News: ${title}`,
            {
                duration: 8000,
                position: 'top-center',
                style: {
                    background: '#ef4444',
                    color: '#fff',
                },
            }
        );
    }

    public stop(): void {
        if (this.connection) {
            this.connection.stop();
            this.connection = null;
        }
    }

    public getConnection(): signalR.HubConnection | null {
        return this.connection;
    }
}

export const signalRService = new SignalRService();
