"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Video, BarChart3, Target, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export default function HomePage() {
    const features = [
        {
            icon: Video,
            title: "Live Interview Simulation",
            description: "Real-time AI recruiter with camera and microphone for authentic interview experience",
        },
        {
            icon: BarChart3,
            title: "Detailed Feedback",
            description: "Get comprehensive analysis of your performance with actionable insights",
        },
        {
            icon: Target,
            title: "Role-Specific Practice",
            description: "Tailored questions for DevOps, Cloud, Backend, Cybersecurity, and Data roles",
        },
    ];

    const testimonials = [
        {
            name: "Sarah Chen",
            role: "Backend Developer",
            text: "Skill-Sphere helped me land my dream job! The AI interviewer felt incredibly realistic.",
        },
        {
            name: "Marcus Johnson",
            role: "DevOps Engineer",
            text: "The feedback I received was invaluable. I improved my interview skills significantly.",
        },
        {
            name: "Elena Rodriguez",
            role: "Data Scientist",
            text: "Perfect for practicing technical interviews. The real-time conversation is amazing!",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            {/* Navbar */}
            <nav className="glass-strong border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                                <span className="text-2xl font-bold text-gray-900">S</span>
                            </div>
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                Skill-Sphere
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/auth/login">
                                <Button variant="ghost">Login</Button>
                            </Link>
                            <Link href="/auth/register">
                                <Button variant="primary">Get Started</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden py-20 sm:py-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                            <Sparkles className="w-4 h-4 text-primary-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                AI-Powered Interview Practice
                            </span>
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6">
                            Master Your Next
                            <br />
                            <span className="text-gradient">Tech Interview</span>
                        </h1>

                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
                            Practice live job interviews with our AI recruiter. Get real-time feedback,
                            improve your skills, and land your dream IT role with confidence.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/auth/register">
                                <Button size="lg" className="group">
                                    Start Interview
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <Link href="#features">
                                <Button size="lg" variant="outline">
                                    Learn More
                                </Button>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Hero Image/Demo */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="mt-16 relative"
                    >
                        <div className="card-glass p-8 max-w-4xl mx-auto">
                            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
                                <Video className="w-24 h-24 text-primary-500" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-white dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Everything You Need to Succeed
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            Comprehensive interview preparation powered by AI
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <Card hover>
                                        <CardContent className="text-center">
                                            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Icon className="w-8 h-8 text-gray-900" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                                {feature.title}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {feature.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Trusted by Job Seekers
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            See what our users have to say
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                            >
                                <Card variant="glass">
                                    <CardContent>
                                        <div className="flex items-center gap-1 mb-4">
                                            {[...Array(5)].map((_, i) => (
                                                <CheckCircle key={i} className="w-5 h-5 text-primary-500" />
                                            ))}
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                                            "{testimonial.text}"
                                        </p>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {testimonial.name}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {testimonial.role}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-primary">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Ready to Ace Your Interview?
                    </h2>
                    <p className="text-xl text-gray-800 mb-8">
                        Join thousands of successful candidates who practiced with Skill-Sphere
                    </p>
                    <Link href="/auth/register">
                        <Button size="lg" variant="secondary" className="shadow-xl">
                            Start Your First Interview
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                                <span className="text-2xl font-bold text-gray-900">S</span>
                            </div>
                            <span className="text-xl font-bold">Skill-Sphere</span>
                        </div>
                        <p className="text-gray-400">
                            © 2026 Skill-Sphere. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
