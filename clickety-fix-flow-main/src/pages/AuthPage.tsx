import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

/**
 * The portal component (SharonPortalWebsite) has its own built-in auth UI.
 * This page simply redirects to /portal with the appropriate query params
 * so the portal can show sign-in or sign-up mode.
 */
export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get("mode");
    const query = mode ? `?mode=${mode}` : "";
    navigate(`/portal${query}`, { replace: true });
  }, [searchParams, navigate]);

  return null;
}
