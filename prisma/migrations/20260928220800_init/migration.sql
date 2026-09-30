-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN') NOT NULL DEFAULT 'ADMIN',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `passwordChangedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `userId` INTEGER NOT NULL,
    `familyId` VARCHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_tokenHash_key`(`tokenHash`),
    INDEX `refresh_tokens_userId_idx`(`userId`),
    INDEX `refresh_tokens_familyId_idx`(`familyId`),
    INDEX `refresh_tokens_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(120) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `role` VARCHAR(120) NOT NULL,
    `specialization` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `team_members_slug_key`(`slug`),
    INDEX `team_members_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_member_skills` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teamMemberId` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `team_member_skills_teamMemberId_name_key`(`teamMemberId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platform` ENUM('WEBSITE', 'GITHUB', 'LINKEDIN', 'X', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'BEHANCE', 'DRIBBBLE', 'TELEGRAM', 'WHATSAPP', 'OTHER') NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `label` VARCHAR(80) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `teamMemberId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `social_links_teamMemberId_sortOrder_idx`(`teamMemberId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `technologies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `technologies_name_key`(`name`),
    UNIQUE INDEX `technologies_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(120) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `summary` VARCHAR(400) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(40) NOT NULL DEFAULT 'custom',
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `services_slug_key`(`slug`),
    INDEX `services_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_technologies` (
    `serviceId` INTEGER NOT NULL,
    `technologyId` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `service_technologies_technologyId_idx`(`technologyId`),
    PRIMARY KEY (`serviceId`, `technologyId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `logoUrl` VARCHAR(500) NULL,
    `websiteUrl` VARCHAR(500) NULL,
    `industry` VARCHAR(120) NULL,
    `description` TEXT NULL,
    `hasDisplayConsent` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `clients_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `summary` VARCHAR(400) NOT NULL,
    `description` TEXT NULL,
    `problem` TEXT NULL,
    `solution` TEXT NULL,
    `ourRole` TEXT NULL,
    `results` TEXT NULL,
    `category` VARCHAR(100) NULL,
    `coverImageUrl` VARCHAR(500) NULL,
    `liveUrl` VARCHAR(500) NULL,
    `repositoryUrl` VARCHAR(500) NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `phase` ENUM('IN_PROGRESS', 'LIVE', 'COMPLETED') NOT NULL DEFAULT 'COMPLETED',
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `seoTitle` VARCHAR(120) NULL,
    `seoDescription` VARCHAR(200) NULL,
    `ogImageUrl` VARCHAR(500) NULL,
    `publishedAt` DATETIME(3) NULL,
    `clientId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `projects_slug_key`(`slug`),
    INDEX `projects_status_isFeatured_sortOrder_idx`(`status`, `isFeatured`, `sortOrder`),
    INDEX `projects_status_sortOrder_idx`(`status`, `sortOrder`),
    INDEX `projects_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `alt` VARCHAR(200) NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_images_projectId_sortOrder_idx`(`projectId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_features` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` VARCHAR(500) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `project_features_projectId_sortOrder_idx`(`projectId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_technologies` (
    `projectId` INTEGER NOT NULL,
    `technologyId` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `project_technologies_technologyId_idx`(`technologyId`),
    PRIMARY KEY (`projectId`, `technologyId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_members` (
    `projectId` INTEGER NOT NULL,
    `teamMemberId` INTEGER NOT NULL,
    `role` VARCHAR(120) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `project_members_teamMemberId_idx`(`teamMemberId`),
    PRIMARY KEY (`projectId`, `teamMemberId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_services` (
    `projectId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,

    INDEX `project_services_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`projectId`, `serviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achievements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('COMPETITION', 'AWARD', 'CERTIFICATION', 'MILESTONE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `issuer` VARCHAR(150) NULL,
    `highlight` VARCHAR(120) NULL,
    `date` DATE NULL,
    `imageUrl` VARCHAR(500) NULL,
    `proofUrl` VARCHAR(500) NULL,
    `projectId` INTEGER NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `achievements_status_sortOrder_idx`(`status`, `sortOrder`),
    INDEX `achievements_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testimonials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `authorName` VARCHAR(120) NOT NULL,
    `authorTitle` VARCHAR(120) NULL,
    `company` VARCHAR(150) NULL,
    `content` TEXT NOT NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `hasDisplayConsent` BOOLEAN NOT NULL DEFAULT false,
    `projectId` INTEGER NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `testimonials_status_sortOrder_idx`(`status`, `sortOrder`),
    INDEX `testimonials_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faqs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question` VARCHAR(300) NOT NULL,
    `answer` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `faqs_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(40) NULL,
    `company` VARCHAR(150) NULL,
    `projectType` VARCHAR(120) NULL,
    `budget` VARCHAR(80) NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('UNREAD', 'READ', 'ARCHIVED') NOT NULL DEFAULT 'UNREAD',
    `ipHash` CHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contact_messages_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `contact_messages_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `siteName` VARCHAR(120) NOT NULL,
    `tagline` VARCHAR(200) NULL,
    `description` VARCHAR(500) NULL,
    `logoUrl` VARCHAR(500) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(40) NULL,
    `whatsapp` VARCHAR(40) NULL,
    `location` VARCHAR(200) NULL,
    `heroTitle` VARCHAR(200) NULL,
    `heroSubtitle` VARCHAR(500) NULL,
    `aboutTitle` VARCHAR(200) NULL,
    `aboutSummary` VARCHAR(1000) NULL,
    `aboutContent` TEXT NULL,
    `ctaTitle` VARCHAR(200) NULL,
    `ctaSubtitle` VARCHAR(500) NULL,
    `foundedYear` INTEGER NULL,
    `defaultOgImageUrl` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(150) NOT NULL,
    `description` VARCHAR(500) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `process_steps_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_member_skills` ADD CONSTRAINT `team_member_skills_teamMemberId_fkey` FOREIGN KEY (`teamMemberId`) REFERENCES `team_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_links` ADD CONSTRAINT `social_links_teamMemberId_fkey` FOREIGN KEY (`teamMemberId`) REFERENCES `team_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_technologies` ADD CONSTRAINT `service_technologies_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_technologies` ADD CONSTRAINT `service_technologies_technologyId_fkey` FOREIGN KEY (`technologyId`) REFERENCES `technologies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_images` ADD CONSTRAINT `project_images_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_features` ADD CONSTRAINT `project_features_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_technologies` ADD CONSTRAINT `project_technologies_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_technologies` ADD CONSTRAINT `project_technologies_technologyId_fkey` FOREIGN KEY (`technologyId`) REFERENCES `technologies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_teamMemberId_fkey` FOREIGN KEY (`teamMemberId`) REFERENCES `team_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_services` ADD CONSTRAINT `project_services_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_services` ADD CONSTRAINT `project_services_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
