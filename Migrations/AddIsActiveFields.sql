-- Add IsActive column to Articles table
ALTER TABLE Articles ADD COLUMN IsActive INTEGER NOT NULL DEFAULT 1;

-- Add IsActive column to SubscriptionPackages table  
ALTER TABLE SubscriptionPackages ADD COLUMN IsActive INTEGER NOT NULL DEFAULT 1;

-- Update existing records to be active by default
UPDATE Articles SET IsActive = 1 WHERE IsActive IS NULL;
UPDATE SubscriptionPackages SET IsActive = 1 WHERE IsActive IS NULL;