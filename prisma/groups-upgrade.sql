-- Add only the group tables; preserve existing application data.
BEGIN;
CREATE TABLE IF NOT EXISTS "StudentGroup" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "university" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "StudentGroup_inviteCode_key" ON "StudentGroup"("inviteCode");
CREATE INDEX IF NOT EXISTS "StudentGroup_ownerId_idx" ON "StudentGroup"("ownerId");
CREATE TABLE IF NOT EXISTS "GroupMember" (
  "groupId" TEXT NOT NULL REFERENCES "StudentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("groupId", "userId")
);
CREATE INDEX IF NOT EXISTS "GroupMember_userId_idx" ON "GroupMember"("userId");
CREATE TABLE IF NOT EXISTS "GroupPost" (
  "id" TEXT PRIMARY KEY,
  "groupId" TEXT NOT NULL REFERENCES "StudentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "url" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "GroupPost_groupId_createdAt_idx" ON "GroupPost"("groupId", "createdAt");
CREATE INDEX IF NOT EXISTS "GroupPost_authorId_idx" ON "GroupPost"("authorId");
COMMIT;
