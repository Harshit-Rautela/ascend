-- AlterTable
ALTER TABLE "SleepEntry" ADD COLUMN     "awakeMinutes" INTEGER,
ADD COLUMN     "deepSleepMinutes" INTEGER,
ADD COLUMN     "energy" INTEGER,
ADD COLUMN     "heartRate" INTEGER,
ADD COLUMN     "hrv" INTEGER,
ADD COLUMN     "lightSleepMinutes" INTEGER,
ADD COLUMN     "sleepScore" DOUBLE PRECISION;
