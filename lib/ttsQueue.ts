import * as TTS from "@/lib/tts";

/**
 * Queue for managing streaming text-to-speech.
 * Accumulates text chunks, splits by sentence, and speaks them sequentially.
 */
export class TTSQueue {
    private buffer: string = "";
    private queue: string[] = [];
    private isSpeaking: boolean = false;
    private onStartCallback?: () => void;
    private onEndCallback?: () => void;
    private onSpeakingStateChange?: (isSpeaking: boolean) => void;

    constructor(callbacks?: {
        onStart?: () => void;
        onEnd?: () => void;
        onSpeakingStateChange?: (isSpeaking: boolean) => void;
    }) {
        this.onStartCallback = callbacks?.onStart;
        this.onEndCallback = callbacks?.onEnd;
        this.onSpeakingStateChange = callbacks?.onSpeakingStateChange;
    }

    /**
     * Add text chunk to the buffer.
     * Automatically detects sentence boundaries and queues them for speaking.
     */
    enqueue(textChunk: string) {
        this.buffer += textChunk;
        this.processBuffer();
    }

    /**
     * Force process the remaining buffer (e.g. at end of stream).
     */
    flush() {
        if (this.buffer.trim().length > 0) {
            this.queue.push(this.buffer.trim());
            this.buffer = "";
            this.processQueue();
        }
    }

    /**
     * Clear queue and stop speaking.
     */
    cancel() {
        this.buffer = "";
        this.queue = [];
        this.isSpeaking = false;
        TTS.cancel();
        this.onSpeakingStateChange?.(false);
    }

    /**
     * Process buffer to find sentence boundaries.
     */
    private processBuffer() {
        // Simple sentence boundary detection
        // Looks for punctuation . ? ! : followed by space or end of string
        // Also considers newlines
        // Avoids splitting abbreviations like "Mr." (basic heuristic: checks length of last word)

        let boundaryIndex = -1;
        const punctuation = ['.', '?', '!', ':', '\n'];

        // Find the earliest valid boundary
        for (let i = 0; i < this.buffer.length; i++) {
            const char = this.buffer[i];

            if (punctuation.includes(char)) {
                // Must be followed by space or is the last char (if we are aggressive, but better wait for space to confirm sentence end unless flush called)
                // Actually, for streaming, we should wait for the space after punctuation to be sure it's the end.
                // Exception: Newline is always a break.

                const isNewline = char === '\n';
                const hasNextCharRaw = i + 1 < this.buffer.length;
                const nextChar = hasNextCharRaw ? this.buffer[i + 1] : null;
                const isEndRequest = hasNextCharRaw && /\s/.test(nextChar!); // Punctuation followed by whitespace

                if (isNewline || isEndRequest) {
                    // It's a boundary.
                    // Heuristic: Check if fragment is long enough to be a sentence (avoid "e.g.")
                    const fragment = this.buffer.substring(0, i + 1);

                    if (fragment.trim().length > 0) {
                        boundaryIndex = i + 1;
                        break;
                    }
                }
            }
        }

        if (boundaryIndex !== -1) {
            const sentence = this.buffer.substring(0, boundaryIndex).trim();
            this.buffer = this.buffer.substring(boundaryIndex);

            if (sentence.length > 0) {
                this.queue.push(sentence);
                this.processQueue();
            }

            // Recursively process buffer in case there are multiple sentences
            this.processBuffer();
        }
    }

    /**
     * Process the queue sequentially
     */
    private processQueue() {
        if (this.isSpeaking || this.queue.length === 0) {
            return;
        }

        const text = this.queue.shift();
        if (!text) return;

        this.isSpeaking = true;
        this.onSpeakingStateChange?.(true);

        // Notify start only on the first chunk of a sequence?
        // Or for every chunk? The UI usually expects "Recruiter is speaking".
        // If we are just starting, call onStart.

        // Actually, we want to call onStart when the first chunk starts, 
        // and onEnd ONLY when the queue is empty and the last chunk finishes.

        // But for granular control (e.g. echo cancellation), we might want to know each time.
        // Let's rely on isSpeaking flag.

        const options = this.getTTSOptions();

        TTS.speak(text, {
            ...options,
            onStart: () => {
                this.onStartCallback?.();
            },
            onEnd: () => {
                this.isSpeaking = false;
                // If queue has more, process next
                if (this.queue.length > 0) {
                    this.processQueue();
                } else {
                    // Finished everything
                    this.onSpeakingStateChange?.(false);
                    this.onEndCallback?.();
                }
            },
            onError: (err) => {
                console.error("TTS Queue Error:", err);
                this.isSpeaking = false;
                this.onSpeakingStateChange?.(false);
                // If error, maybe skip to next?
                if (this.queue.length > 0) {
                    this.processQueue();
                } else {
                    this.onEndCallback?.();
                }
            }
        });
    }

    /**
     * Helper to get current TTS options from store/prefs if needed.
     * Since this class is generic, we can accept options in constructor or enqueue,
     * but simpler to just pull from default simple TTS usage or let the caller configure TTS.ts global defaults?
     * The `TTS.speak` uses its own internal logic to find voices if not provided.
     * We'll rely on global store integration in the page component.
     * We can inject options via a method if needed.
     */
    private getTTSOptions() {
        // In a real app, we'd pass these in. For now, use defaults or what TTS.ts finds.
        // The Page component syncs the store.
        // But wait, page.tsx passed specific rate/pitch/voiceURI. 
        // We should add a setOptions method.
        return this.currentOptions;
    }

    private currentOptions: TTS.TTSOptions = {};

    setOptions(options: TTS.TTSOptions) {
        this.currentOptions = options;
    }
}
