-- DropTable
DROP TABLE IF EXISTS "SystemInfo";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'retired');
CREATE TYPE "RightKind" AS ENUM ('module', 'input');
CREATE TYPE "KioskDeviceStatus" AS ENUM ('active', 'revoked');
CREATE TYPE "AuditorInviteStatus" AS ENUM ('pending', 'active', 'expired');
CREATE TYPE "HolidaySource" AS ENUM ('computed', 'manual');
CREATE TYPE "FreightApprovalRule" AS ENUM ('rpAndQmb', 'rpOnly', 'qmbOnly');

CREATE TABLE "Tenant" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id"));
CREATE TABLE "TenantConfig" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "holidayRegion" TEXT NOT NULL DEFAULT 'BW', "workingDays" JSONB NOT NULL DEFAULT '[1,2,3,4,5]', "escalationRpDays" INTEGER NOT NULL DEFAULT 2, "escalationGlDays" INTEGER NOT NULL DEFAULT 10, "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30, "kioskAutoLockSeconds" INTEGER NOT NULL DEFAULT 60, "retentionYears" INTEGER NOT NULL DEFAULT 5, "motivationTexts" JSONB NOT NULL DEFAULT '[]', "vacationTexts" JSONB NOT NULL DEFAULT '[]', "companyName" TEXT, "street" TEXT, "zip" TEXT, "city" TEXT, "country" TEXT DEFAULT 'DE', "phone" TEXT, "email" TEXT, "legalStatus" TEXT, "ssoEnabled" BOOLEAN NOT NULL DEFAULT false, "ssoConfig" JSONB, "freightApprovalRule" "FreightApprovalRule" NOT NULL DEFAULT 'rpAndQmb', "brokerChapterNotApplicable" BOOLEAN NOT NULL DEFAULT false, CONSTRAINT "TenantConfig_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Role" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "key" TEXT NOT NULL, "label" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Role_pkey" PRIMARY KEY ("id"));
CREATE TABLE "RoleRight" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "roleId" TEXT NOT NULL, "kind" "RightKind" NOT NULL, "rightKey" TEXT NOT NULL, "allowed" BOOLEAN NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RoleRight_pkey" PRIMARY KEY ("id"));
CREATE TABLE "User" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "email" TEXT, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL, "initials" TEXT, "avatarColor" TEXT, "avatarUrl" TEXT, "status" "UserStatus" NOT NULL DEFAULT 'active', "retiredAt" TIMESTAMP(3), "pinHash" TEXT, "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0, "pinLockedUntil" TIMESTAMP(3), "oidcSubject" TEXT, "isPlatformDeveloper" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "UserRight" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL, "kind" "RightKind" NOT NULL, "rightKey" TEXT NOT NULL, "allowed" BOOLEAN NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "UserRight_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Holiday" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "date" DATE NOT NULL, "label" TEXT NOT NULL, "source" "HolidaySource" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id"));
CREATE TABLE "KioskDevice" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL, "deviceToken" TEXT NOT NULL, "status" "KioskDeviceStatus" NOT NULL DEFAULT 'active', "registeredById" TEXT NOT NULL, "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSeenAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "KioskDevice_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AuditorInvite" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "auditorName" TEXT NOT NULL, "userId" TEXT, "validFrom" TIMESTAMP(3) NOT NULL, "validUntil" TIMESTAMP(3) NOT NULL, "visibleModules" TEXT[], "templateName" TEXT, "createdById" TEXT NOT NULL, "status" "AuditorInviteStatus" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AuditorInvite_pkey" PRIMARY KEY ("id"));
CREATE TABLE "_RoleToUser" ("A" TEXT NOT NULL, "B" TEXT NOT NULL, CONSTRAINT "_RoleToUser_AB_pkey" PRIMARY KEY ("A","B"));
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "TenantConfig_tenantId_key" ON "TenantConfig"("tenantId");
CREATE UNIQUE INDEX "Role_tenantId_key_key" ON "Role"("tenantId", "key");
CREATE UNIQUE INDEX "RoleRight_roleId_kind_rightKey_key" ON "RoleRight"("roleId", "kind", "rightKey");
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");
CREATE UNIQUE INDEX "UserRight_userId_kind_rightKey_key" ON "UserRight"("userId", "kind", "rightKey");
CREATE UNIQUE INDEX "Holiday_tenantId_date_key" ON "Holiday"("tenantId", "date");
CREATE UNIQUE INDEX "AuditorInvite_userId_key" ON "AuditorInvite"("userId");
CREATE INDEX "_RoleToUser_B_index" ON "_RoleToUser"("B");
ALTER TABLE "TenantConfig" ADD CONSTRAINT "TenantConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleRight" ADD CONSTRAINT "RoleRight_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleRight" ADD CONSTRAINT "RoleRight_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRight" ADD CONSTRAINT "UserRight_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRight" ADD CONSTRAINT "UserRight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KioskDevice" ADD CONSTRAINT "KioskDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KioskDevice" ADD CONSTRAINT "KioskDevice_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditorInvite" ADD CONSTRAINT "AuditorInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditorInvite" ADD CONSTRAINT "AuditorInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditorInvite" ADD CONSTRAINT "AuditorInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_RoleToUser" ADD CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_RoleToUser" ADD CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
