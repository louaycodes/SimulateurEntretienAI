"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Video, Mic, Globe, Volume2, Eye, Save, CheckCircle, XCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { MainLayout } from "@/components/layout/MainLayout";
import { usePreferencesStore } from "@/store/preferences";
import { useTTSStore } from "@/store/ttsStore";
import { useToast } from "@/components/ui/Toast";
import { getAudioInputDevices, getVideoInputDevices } from "@/lib/media";
import * as TTS from "@/lib/tts";
import { Language } from "@/lib/types";

export default function SettingsPage() {
    const { showToast } = useToast();
    const {
        language,
        autoSubtitles,
        showGazeTips,
        selectedAudioInput,
        selectedVideoInput,
        setLanguage,
        setAutoSubtitles,
        setShowGazeTips,
        setSelectedAudioInput,
        setSelectedVideoInput,
    } = usePreferencesStore();

    const {
        enabled: ttsEnabled,
        voiceURI,
        rate: ttsRate,
        pitch: ttsPitch,
        volume: ttsVolume,
        setEnabled: setTtsEnabled,
        setVoiceURI,
        setRate: setTtsRate,
        setPitch: setTtsPitch,
        setVolume: setTtsVolume,
    } = useTTSStore();

    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [apiStatus, setApiStatus] = useState<"checking" | "configured" | "not_configured">("checking");
    const [isPlayingSample, setIsPlayingSample] = useState(false);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = TTS.getVoices();
            setAvailableVoices(voices);
        };

        loadVoices();

        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    const testVoice = () => {
        if (isPlayingSample) return;

        const text = language === "FR"
            ? "Bonjour, je suis votre recruteur IA. Commençons l'entretien."
            : "Hello, I'm your AI recruiter. Let's begin the interview.";

        const lang = language === "FR" ? "fr-FR" : "en-US";

        TTS.speak(text, {
            voiceURI: voiceURI || undefined,
            rate: ttsRate,
            pitch: ttsPitch,
            volume: ttsVolume,
            lang,
            onStart: () => setIsPlayingSample(true),
            onEnd: () => setIsPlayingSample(false),
            onError: () => setIsPlayingSample(false)
        });
    };

    useEffect(() => {
        const loadDevices = async () => {
            try {
                // Request permissions first
                await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

                const audio = await getAudioInputDevices();
                const video = await getVideoInputDevices();

                setAudioDevices(audio);
                setVideoDevices(video);
            } catch (error) {
                console.error("Failed to load devices:", error);
                showToast("error", "Failed to load media devices");
            } finally {
                setIsLoading(false);
            }
        };

        loadDevices();
    }, [showToast]);

    // Check API status
    useEffect(() => {
        const checkApiStatus = async () => {
            try {
                const response = await fetch("/api/status");

                if (response.ok) {
                    setApiStatus("configured");
                } else {
                    const error = await response.json();
                    // Check specific error codes
                    if (error.error?.code === "API_KEY_MISSING" || error.error?.code === "UNAUTHORIZED") {
                        setApiStatus("not_configured");
                    } else {
                        // For other errors (network, quota), we assume configured but failing
                        setApiStatus("configured");
                    }
                }
            } catch (error) {
                // Network error likely
                console.error("Status check failed", error);
                // Keep as checking or set to configured (soft fail)
                setApiStatus("not_configured");
            }
        };

        checkApiStatus();
    }, []);

    const handleSave = () => {
        showToast("success", "Settings saved successfully!");
    };

    return (
        <MainLayout>
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        Settings
                    </h1>
                    <p className="text-gray-400 mb-8">
                        Customize your interview experience
                    </p>

                    <div className="space-y-6">
                        {/* API Status Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        {apiStatus === "configured" ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                        Google Gemini API Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {apiStatus === "checking" && (
                                        <p className="text-gray-400">Checking API configuration...</p>
                                    )}
                                    {apiStatus === "configured" && (
                                        <div className="space-y-2">
                                            <p className="text-green-400 font-medium">✅ API Key Configured</p>
                                            <p className="text-sm text-gray-400">
                                                Your Gemini API is ready to use for interviews.
                                            </p>
                                        </div>
                                    )}
                                    {apiStatus === "not_configured" && (
                                        <div className="space-y-3">
                                            <p className="text-red-400 font-medium">❌ API Key Not Configured</p>
                                            <p className="text-sm text-gray-400">
                                                To use the AI interview feature, you need to configure your Google Gemini API key.
                                            </p>
                                            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-2">
                                                <p className="text-sm font-medium text-gray-300">Setup Instructions:</p>
                                                <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                                                    <li>Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Google AI Studio</a></li>
                                                    <li>Create a <code className="bg-gray-800 px-2 py-0.5 rounded text-xs">.env.local</code> file in the project root</li>
                                                    <li>Add: <code className="bg-gray-800 px-2 py-0.5 rounded text-xs">GEMINI_API_KEY=your_key_here</code></li>
                                                    <li>Restart the development server</li>
                                                </ol>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Language & Preferences */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe className="w-5 h-5" />
                                        Language & Preferences
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Interview Language
                                        </label>
                                        <Select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value as Language)}
                                            options={[
                                                { value: "EN", label: "English" },
                                                { value: "FR", label: "Français" },
                                            ]}
                                        />
                                    </div>



                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-300">Auto Subtitles</p>
                                            <p className="text-xs text-gray-500">Show live transcription</p>
                                        </div>
                                        <button
                                            onClick={() => setAutoSubtitles(!autoSubtitles)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoSubtitles ? "bg-purple-600" : "bg-gray-600"
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSubtitles ? "translate-x-6" : "translate-x-1"
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-300">Gaze Tips</p>
                                            <p className="text-xs text-gray-500">Get camera positioning hints</p>
                                        </div>
                                        <button
                                            onClick={() => setShowGazeTips(!showGazeTips)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showGazeTips ? "bg-purple-600" : "bg-gray-600"
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showGazeTips ? "translate-x-6" : "translate-x-1"
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Text-to-Speech Settings */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Volume2 className="w-5 h-5" />
                                            Voice & Speech
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs ${ttsEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                                                {ttsEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                            <button
                                                onClick={() => setTtsEnabled(!ttsEnabled)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ttsEnabled ? "bg-primary-600" : "bg-gray-600"
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ttsEnabled ? "translate-x-6" : "translate-x-1"
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </CardHeader>
                                {ttsEnabled && (
                                    <CardContent className="space-y-6">
                                        {/* Voice Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Recruiter Voice
                                            </label>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <Select
                                                        value={voiceURI || "default"}
                                                        onChange={(e) => setVoiceURI(e.target.value)}
                                                        options={[
                                                            { value: "default", label: "Default Voice" },
                                                            ...availableVoices
                                                                .filter(v => v.lang.toLowerCase().startsWith(language.toLowerCase()))
                                                                .map(v => ({
                                                                    value: v.voiceURI,
                                                                    label: `${v.name} (${v.lang})`
                                                                }))
                                                        ]}
                                                    />
                                                </div>
                                                <Button
                                                    onClick={testVoice}
                                                    variant="outline"
                                                    disabled={isPlayingSample}
                                                    title="Test Voice"
                                                >
                                                    <PlayCircle className={`w-4 h-4 ${isPlayingSample ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Speed / Rate */}
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-medium text-gray-300">Speed</label>
                                                <span className="text-xs text-gray-500">{ttsRate.toFixed(1)}x</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="1.5"
                                                step="0.1"
                                                value={ttsRate}
                                                onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                            />
                                        </div>

                                        {/* Pitch */}
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-medium text-gray-300">Pitch</label>
                                                <span className="text-xs text-gray-500">{ttsPitch.toFixed(1)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="1.5"
                                                step="0.1"
                                                value={ttsPitch}
                                                onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                            />
                                        </div>

                                        {/* Volume */}
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-medium text-gray-300">Volume</label>
                                                <span className="text-xs text-gray-500">{Math.round(ttsVolume * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={ttsVolume}
                                                onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                            />
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        </motion.div>

                        {/* Media Devices */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Video className="w-5 h-5" />
                                        Media Devices
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                            <Mic className="w-4 h-4" />
                                            Microphone
                                        </label>
                                        <Select
                                            value={selectedAudioInput || ""}
                                            onChange={(e) => setSelectedAudioInput(e.target.value)}
                                            options={[
                                                { value: "", label: "Default" },
                                                ...audioDevices.map((device) => ({
                                                    value: device.deviceId,
                                                    label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
                                                })),
                                            ]}
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                            <Video className="w-4 h-4" />
                                            Camera
                                        </label>
                                        <Select
                                            value={selectedVideoInput || ""}
                                            onChange={(e) => setSelectedVideoInput(e.target.value)}
                                            options={[
                                                { value: "", label: "Default" },
                                                ...videoDevices.map((device) => ({
                                                    value: device.deviceId,
                                                    label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
                                                })),
                                            ]}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Save Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            <Button
                                onClick={handleSave}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Settings
                            </Button>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </MainLayout>
    );
}
