"use client";

import { motion } from "framer-motion";
import { Mic, Brain, MessageSquare, User } from "lucide-react";
import { clsx } from "clsx";

type RecruiterState = "idle" | "listening" | "thinking" | "speaking";

interface RecruiterAvatarProps {
    state: RecruiterState;
    className?: string;
}

export function RecruiterAvatar({ state, className }: RecruiterAvatarProps) {
    const stateConfig = {
        idle: {
            icon: User,
            label: "Ready",
            accentColor: "rgba(156, 163, 175, 0.5)",    // gray
            glowColor: "rgba(156, 163, 175, 0.15)",
            dotColor: "bg-gray-400",
            labelColor: "text-gray-400",
            ringOpacity: 0.15,
        },
        listening: {
            icon: Mic,
            label: "Listening...",
            accentColor: "rgba(59, 130, 246, 0.6)",      // blue
            glowColor: "rgba(59, 130, 246, 0.2)",
            dotColor: "bg-blue-400",
            labelColor: "text-blue-400",
            ringOpacity: 0.3,
        },
        thinking: {
            icon: Brain,
            label: "Thinking...",
            accentColor: "rgba(245, 158, 11, 0.6)",      // amber
            glowColor: "rgba(245, 158, 11, 0.2)",
            dotColor: "bg-amber-400",
            labelColor: "text-amber-400",
            ringOpacity: 0.3,
        },
        speaking: {
            icon: MessageSquare,
            label: "Speaking...",
            accentColor: "rgba(0, 255, 136, 0.6)",       // green
            glowColor: "rgba(0, 255, 136, 0.2)",
            dotColor: "bg-primary-400",
            labelColor: "text-primary-400",
            ringOpacity: 0.4,
        },
    };

    const config = stateConfig[state];
    const Icon = config.icon;
    const isActive = state !== "idle";

    return (
        <div className={clsx("flex flex-col items-center justify-center gap-6 select-none", className)}>
            {/* Orb Container */}
            <div className="relative w-40 h-40 flex items-center justify-center">
                {/* Outer ring 3 - slowest orbit */}
                {isActive && (
                    <motion.div
                        className="absolute inset-[-24px] rounded-full border"
                        style={{
                            borderColor: config.accentColor,
                            opacity: config.ringOpacity * 0.5,
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    />
                )}

                {/* Outer ring 2 */}
                {isActive && (
                    <motion.div
                        className="absolute inset-[-14px] rounded-full border"
                        style={{
                            borderColor: config.accentColor,
                            opacity: config.ringOpacity * 0.7,
                        }}
                        animate={{ rotate: -360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    />
                )}

                {/* Inner ring - pulsing */}
                {isActive && (
                    <motion.div
                        className="absolute inset-[-4px] rounded-full border-2"
                        style={{ borderColor: config.accentColor }}
                        animate={{
                            scale: [1, 1.06, 1],
                            opacity: [config.ringOpacity, config.ringOpacity * 1.5, config.ringOpacity],
                        }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                )}

                {/* Glow layer */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
                    }}
                    animate={isActive ? {
                        scale: [1, 1.15, 1],
                        opacity: [0.6, 1, 0.6],
                    } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Main orb */}
                <div
                    className="relative w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                    style={{
                        background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.08) 0%, transparent 60%), 
                                     linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)`,
                        boxShadow: `0 0 40px ${config.glowColor}, inset 0 0 30px rgba(0,0,0,0.4)`,
                        border: `2px solid ${config.accentColor}`,
                    }}
                >
                    <motion.div
                        animate={state === "thinking" ? { rotate: 360 } : state === "speaking" ? { scale: [1, 1.1, 1] } : {}}
                        transition={
                            state === "thinking"
                                ? { duration: 2, repeat: Infinity, ease: "linear" }
                                : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                        }
                    >
                        <Icon className="w-14 h-14" style={{ color: config.accentColor }} />
                    </motion.div>
                </div>
            </div>

            {/* Label Area */}
            <div className="flex flex-col items-center gap-2">
                <h3 className="text-lg font-semibold text-white tracking-wide">AI Recruiter</h3>
                <div className="flex items-center gap-2">
                    <motion.div
                        className={clsx("w-2 h-2 rounded-full", config.dotColor)}
                        animate={isActive ? { opacity: [1, 0.3, 1] } : {}}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <span className={clsx("text-sm font-medium", config.labelColor)}>
                        {config.label}
                    </span>
                </div>
            </div>

            {/* Waveform Bars — only when speaking */}
            {state === "speaking" && (
                <div className="flex items-end gap-[3px] h-7">
                    {[...Array(9)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-[3px] bg-primary-400 rounded-full"
                            animate={{ height: ["6px", `${14 + Math.random() * 14}px`, "6px"] }}
                            transition={{
                                duration: 0.6 + Math.random() * 0.4,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.07,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Spinner dots — only when thinking */}
            {state === "thinking" && (
                <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 bg-amber-400 rounded-full"
                            animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.15,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
