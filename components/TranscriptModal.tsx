"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle } from "lucide-react";
import { ConversationMessage } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface TranscriptModalProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ConversationMessage[];
}

export default function TranscriptModal({ isOpen, onClose, messages }: TranscriptModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-primary-400" />
                            <h2 className="text-lg font-semibold text-white">Full Transcript</h2>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-500 py-12">
                                No messages yet.
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col gap-1 ${msg.type === 'recruiter' ? 'items-start' : 'items-end'}`}>
                                    <span className="text-xs text-gray-500 uppercase font-mono mb-1">
                                        {msg.type === 'recruiter' ? 'Recruiter' : 'You'}
                                    </span>
                                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.type === 'recruiter'
                                            ? 'bg-gray-800 text-gray-100 rounded-tl-none'
                                            : 'bg-primary-600/20 text-primary-100 border border-primary-500/30 rounded-tr-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
