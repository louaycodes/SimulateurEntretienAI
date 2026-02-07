-- CreateTable
CREATE TABLE "interview_sessions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "role" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "interviewType" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'running',
    "recruiterImpression" TEXT,
    "overallScore" INTEGER,
    "technicalScore" INTEGER,
    "communicationScore" INTEGER,
    "problemSolvingScore" INTEGER,
    "experienceScore" INTEGER,

    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestampMs" BIGINT NOT NULL,
    "elapsedSec" INTEGER NOT NULL,
    "recruiterMsgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_evaluations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "technicalScore" INTEGER NOT NULL,
    "communicationScore" INTEGER NOT NULL,
    "problemSolvingScore" INTEGER NOT NULL,
    "experienceScore" INTEGER NOT NULL,
    "signals" JSONB,
    "notesPrivate" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_final_reports" (
    "sessionId" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "technicalScore" INTEGER NOT NULL,
    "communicationScore" INTEGER NOT NULL,
    "problemSolvingScore" INTEGER NOT NULL,
    "experienceScore" INTEGER NOT NULL,
    "whatIDidWell" JSONB NOT NULL,
    "areasForImprovement" JSONB NOT NULL,
    "rawModelOutput" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_final_reports_pkey" PRIMARY KEY ("sessionId")
);

-- CreateIndex
CREATE INDEX "interview_messages_sessionId_idx" ON "interview_messages"("sessionId");

-- CreateIndex
CREATE INDEX "interview_evaluations_sessionId_idx" ON "interview_evaluations"("sessionId");

-- AddForeignKey
ALTER TABLE "interview_messages" ADD CONSTRAINT "interview_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_evaluations" ADD CONSTRAINT "interview_evaluations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_final_reports" ADD CONSTRAINT "interview_final_reports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
