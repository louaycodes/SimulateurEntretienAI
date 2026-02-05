"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, GraduationCap, MessageSquare, Globe, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Role, Level, InterviewType, Language } from "@/lib/types";
import { useInterviewStore } from "@/store/interview";
import { usePreferencesStore } from "@/store/preferences";

export default function OnboardingPage() {
    const router = useRouter();
    const { setConfig } = useInterviewStore();
    const { language: savedLanguage, setLanguage } = usePreferencesStore();

    const [role, setRole] = useState<Role>("Backend");
    const [level, setLevel] = useState<Level>("mid");
    const [interviewType, setInterviewType] = useState<InterviewType>("Mixed");
    const [language, setLang] = useState<Language>(savedLanguage);
    const [duration, setDuration] = useState(20);

    const roleOptions = [
        { value: "DevOps", label: "DevOps Engineer" },
        { value: "Cloud", label: "Cloud Architect" },
        { value: "Backend", label: "Backend Developer" },
        { value: "Cybersecurity", label: "Cybersecurity Specialist" },
        { value: "Data", label: "Data Scientist" },
    ];

    const levelOptions = [
        { value: "junior", label: "Junior (0-2 years)" },
        { value: "mid", label: "Mid-Level (2-5 years)" },
        { value: "senior", label: "Senior (5+ years)" },
    ];

    const typeOptions = [
        { value: "HR", label: "HR Interview" },
        { value: "Tech", label: "Technical Interview" },
        { value: "Mixed", label: "Mixed (HR + Tech)" },
    ];

    const languageOptions = [
        { value: "EN", label: "English" },
        { value: "FR", label: "Français" },
    ];

    const durationOptions = [
        { value: "10", label: "10 minutes" },
        { value: "20", label: "20 minutes" },
        { value: "30", label: "30 minutes" },
    ];

    const handleStart = () => {
        setConfig({
            role,
            level,
            interviewType,
            language,
            duration,
        });
        setLanguage(language);
        router.push("/interview");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Configure Your Interview
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                        Customize your practice session to match your goals
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-primary-500" />
                                    Target Role
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select
                                    options={roleOptions}
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as Role)}
                                />
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5 text-primary-500" />
                                    Experience Level
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select
                                    options={levelOptions}
                                    value={level}
                                    onChange={(e) => setLevel(e.target.value as Level)}
                                />
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary-500" />
                                    Interview Type
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select
                                    options={typeOptions}
                                    value={interviewType}
                                    onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                                />
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-primary-500" />
                                    Language
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select
                                    options={languageOptions}
                                    value={language}
                                    onChange={(e) => setLang(e.target.value as Language)}
                                />
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="md:col-span-2"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary-500" />
                                    Duration
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select
                                    options={durationOptions}
                                    value={duration.toString()}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                />
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-center"
                >
                    <Button size="lg" onClick={handleStart} className="group">
                        Start Interview
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
