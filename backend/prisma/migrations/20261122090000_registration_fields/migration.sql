-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "level" TEXT,
ADD COLUMN     "matricule" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_matricule_key" ON "StudentProfile"("matricule");

