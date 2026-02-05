import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LLMProvider } from "@/lib/llmClient";

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

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_OPENAI_URL = "http://localhost:1234/v1";

export const useLLMStore = create<LLMState>()(
    persist(
        (set, get) => ({
            provider: "ollama",
            baseUrl: DEFAULT_OLLAMA_URL,
            model: "deepseek-r1",
            temperature: 0.7,
            maxTokens: 1000,
            useMockMode: false,

            setProvider: (provider) => {
                const baseUrl = provider === "ollama" ? DEFAULT_OLLAMA_URL : DEFAULT_OPENAI_URL;
                const model = provider === "ollama" ? "deepseek-r1" : "deepseek";
                set({ provider, baseUrl, model });
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
