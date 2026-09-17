-- ============================================================
-- COMPLETE SETUP FOR ledger_entries TABLE
-- Safe to run multiple times (idempotent)
-- ============================================================

-- 1. CREATE TABLE (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    permit_no TEXT NOT NULL,
    permit_holder TEXT,
    source_sheet TEXT,
    municipality TEXT,
    location TEXT,
    type_of_permit TEXT,
    commodity TEXT,
    issued_date DATE,
    ecc_amendment TEXT,
    remarks TEXT,
    issued_date_2 DATE,
    annual_extraction_rate TEXT,
    area_status_clearance TEXT,
    issued_date_3 DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ADD ALL MISSING COLUMNS (in case table exists but is incomplete)
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS permit_holder TEXT;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS source_sheet TEXT;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS municipality TEXT;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS type_of_permit TEXT;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS commodity TEXT;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS issued_date DATE;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS ecc_amendment TEXT;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS issued_date_2 DATE;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS annual_extraction_rate TEXT;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS area_status_clearance TEXT;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS issued_date_3 DATE;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICY FOR AUTHENTICATED USERS
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.ledger_entries;
CREATE POLICY "Allow authenticated users full access"
ON public.ledger_entries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. CREATE INDEXES FOR FAST LOOKUPS
CREATE INDEX IF NOT EXISTS idx_ledger_entries_permit_no
ON public.ledger_entries (permit_no);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_permit_holder
ON public.ledger_entries (permit_holder);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_source_sheet
ON public.ledger_entries (source_sheet);

-- 6. VERIFY: List all columns now in the table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ledger_entries'
ORDER BY ordinal_position;

-- ============================================================
-- DONE
-- ============================================================