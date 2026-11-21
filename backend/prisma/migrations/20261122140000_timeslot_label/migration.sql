-- Ajout du libellé obligatoire : backfill des lignes existantes puis NOT NULL.
ALTER TABLE "TimeSlot" ADD COLUMN "label" TEXT;
UPDATE "TimeSlot" SET "label" = 'Créneau ' || ("startMinutes" / 60)::text || 'h' || lpad(("startMinutes" % 60)::text, 2, '0') WHERE "label" IS NULL;
ALTER TABLE "TimeSlot" ALTER COLUMN "label" SET NOT NULL;
