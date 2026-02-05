import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "#e6fff5",
                    100: "#b3ffe0",
                    200: "#80ffcc",
                    300: "#4dffb8",
                    400: "#1affa3",
                    500: "#00ff88",
                    600: "#00cc6d",
                    700: "#009952",
                    800: "#006637",
                    900: "#00331c",
                },
                accent: {
                    DEFAULT: "#39FF14",
                    dark: "#2ecc10",
                },
            },
            backgroundImage: {
                "gradient-primary": "linear-gradient(135deg, #00FF88 0%, #39FF14 100%)",
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
            },
            boxShadow: {
                glow: "0 0 20px rgba(0, 255, 136, 0.3)",
                "glow-lg": "0 0 40px rgba(0, 255, 136, 0.4)",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "fade-in": "fadeIn 0.5s ease-in-out",
                "slide-up": "slideUp 0.5s ease-out",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
