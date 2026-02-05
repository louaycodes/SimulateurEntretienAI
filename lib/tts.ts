// Text-to-Speech Utility using Web Speech API
// Browser-native TTS for recruiter voice

export interface TTSOptions {
    voiceURI?: string;
    rate?: number;      // 0.9-1.1, default 1.0
    pitch?: number;     // 0.9-1.1, default 1.0
    volume?: number;    // 0-1, default 1.0
    lang?: string;      // 'en-US', 'fr-FR'
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
}

class TTSManager {
    private synth: SpeechSynthesis | null = null;
    private currentUtterance: SpeechSynthesisUtterance | null = null;
    private voices: SpeechSynthesisVoice[] = [];
    private voicesLoaded = false;

    constructor() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.loadVoices();

            // Voices load asynchronously
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => {
                    this.loadVoices();
                };
            }
        }
    }

    private loadVoices() {
        if (this.synth) {
            this.voices = this.synth.getVoices();
            this.voicesLoaded = true;
            console.log(`[TTS] Loaded ${this.voices.length} voices`);
        }
    }

    /**
     * Check if TTS is supported
     */
    isSupported(): boolean {
        return this.synth !== null;
    }

    /**
     * Get all available voices
     */
    getVoices(): SpeechSynthesisVoice[] {
        if (!this.voicesLoaded && this.synth) {
            this.loadVoices();
        }
        return this.voices;
    }

    /**
     * Get voices filtered by language
     */
    getVoicesByLanguage(lang: string): SpeechSynthesisVoice[] {
        const voices = this.getVoices();
        const langPrefix = lang.substring(0, 2).toLowerCase(); // 'en' or 'fr'

        return voices.filter(voice =>
            voice.lang.toLowerCase().startsWith(langPrefix)
        );
    }

    /**
     * Find best voice for language
     */
    findBestVoice(lang: string, preferredURI?: string): SpeechSynthesisVoice | null {
        const voices = this.getVoices();

        // Try preferred voice first
        if (preferredURI) {
            const preferred = voices.find(v => v.voiceURI === preferredURI);
            if (preferred) return preferred;
        }

        // Try language-specific voices
        const langVoices = this.getVoicesByLanguage(lang);
        if (langVoices.length > 0) {
            // Prefer local voices over remote
            const localVoice = langVoices.find(v => v.localService);
            if (localVoice) return localVoice;
            return langVoices[0];
        }

        // Fallback to default
        return voices.length > 0 ? voices[0] : null;
    }

    /**
     * Speak text with options
     */
    speak(text: string, options: TTSOptions = {}): void {
        if (!this.synth || !text.trim()) {
            console.warn('[TTS] Cannot speak: synth not available or empty text');
            return;
        }

        // Cancel any ongoing speech
        this.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Set voice
        const voice = this.findBestVoice(
            options.lang || 'en-US',
            options.voiceURI
        );
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        } else if (options.lang) {
            utterance.lang = options.lang;
        }

        // Set parameters
        utterance.rate = options.rate ?? 1.0;
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume ?? 1.0;

        // Set callbacks
        utterance.onstart = () => {
            console.log('[TTS] Started speaking');
            options.onStart?.();
        };

        utterance.onend = () => {
            console.log('[TTS] Finished speaking');
            this.currentUtterance = null;
            options.onEnd?.();
        };

        utterance.onerror = (event) => {
            console.error('[TTS] Error:', event);
            this.currentUtterance = null;
            options.onError?.(event);
        };

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
    }

    /**
     * Cancel current speech
     */
    cancel(): void {
        if (this.synth) {
            this.synth.cancel();
            this.currentUtterance = null;
        }
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return this.synth?.speaking ?? false;
    }

    /**
     * Pause speech
     */
    pause(): void {
        if (this.synth && this.synth.speaking) {
            this.synth.pause();
        }
    }

    /**
     * Resume speech
     */
    resume(): void {
        if (this.synth && this.synth.paused) {
            this.synth.resume();
        }
    }
}

// Singleton instance
let ttsInstance: TTSManager | null = null;

export function getTTS(): TTSManager {
    if (!ttsInstance) {
        ttsInstance = new TTSManager();
    }
    return ttsInstance;
}

// Convenience exports
export const isSupported = () => getTTS().isSupported();
export const getVoices = () => getTTS().getVoices();
export const getVoicesByLanguage = (lang: string) => getTTS().getVoicesByLanguage(lang);
export const speak = (text: string, options?: TTSOptions) => getTTS().speak(text, options);
export const cancel = () => getTTS().cancel();
export const isSpeaking = () => getTTS().isSpeaking();
export const pause = () => getTTS().pause();
export const resume = () => getTTS().resume();
