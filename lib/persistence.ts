import { InterviewConfig } from "./types";

// Types corresponding to DB interactions
export interface DbSession {
    id: string;
    createdAt: string;
    status: string;
}

export interface DbMessage {
    role: "recruiter" | "candidate";
    text: string;
    timestampMs: number;
    elapsedSec: number;
    recruiterMsgId?: string;
}

class SessionPersistence {
    private sessionId: string | null = null;
    private messageQueue: DbMessage[] = [];
    private isFlushing = false;
    private flushInterval: NodeJS.Timeout | null = null;

    /**
     * Create a new session in the database
     */
    async createSession(config: InterviewConfig): Promise<string> {
        try {
            const response = await fetch('/api/sessions/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            if (!response.ok) {
                throw new Error('Failed to create session');
            }

            const data = await response.json();
            this.sessionId = data.sessionId;
            this.startQueue();

            console.log(`[Persistence] Session created: ${this.sessionId}`);
            return this.sessionId!;
        } catch (error) {
            console.error('[Persistence] Create Error:', error);
            throw error;
        }
    }

    /**
     * Queue a message to be saved
     */
    queueMessage(message: DbMessage) {
        if (!this.sessionId) {
            console.warn('[Persistence] Queue ignored: No active session');
            return;
        }

        this.messageQueue.push(message);

        // Trigger immediate flush if queue gets too big
        if (this.messageQueue.length >= 5) {
            this.flush();
        }
    }

    /**
     * Start the auto-flush interval
     */
    private startQueue() {
        if (this.flushInterval) clearInterval(this.flushInterval);

        // Flush every 2 seconds if there are messages
        this.flushInterval = setInterval(() => {
            this.flush();
        }, 2000);
    }

    /**
     * Flush queue to database
     */
    private async flush() {
        if (this.isFlushing || this.messageQueue.length === 0 || !this.sessionId) return;

        this.isFlushing = true;
        const messagesToSend = [...this.messageQueue];
        this.messageQueue = []; // Clear local queue

        try {
            // Send each message (sequentially to preserve order if needed, or batch if API supported)
            // Current API is single message per call
            for (const msg of messagesToSend) {
                await fetch(`/api/sessions/${this.sessionId}/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(msg),
                });
            }
        } catch (error) {
            console.error('[Persistence] Flush Error:', error);
            // Re-queue failed messages? For now, we log.
            // In a robust system, we might retry.
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * End the session and get final report
     */
    async endSession(messages: any[], config: any): Promise<any> {
        if (!this.sessionId) throw new Error('No active session id');

        // Flush remaining messages first
        await this.flush();
        if (this.flushInterval) clearInterval(this.flushInterval);

        try {
            const response = await fetch(`/api/sessions/${this.sessionId}/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages,
                    interviewParams: config
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to end session');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('[Persistence] End Error:', error);
            throw error;
        }
    }

    setSessionId(id: string) {
        this.sessionId = id;
        this.startQueue();
    }
}

export const persistence = new SessionPersistence();
