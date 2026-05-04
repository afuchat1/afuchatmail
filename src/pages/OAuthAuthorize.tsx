import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const OAuthAuthorize = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("oauth", "true");
    const qs = next.toString();

    // Persist the OAuth request so we can restore the consent screen even if
    // the URL gets rewritten during the auth flow (e.g. by Supabase magic
    // links, password reset hashes, or third-party redirects).
    try {
      sessionStorage.setItem("pendingOAuthRequest", qs);
    } catch {
      // sessionStorage may be unavailable (private mode, SSR) — non-fatal.
    }

    navigate(`/auth?${qs}`, { replace: true });
  }, [params, navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default OAuthAuthorize;
