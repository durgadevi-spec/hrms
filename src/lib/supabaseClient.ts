import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ztvmtxcqsgysuzmwbewo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dm10eGNxc2d5c3V6bXdiZXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDA0MDMsImV4cCI6MjA5NzQxNjQwM30.dnSYtkeJc9c5MESG1Lc26i22MPaO2QZEr3PcmGuQZ3c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;
