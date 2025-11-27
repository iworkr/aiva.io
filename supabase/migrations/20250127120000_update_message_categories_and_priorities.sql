-- Update Message Categories and Priorities
-- Adds new specific categories and urgent priority level

-- Add 'urgent' to message_priority enum
ALTER TYPE message_priority ADD VALUE IF NOT EXISTS 'urgent';

-- Update message_category enum with new specific categories
-- Note: PostgreSQL doesn't support removing enum values, so we'll add new ones
-- Old values will remain but new ones will be used going forward

-- Add new category values
DO $$ 
BEGIN
    -- Add new category values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'customer_inquiry' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'customer_inquiry';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'customer_complaint' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'customer_complaint';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bill' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'bill';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'invoice' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'invoice';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payment_confirmation' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'payment_confirmation';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'authorization_code' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'authorization_code';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sign_in_code' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'sign_in_code';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'security_alert' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'security_alert';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'junk_email' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'junk_email';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'newsletter' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'newsletter';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'meeting_request' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'meeting_request';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'notification' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_category')) THEN
        ALTER TYPE message_category ADD VALUE 'notification';
    END IF;
END $$;

-- Add comment to document the new categories
COMMENT ON TYPE message_category IS 'Message categories: customer_inquiry, customer_complaint, sales_lead, client_support, bill, invoice, payment_confirmation, authorization_code, sign_in_code, security_alert, marketing, junk_email, newsletter, internal, meeting_request, personal, social, notification, other';

COMMENT ON TYPE message_priority IS 'Message priorities: urgent, high, medium, low, noise';

