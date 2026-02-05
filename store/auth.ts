import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/lib/types";

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,

            login: async (email: string, password: string) => {
                // Fake authentication
                await new Promise((resolve) => setTimeout(resolve, 500));

                const user: User = {
                    id: "user-1",
                    email,
                    name: email.split("@")[0],
                    createdAt: Date.now(),
                };

                set({ user, isAuthenticated: true });
            },

            register: async (email: string, password: string, name: string) => {
                // Fake registration
                await new Promise((resolve) => setTimeout(resolve, 500));

                const user: User = {
                    id: "user-1",
                    email,
                    name,
                    createdAt: Date.now(),
                };

                set({ user, isAuthenticated: true });
            },

            logout: () => {
                set({ user: null, isAuthenticated: false });
            },
        }),
        {
            name: "auth-storage",
        }
    )
);
