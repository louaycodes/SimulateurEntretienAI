"use client";

import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

interface TranscriptLiveProps {
    interimText: string;
    className?: string;
}

export function TranscriptLive({ interimText, className }: TranscriptLiveProps) {
    if (!interimText) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={clsx("flex justify-end", className)}
            >
                <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-primary-500/30 border-2 border-primary-500/50 text-gray-900 dark:text-white">
                    <p className="text-sm italic flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                        {interimText}
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

interface StreamingMessageProps {
    text: string;
    className?: string;
}

export function StreamingMessage({ text, className }: StreamingMessageProps) {
    if (!text) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx("flex justify-start", className)}
        >
            <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-gray-800 text-white">
                <p className="text-sm">
                    {text}
                    <motion.span
                        className="inline-block w-1 h-4 bg-primary-500 ml-1"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                    />
                </p>
            </div>
        </motion.div>
    );
}
