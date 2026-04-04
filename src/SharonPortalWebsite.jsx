import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import AuthPage from "./AuthPage";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function SharonPortalWebsite() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [showResetSentModal, setShowResetSentModal] = useState(false);

  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setAuthUser(data?.session?.user || null);
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthUser(session?.user || null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = async () => {
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password,
      });

      if (error) throw error;
    } catch (err) {
      alert(err.message);
    }

    setAuthLoading(false);
  };

  const handlePasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(authForm.email);

    if (error) {
      alert(error.message);
    } else {
      setShowResetSentModal(true);
    }
  };

  if (!authUser) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        authLoading={authLoading}
        showResetSentModal={showResetSentModal}
        setShowResetSentModal={setShowResetSentModal}
        handleAuthSubmit={handleAuthSubmit}
        handlePasswordReset={handlePasswordReset}
      />
    );
  }

  return <div>Logged in</div>;
}
