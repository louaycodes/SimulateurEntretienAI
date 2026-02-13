import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildFinalEvaluationPrompt } from '@/lib/prompts';
import { generateFinalReport } from '@/lib/llmClient';
import { InterviewConfig } from '@/lib/types';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const requestId = Math.random().toString(36).substring(7);
    const sessionId = params.id;
    const startTime = Date.now();

    try {
        const body = await request.json();
        const { messages } = body;

        console.log(`[Sessions] ${requestId} - Ending interview ${sessionId}`);

        // 1. Fetch session details to get the configuration (role, level, etc.)
        const session = await prisma.interviewSession.findUnique({
            where: { id: sessionId },
            select: {
                role: true,
                level: true,
                interviewType: true,
                language: true,
                durationMinutes: true
            }
        });

        if (!session) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: 'SESSION_NOT_FOUND',
                    message: `Session ${sessionId} not found`,
                    requestId
                }
            }, { status: 404 });
        }

        // Build config object for prompt builder
        const config: InterviewConfig = {
            role: session.role as any, // Cast to any or strict type if imported
            level: session.level as any,
            interviewType: session.interviewType as any,
            language: session.language as any,
            duration: session.durationMinutes || 15
        };

        // 2. Build conversation context for final evaluation
        const conversationMessages = messages.map((msg: any) => ({
            role: msg.type === 'recruiter' ? 'assistant' as const : 'user' as const,
            content: msg.text
        }));

        // 3. Generate final prompt with specific context
        const finalPrompt = buildFinalEvaluationPrompt(config);

        // 4. Call LLM for final evaluation
        console.log(`[Sessions] ${requestId} - Requesting final evaluation from Groq`);

        const messagesWithPrompt = [
            ...conversationMessages,
            { role: 'user', content: finalPrompt }
        ];

        let responseData;
        try {
            responseData = await generateFinalReport({
                systemPrompt: 'You are a professional recruiter providing final interview evaluation.',
                messages: messagesWithPrompt,
                config: { temperature: 0.2 }
            });
        } catch (llmError: any) {
            console.error(`[Sessions] ${requestId} - LLM generation failed:`, llmError);
            throw new Error(`LLM generation failed: ${llmError.message}`);
        }

        const latency = Date.now() - startTime;
        console.log(`[Sessions] ${requestId} - LLM response received (${latency}ms)`);
        console.log(`[Sessions] ${requestId} - Impression: ${responseData.recruiter_impression}, Score: ${responseData.metrics?.total_score}`);

        // 5. Update session in database
        const endedAt = new Date();
        await prisma.interviewSession.update({
            where: { id: sessionId },
            data: {
                status: 'ended',
                endedAt,
                recruiterImpression: responseData.recruiter_impression,
                overallScore: responseData.metrics.total_score,
                technicalScore: responseData.metrics.technical_score,
                communicationScore: responseData.metrics.communication_score,
                problemSolvingScore: responseData.metrics.problem_solving_score,
                // experienceScore is not requested in new JSON, use 0 or omit if optional (it is optional in Prisma usually, or default 0)
                // Checking previous schema, it might be Int? Let's check prisma schema if possible, or just pass 0.
                // Re-checking types.ts: experienceScore is in SessionData.
                // In prompt we removed experience_score.
                experienceScore: 0
            }
        });

        // 6. Save final report
        await prisma.interviewFinalReport.upsert({
            where: { sessionId },
            create: {
                sessionId,
                impression: responseData.recruiter_impression,
                overallScore: responseData.metrics.total_score,
                technicalScore: responseData.metrics.technical_score,
                communicationScore: responseData.metrics.communication_score,
                problemSolvingScore: responseData.metrics.problem_solving_score,
                experienceScore: 0,
                whatIDidWell: [], // Not requested
                areasForImprovement: responseData.weaknesses,
                rawModelOutput: JSON.stringify(responseData, null, 2)
            },
            update: {
                impression: responseData.recruiter_impression,
                overallScore: responseData.metrics.total_score,
                technicalScore: responseData.metrics.technical_score,
                communicationScore: responseData.metrics.communication_score,
                problemSolvingScore: responseData.metrics.problem_solving_score,
                experienceScore: 0,
                whatIDidWell: [], // Not requested
                areasForImprovement: responseData.weaknesses,
                rawModelOutput: JSON.stringify(responseData, null, 2)
            }
        });

        console.log(`[Sessions] ${requestId} - Session ${sessionId} ended successfully`);
        console.log(`[Sessions] ${requestId} - Impression: ${responseData.recruiter_impression}, Overall: ${responseData.metrics.total_score}`);

        return NextResponse.json({
            ok: true,
            finalReport: responseData
        });

    } catch (error: any) {
        console.error(`[Sessions] ${requestId} - End interview failed:`, error);

        // Check if DB is unavailable
        if (error.code === 'P1001' || error.code === 'P1002' || error.code === 'P2025') {
            return NextResponse.json({
                ok: false,
                error: {
                    code: 'DB_UNAVAILABLE',
                    message: 'Database is unavailable. Final report cannot be saved.',
                    hint: 'Start PostgreSQL with: docker compose up -d',
                    requestId
                }
            }, { status: 503 });
        }

        return NextResponse.json({
            ok: false,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'Failed to end interview',
                requestId
            }
        }, { status: 500 });
    }
}
