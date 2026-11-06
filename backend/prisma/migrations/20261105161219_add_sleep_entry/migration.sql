-- CreateTable
CREATE TABLE "SleepEntry" (
    "id" TEXT NOT NULL,
    "sleepDate" DATE NOT NULL,
    "bedtime" TEXT NOT NULL,
    "wakeTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "quality" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SleepEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SleepEntry_sleepDate_idx" ON "SleepEntry"("sleepDate");

-- CreateIndex
CREATE UNIQUE INDEX "SleepEntry_sleepDate_key" ON "SleepEntry"("sleepDate");
