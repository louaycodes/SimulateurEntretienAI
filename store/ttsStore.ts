// TTS (Text-to-Speech) Store
// Manages TTS preferences and state

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TTSState {
    // Preferences (persisted)
    enabled: boolean;
    voiceURI: string | null;
    rate: number;          // 0.9-1.1
    pitch: number;         // 0.9-1.1
    volume: number;        // 0-1

    // Runtime state (not persisted)
    isSpeaking: boolean;
    lastSpokenMessageId: string | null;

    // Actions
    setEnabled: (enabled: boolean) => void;
    setVoiceURI: (uri: string | null) => void;
    setRate: (rate: number) => void;
    setPitch: (pitch: number) => void;
    setVolume: (volume: number) => void;
    setIsSpeaking: (speaking: boolean) => void;
    setLastSpokenMessageId: (id: string | null) => void;
    reset: () => void;
}

const initialState = {
    enabled: true,
    voiceURI: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    isSpeaking: false,
    lastSpokenMessageId: null,
};

export const useTTSStore = create<TTSState>()(
    persist(
        (set) => ({
            ...initialState,

            setEnabled: (enabled) => set({ enabled }),
            setVoiceURI: (uri) => set({ voiceURI: uri }),
            setRate: (rate) => set({ rate: Math.max(0.5, Math.min(2.0, rate)) }),
            setPitch: (pitch) => set({ pitch: Math.max(0.5, Math.min(2.0, pitch)) }),
            setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
            setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),
            setLastSpokenMessageId: (id) => set({ lastSpokenMessageId: id }),
            reset: () => set(initialState),
        }),
        {
            name: "tts-storage",
            // Only persist preferences, not runtime state
            partialize: (state) => ({
                enabled: state.enabled,
                voiceURI: state.voiceURI,
                rate: state.rate,
                pitch: state.pitch,
                volume: state.volume,
            }),
        }
    )
);
