import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase şifre sıfırlama linkinden oturum kurar (PKCE, hash veya token_hash). */
export async function establishRecoverySession(supabase: SupabaseClient): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const search = new URLSearchParams(window.location.search);
  const code = search.get("code");
  const tokenHash = search.get("token_hash");
  const type = search.get("type");

  // PKCE akışı (?code=...)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      cleanUrl();
      return true;
    }
  }

  // token_hash akışı (?token_hash=...&type=recovery)
  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (!error) {
      cleanUrl();
      return true;
    }
  }

  // Hash akışı (#access_token=...&type=recovery)
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const hashType = hashParams.get("type");

    if (accessToken && refreshToken && hashType === "recovery") {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!error) {
        cleanUrl();
        return true;
      }
    }
  }

  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

function cleanUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}
