import { IncomingMessage, OutgoingMessage } from "./types";

type MessageHandler = (message: IncomingMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Error) => void;

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private messageHandlers: Set<MessageHandler> = new Set();
    private connectionHandlers: Set<ConnectionHandler> = new Set();
    private disconnectionHandlers: Set<ConnectionHandler> = new Set();
    private errorHandlers: Set<ErrorHandler> = new Set();
    private isIntentionallyClosed = false;

    constructor(baseUrl: string) {
        this.url = baseUrl;
    }

    connect(params?: Record<string, string>): void {
        this.isIntentionallyClosed = false;

        let url = this.url;
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            url = `${url}?${queryString}`;
        }

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log("WebSocket connected");
                this.reconnectAttempts = 0;
                this.connectionHandlers.forEach((handler) => handler());
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: IncomingMessage = JSON.parse(event.data);
                    this.messageHandlers.forEach((handler) => handler(message));
                } catch (error) {
                    console.error("Failed to parse WebSocket message:", error);
                }
            };

            this.ws.onerror = (event) => {
                console.error("WebSocket error:", event);
                const error = new Error("WebSocket connection error");
                this.errorHandlers.forEach((handler) => handler(error));
            };

            this.ws.onclose = () => {
                console.log("WebSocket disconnected");
                this.disconnectionHandlers.forEach((handler) => handler());

                if (!this.isIntentionallyClosed) {
                    this.attemptReconnect(params);
                }
            };
        } catch (error) {
            console.error("Failed to create WebSocket:", error);
            const err = error instanceof Error ? error : new Error("Unknown error");
            this.errorHandlers.forEach((handler) => handler(err));
        }
    }

    private attemptReconnect(params?: Record<string, string>): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

            setTimeout(() => {
                this.connect(params);
            }, delay);
        } else {
            console.error("Max reconnection attempts reached");
            const error = new Error("Failed to reconnect after maximum attempts");
            this.errorHandlers.forEach((handler) => handler(error));
        }
    }

    send(message: OutgoingMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error("WebSocket is not connected");
            throw new Error("WebSocket is not connected");
        }
    }

    disconnect(): void {
        this.isIntentionallyClosed = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    onConnect(handler: ConnectionHandler): () => void {
        this.connectionHandlers.add(handler);
        return () => this.connectionHandlers.delete(handler);
    }

    onDisconnect(handler: ConnectionHandler): () => void {
        this.disconnectionHandlers.add(handler);
        return () => this.disconnectionHandlers.delete(handler);
    }

    onError(handler: ErrorHandler): () => void {
        this.errorHandlers.add(handler);
        return () => this.errorHandlers.delete(handler);
    }

    getReadyState(): number {
        return this.ws?.readyState ?? WebSocket.CLOSED;
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
    if (!wsClient) {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";
        wsClient = new WebSocketClient(wsUrl);
    }
    return wsClient;
}
