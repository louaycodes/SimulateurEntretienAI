import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LLMProvider } from "@/lib/types";

interface LLMSettings {
    provider: LLMProvider;
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
    useMockMode: boolean;
}

interface LLMState extends LLMSettings {
    setProvider: (provider: LLMProvider) => void;
    setBaseUrl: (url: string) => void;
    setModel: (model: string) => void;
    setTemperature: (temp: number) => void;
    setMaxTokens: (tokens: number) => void;
    setUseMockMode: (useMock: boolean) => void;
    getConfig: () => LLMSettings;
}

const DEFAULT_GROQ_URL = "https://api.groq.com/openai/v1";

export const useLLMStore = create<LLMState>()(
    persist(
        (set, get) => ({
            provider: "groq",
            baseUrl: DEFAULT_GROQ_URL,
            model: "llama-3.3-70b-versatile",
            temperature: 0.4,
            maxTokens: 1000,
            useMockMode: false,

            setProvider: (provider) => {
                set({ provider, baseUrl: DEFAULT_GROQ_URL, model: "llama-3.3-70b-versatile" });
            },

            setBaseUrl: (url) => set({ baseUrl: url }),
            setModel: (model) => set({ model }),
            setTemperature: (temp) => set({ temperature: temp }),
            setMaxTokens: (tokens) => set({ maxTokens: tokens }),
            setUseMockMode: (useMock) => set({ useMockMode: useMock }),

            getConfig: () => {
                const state = get();
                return {
                    provider: state.provider,
                    baseUrl: state.baseUrl,
                    model: state.model,
                    temperature: state.temperature,
                    maxTokens: state.maxTokens,
                    useMockMode: state.useMockMode,
                };
            },
        }),
        {
            name: "llm-settings",
        }
    )
);
