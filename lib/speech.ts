// Speech Recognition adapter for live transcription

export interface SpeechRecognitionAdapter {
    isSupported: boolean;
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    onInterim: (callback: (text: string) => void) => void;
    onFinal: (callback: (text: string) => void) => void;
    onError: (callback: (error: Error) => void) => void;
    setLanguage: (language: string) => void;
}

// Web Speech API implementation
export class WebSpeechRecognition implements SpeechRecognitionAdapter {
    private recognition: any;
    private interimCallback?: (text: string) => void;
    private finalCallback?: (text: string) => void;
    private errorCallback?: (error: Error) => void;
    private isPaused = false;
    public isSupported: boolean;

    constructor() {
        // Check for browser support
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        this.isSupported = !!SpeechRecognition;

        if (this.isSupported) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;

            this.recognition.onresult = (event: any) => {
                if (this.isPaused) return; // Safety check: ignore results while paused

                let interimTranscript = "";
                let finalTranscript = "";

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (interimTranscript && this.interimCallback) {
                    this.interimCallback(interimTranscript);
                }

                if (finalTranscript && this.finalCallback) {
                    this.finalCallback(finalTranscript);
                }
            };

            this.recognition.onerror = (event: any) => {
                // Ignore certain errors that are not critical
                if (event.error === 'no-speech' || event.error === 'aborted') {
                    return;
                }

                if (this.errorCallback) {
                    this.errorCallback(new Error(event.error));
                }
            };

            this.recognition.onend = () => {
                // Auto-restart if stopped unexpectedly but not paused
                // This logic is usually handled by the component re-starting, 
                // but we can add flag checks here if needed.
            };
        }
    }

    start(): void {
        this.isPaused = false;
        if (this.recognition) {
            try {
                this.recognition.start();
            } catch (error) {
                // Already started, ignore
            }
        }
    }

    stop(): void {
        this.isPaused = false;
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    pause(): void {
        this.isPaused = true;
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    resume(): void {
        this.isPaused = false;
        if (this.recognition) {
            try {
                this.recognition.start();
            } catch (error) {
                // Already started, ignore
            }
        }
    }

    onInterim(callback: (text: string) => void): void {
        this.interimCallback = callback;
    }

    onFinal(callback: (text: string) => void): void {
        this.finalCallback = callback;
    }

    onError(callback: (error: Error) => void): void {
        this.errorCallback = callback;
    }

    setLanguage(language: string): void {
        if (this.recognition) {
            // Convert our language codes to Speech API format
            const langMap: Record<string, string> = {
                EN: "en-US",
                FR: "fr-FR",
            };
            this.recognition.lang = langMap[language] || "en-US";
        }
    }
}

// Fallback text input implementation
export class TextInputRecognition implements SpeechRecognitionAdapter {
    public isSupported = true; // Always supported as fallback
    private finalCallback?: (text: string) => void;

    start(): void {
        // No-op for text input
    }

    stop(): void {
        // No-op for text input
    }

    pause(): void {
        // No-op for text input
    }

    resume(): void {
        // No-op for text input
    }

    onInterim(callback: (text: string) => void): void {
        // Not used for text input
    }

    onFinal(callback: (text: string) => void): void {
        this.finalCallback = callback;
    }

    onError(callback: (error: Error) => void): void {
        // No-op for text input
    }

    setLanguage(language: string): void {
        // No-op for text input
    }

    // Method to manually submit text
    submitText(text: string): void {
        if (this.finalCallback) {
            this.finalCallback(text);
        }
    }
}
export function createSpeechRecognition(preferWebSpeech = true): SpeechRecognitionAdapter {
    if (preferWebSpeech) {
        const webSpeech = new WebSpeechRecognition();
        if (webSpeech.isSupported) {
            return webSpeech;
        }
    }
    return new TextInputRecognition();
}
