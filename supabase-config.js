const SUPABASE_URL =
  "https://ckubpjybpspgqlframtv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_zcUuyOgIyuFXashnx9Fk8A_kl8XN1MV";

window.supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );