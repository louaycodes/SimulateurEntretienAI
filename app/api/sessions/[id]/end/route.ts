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

        const finalEvaluation = await generateFinalReport({
            systemPrompt: 'You are a professional recruiter providing final interview evaluation.',
            messages: conversationMessages,
            config: { temperature: 0.2 } // Low temperature for consistent JSON
            // We append the final prompt inside generateFinalReport logic or here?
            // Wait, generateFinalReport takes "messages". 
            // We should add the final prompt as the last user message.
        });

        // Actually, the previous implementation added the final prompt to conversationMessages. 
        // Let's do that explicitly here too to be safe/clear.
        // BUT generateFinalReport's interface takes `messages` and `systemPrompt`.
        // The implementation I wrote loops through history and adds them.
        // So I need to add the prompt to the history I pass.

        // RE-READing my own implementation of generateFinalReport:
        // uses systemPrompt + history.
        // So I should append the final prompt to conversationMessages before passing it.

        // Wait, I can't modify conversationMessages in place easily if I want to keep it clean, but here it's fine.
        // Actually, let's just pass it as part of messages.

        const messagesWithPrompt = [
            ...conversationMessages,
            { role: 'user', content: finalPrompt }
        ];

        // START FIX: logic adjustment
        // I need to call generateFinalReport with the messages including the prompt.
        const responseData = await generateFinalReport({
            systemPrompt: 'You are a professional recruiter providing final interview evaluation.',
            messages: messagesWithPrompt,
            config: { temperature: 0.2 }
        });

        const latency = Date.now() - startTime;
        console.log(`[Sessions] ${requestId} - LLM response received (${latency}ms)`);

        // 5. Update session in database
        const endedAt = new Date();
        await prisma.interviewSession.update({
            where: { id: sessionId },
            data: {
                status: 'ended',
                endedAt,
                recruiterImpression: responseData.recruiter_impression,
                overallScore: responseData.scores.overall,
                technicalScore: responseData.scores.technical,
                communicationScore: responseData.scores.communication,
                problemSolvingScore: responseData.scores.problem_solving,
                experienceScore: responseData.scores.experience
            }
        });

        // 6. Save final report
        // We need the raw output for debugging/display if needed, but generateFinalReport returns parsed object.
        // I should have made generateFinalReport return raw text too?
        // It returns FinalEvaluationResponse which is clean JSON.
        // We can just stringify it for "rawModelOutput" or change the interface.
        // For now, JSON.stringify(responseData) is a faithful representation of what we accepted.

        await prisma.interviewFinalReport.upsert({
            where: { sessionId },
            create: {
                sessionId,
                impression: responseData.recruiter_impression,
                overallScore: responseData.scores.overall,
                technicalScore: responseData.scores.technical,
                communicationScore: responseData.scores.communication,
                problemSolvingScore: responseData.scores.problem_solving,
                experienceScore: responseData.scores.experience,
                whatIDidWell: responseData.what_i_did_well,
                areasForImprovement: responseData.areas_for_improvement,
                rawModelOutput: JSON.stringify(responseData, null, 2)
            },
            update: {
                impression: responseData.recruiter_impression,
                overallScore: responseData.scores.overall,
                technicalScore: responseData.scores.technical,
                communicationScore: responseData.scores.communication,
                problemSolvingScore: responseData.scores.problem_solving,
                experienceScore: responseData.scores.experience,
                whatIDidWell: responseData.what_i_did_well,
                areasForImprovement: responseData.areas_for_improvement,
                rawModelOutput: JSON.stringify(responseData, null, 2)
            }
        });

        console.log(`[Sessions] ${requestId} - Session ${sessionId} ended successfully`);
        console.log(`[Sessions] ${requestId} - Impression: ${responseData.recruiter_impression}, Overall: ${responseData.scores.overall}`);

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
