// supabase-client.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- MISE À JOUR OBLIGATOIRE ---
// Remplacez les valeurs ci-dessous par vos propres clés Supabase.
const supabaseUrl = 'https://djpigduzgtzlktpyhhgf.supabase.co';       // Mettez ici l'URL de votre projet Supabase
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcGlnZHV6Z3R6bGt0cHloaGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTMwMzQsImV4cCI6MjA3NjcyOTAzNH0.xqxv2LGs-dXSXDg_ccXzhAY02lP8KxOZ_TpXXZlmAUQ'; // Mettez ici la clé "anon" de votre projet

// Crée et exporte le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);