import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tezjdmuurdwnkldtvicc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlempkbXV1cmR3bmtsZHR2aWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODU0NzgsImV4cCI6MjA2ODI2MTQ3OH0.0rOgdyNplgSWsvZRy4JXZihGS8z5O15RLLLAbmDkcts";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
