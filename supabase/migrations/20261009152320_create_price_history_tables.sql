/*
# Create price history tables for the "Subió" feature

1. New Tables
- `ph_products`: product names that the user tracks over time.
- `ph_stores`: store names where products are priced.
- `ph_prices`: daily price snapshots per product + store, with unique constraint.

2. Security
- Single-tenant, no auth: RLS enabled, anon+authenticated CRUD.
*/

CREATE TABLE IF NOT EXISTS ph_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ph_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ph_products" ON ph_products;
CREATE POLICY "anon_select_ph_products" ON ph_products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ph_products" ON ph_products;
CREATE POLICY "anon_insert_ph_products" ON ph_products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ph_products" ON ph_products;
CREATE POLICY "anon_update_ph_products"
  ON ph_products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ph_products" ON ph_products;
CREATE POLICY "anon_delete_ph_products"
  ON ph_products FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS ph_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ph_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ph_stores" ON ph_stores;
CREATE POLICY "anon_select_ph_stores"
  ON ph_stores FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ph_stores" ON ph_stores;
CREATE POLICY "anon_insert_ph_stores"
  ON ph_stores FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ph_stores" ON ph_stores;
CREATE POLICY "anon_update_ph_stores"
  ON ph_stores FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ph_stores" ON ph_stores;
CREATE POLICY "anon_delete_ph_stores"
  ON ph_stores FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS ph_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES ph_products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES ph_stores(id) ON DELETE CASCADE,
  price_usd numeric NOT NULL,
  price_ves numeric NOT NULL,
  recorded_on date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (product_id, store_id, recorded_on)
);

ALTER TABLE ph_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ph_prices" ON ph_prices;
CREATE POLICY "anon_select_ph_prices"
  ON ph_prices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ph_prices" ON ph_prices;
CREATE POLICY "anon_insert_ph_prices"
  ON ph_prices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ph_prices" ON ph_prices;
CREATE POLICY "anon_update_ph_prices"
  ON ph_prices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ph_prices" ON ph_prices;
CREATE POLICY "anon_delete_ph_prices"
  ON ph_prices FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ph_prices_product_store_date
  ON ph_prices (product_id, store_id, recorded_on DESC);

CREATE INDEX IF NOT EXISTS idx_ph_prices_recorded_on
  ON ph_prices (recorded_on DESC);
