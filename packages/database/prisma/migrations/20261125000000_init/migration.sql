-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "ProjectJoinType" AS ENUM ('CREATOR', 'ASSIGNED', 'MANUAL');

-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'PROGRESS', 'VERIFY', 'CLOSED', 'IGNORED');

-- CreateEnum
CREATE TYPE "BugPriority" AS ENUM ('P0', 'P1', 'P2');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CREATED', 'COMMENT', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED', 'PRIORITY_CHANGED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BUG_ASSIGNED', 'BUG_REASSIGNED', 'BUG_VERIFY_READY', 'BUG_COMMENTED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "account" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "job_title" VARCHAR(50),
    "avatar_color" VARCHAR(20) NOT NULL DEFAULT '#1b74ff',
    "avatar_key" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_project_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "creator_id" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "joined_via" "ProjectJoinType" NOT NULL DEFAULT 'ASSIGNED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bugs" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "BugStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "BugPriority" NOT NULL DEFAULT 'P1',
    "creator_id" INTEGER NOT NULL,
    "assignee_id" INTEGER NOT NULL,
    "resolver_id" INTEGER,
    "related_bug_id" INTEGER,
    "verify_checklist" JSONB,
    "ai_optimized" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_attachments" (
    "id" SERIAL NOT NULL,
    "bug_id" INTEGER NOT NULL,
    "uploader_id" INTEGER NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bug_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_activities" (
    "id" SERIAL NOT NULL,
    "bug_id" INTEGER NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "type" "ActivityType" NOT NULL,
    "content" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bug_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "bug_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_date" DATE NOT NULL,
    "plan_time" VARCHAR(10),
    "content" VARCHAR(500) NOT NULL,
    "remark" VARCHAR(500),
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "done_at" TIMESTAMPTZ,
    "bug_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_account_key" ON "users"("account");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bugs_code_key" ON "bugs"("code");

-- CreateIndex
CREATE INDEX "bugs_project_id_status_idx" ON "bugs"("project_id", "status");

-- CreateIndex
CREATE INDEX "bugs_assignee_id_status_idx" ON "bugs"("assignee_id", "status");

-- CreateIndex
CREATE INDEX "bugs_creator_id_status_idx" ON "bugs"("creator_id", "status");

-- CreateIndex
CREATE INDEX "bugs_resolver_id_resolved_at_idx" ON "bugs"("resolver_id", "resolved_at");

-- CreateIndex
CREATE INDEX "bugs_related_bug_id_idx" ON "bugs"("related_bug_id");

-- CreateIndex
CREATE INDEX "bugs_created_at_idx" ON "bugs"("created_at");

-- CreateIndex
CREATE INDEX "bugs_closed_at_idx" ON "bugs"("closed_at");

-- CreateIndex
CREATE UNIQUE INDEX "bug_attachments_object_key_key" ON "bug_attachments"("object_key");

-- CreateIndex
CREATE INDEX "bug_attachments_bug_id_idx" ON "bug_attachments"("bug_id");

-- CreateIndex
CREATE INDEX "bug_activities_bug_id_created_at_idx" ON "bug_activities"("bug_id", "created_at");

-- CreateIndex
CREATE INDEX "bug_activities_actor_id_type_created_at_idx" ON "bug_activities"("actor_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "bug_activities_type_created_at_idx" ON "bug_activities"("type", "created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_is_read_created_at_idx" ON "notifications"("recipient_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notes_user_id_updated_at_idx" ON "notes"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "plans_user_id_plan_date_idx" ON "plans"("user_id", "plan_date");

-- CreateIndex
CREATE INDEX "plans_user_id_is_done_plan_date_idx" ON "plans"("user_id", "is_done", "plan_date");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_resolver_id_fkey" FOREIGN KEY ("resolver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_related_bug_id_fkey" FOREIGN KEY ("related_bug_id") REFERENCES "bugs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_attachments" ADD CONSTRAINT "bug_attachments_bug_id_fkey" FOREIGN KEY ("bug_id") REFERENCES "bugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_attachments" ADD CONSTRAINT "bug_attachments_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_activities" ADD CONSTRAINT "bug_activities_bug_id_fkey" FOREIGN KEY ("bug_id") REFERENCES "bugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_activities" ADD CONSTRAINT "bug_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_bug_id_fkey" FOREIGN KEY ("bug_id") REFERENCES "bugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_bug_id_fkey" FOREIGN KEY ("bug_id") REFERENCES "bugs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateSequence
CREATE SEQUENCE "bug_code_seq" START WITH 101 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
