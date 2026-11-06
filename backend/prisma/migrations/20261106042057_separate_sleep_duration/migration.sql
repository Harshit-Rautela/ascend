-- AlterTable
ALTER TABLE "SleepEntry" ADD COLUMN     "timeInBedMinutes" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "durationMinutes" DROP NOT NULL;
