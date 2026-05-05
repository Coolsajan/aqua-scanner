"use client";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function AuthButton() {
  const { user, loading } = useAuth();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="nav-tab" style={{width: 80, justifyContent: "center"}}><span className="spin" style={{width: 14, height: 14}}/></div>;
  }

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
        <img 
          src={user.user_metadata.avatar_url || "https://www.gravatar.com/avatar/?d=mp"} 
          alt="Avatar" 
          style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.1)" }}
        />
        <button onClick={handleLogout} className="nav-tab" style={{ padding: "5px 10px", fontSize: "0.75rem", border: "1px solid rgba(255,77,109,0.3)", background: "rgba(255,77,109,0.1)", color: "#ff8fa3" }}>
          <span className="hide-mob">Sign Out</span>
          <span className="show-mob">✕</span>
        </button>
      </div>
    );
  }

  return (
    <button onClick={handleLogin} className="nav-tab" style={{ marginLeft: "auto", border: "1px solid rgba(0,180,216,0.3)", background: "rgba(0,180,216,0.1)", color: "#00e5ff" }}>
      <span className="hide-mob">Login with </span>Google
    </button>
  );
}
