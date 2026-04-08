import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Password recovery redirect.
 * When Supabase sends a password reset email, the link lands on /reset-password
 * with hash params (access_token, refresh_token, type=recovery).
 * We forward everything to /portal so the portal's built-in reset UI handles it.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    navigate(`/portal${search}${hash}`, { replace: true });
  }, [navigate]);

  return null;
}
