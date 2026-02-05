import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserPreferences, Language } from "@/lib/types";

interface PreferencesState extends UserPreferences {
    setLanguage: (language: Language) => void;
    setTtsEnabled: (enabled: boolean) => void;
    setAutoSubtitles: (enabled: boolean) => void;
    setShowGazeTips: (enabled: boolean) => void;
    setSelectedAudioInput: (deviceId: string) => void;
    setSelectedVideoInput: (deviceId: string) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set) => ({
            language: "EN",
            ttsEnabled: true,
            autoSubtitles: true,
            showGazeTips: true,
            selectedAudioInput: undefined,
            selectedVideoInput: undefined,

            setLanguage: (language) => set({ language }),
            setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
            setAutoSubtitles: (enabled) => set({ autoSubtitles: enabled }),
            setShowGazeTips: (enabled) => set({ showGazeTips: enabled }),
            setSelectedAudioInput: (deviceId) => set({ selectedAudioInput: deviceId }),
            setSelectedVideoInput: (deviceId) => set({ selectedVideoInput: deviceId }),
        }),
        {
            name: "preferences-storage",
        }
    )
);
