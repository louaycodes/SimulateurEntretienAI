"use client";

import { motion } from "framer-motion";
import { Mic, Brain, MessageSquare } from "lucide-react";
import { clsx } from "clsx";

type RecruiterState = "idle" | "listening" | "thinking" | "speaking";

interface RecruiterAvatarProps {
    state: RecruiterState;
    className?: string;
}

export function RecruiterAvatar({ state, className }: RecruiterAvatarProps) {
    const stateConfig = {
        idle: {
            icon: MessageSquare,
            color: "text-gray-400",
            ringColor: "ring-gray-400/30",
            label: "Ready",
        },
        listening: {
            icon: Mic,
            color: "text-blue-500",
            ringColor: "ring-blue-500/50",
            label: "Listening...",
        },
        thinking: {
            icon: Brain,
            color: "text-yellow-500",
            ringColor: "ring-yellow-500/50",
            label: "Thinking...",
        },
        speaking: {
            icon: MessageSquare,
            color: "text-primary-500",
            ringColor: "ring-primary-500/50",
            label: "Speaking...",
        },
    };

    const config = stateConfig[state];
    const Icon = config.icon;

    return (
        <div className={clsx("flex items-center gap-4", className)}>
            {/* Avatar with animated ring */}
            <div className="relative">
                {/* Pulsing rings for active states */}
                {(state === "listening" || state === "thinking" || state === "speaking") && (
                    <>
                        <motion.div
                            className={clsx(
                                "absolute inset-0 rounded-full ring-4",
                                config.ringColor
                            )}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 0.2, 0.5],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                        <motion.div
                            className={clsx(
                                "absolute inset-0 rounded-full ring-4",
                                config.ringColor
                            )}
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.3, 0, 0.3],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.5,
                            }}
                        />
                    </>
                )}

                {/* Main avatar circle */}
                <div
                    className={clsx(
                        "relative w-16 h-16 rounded-full flex items-center justify-center",
                        "bg-gradient-to-br from-gray-800 to-gray-900",
                        "border-2",
                        state === "idle" ? "border-gray-600" : "border-primary-500"
                    )}
                >
                    <Icon className={clsx("w-8 h-8", config.color)} />
                </div>
            </div>

            {/* State info */}
            <div>
                <h3 className="text-lg font-semibold text-white">AI Recruiter</h3>
                <p className={clsx("text-sm", config.color)}>{config.label}</p>
            </div>

            {/* Waveform animation for speaking state */}
            {state === "speaking" && (
                <div className="flex items-center gap-1 ml-auto">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-1 bg-primary-500 rounded-full"
                            animate={{
                                height: ["8px", "24px", "8px"],
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.1,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Spinner for thinking state */}
            {state === "thinking" && (
                <motion.div
                    className="ml-auto"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <Brain className="w-6 h-6 text-yellow-500" />
                </motion.div>
            )}
        </div>
    );
}
