-- CreateTable
CREATE TABLE "JekoContact" (
    "id" TEXT NOT NULL,
    "operator" "MobileOperator" NOT NULL,
    "phone" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JekoContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JekoContact_contactId_key" ON "JekoContact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "JekoContact_operator_phone_key" ON "JekoContact"("operator", "phone");

