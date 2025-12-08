/**
 * Supabase client configuration for Tab Application Switcher
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://vyxtwsiaqxoshrxyislb.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5eHR3c2lhcXhvc2hyeHlpc2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDAzNTksImV4cCI6MjA4MDcxNjM1OX0.M_kYk3YsbpY1sTGaA6_CDdY86IPYCjuf3dEpf2Pu0KQ"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export { SUPABASE_URL }
