import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tjigcxgnhsumegfyxpsq.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqaWdjeGduaHN1bWVnZnl4cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzUyNTEsImV4cCI6MjA5OTExMTI1MX0.cP5fd-qd5WAyFQ2d34bzUdSVZE0SAnEV4x1DCZAonuY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
