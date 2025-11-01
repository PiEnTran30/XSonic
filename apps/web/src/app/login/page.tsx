"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form states
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError) throw signInError;

      // Check user role
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      // Redirect based on role
      if (userData?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            full_name: registerUsername,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Create user record
        await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email,
          role: "user",
          metadata: {
            full_name: registerUsername,
          },
        });

        // Create wallet
        await supabase.from("wallets").insert({
          user_id: data.user.id,
          balance_credits: 0,
          reserved_credits: 0,
        });

        // Redirect to dashboard
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Đăng ký thất bại");
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        console.error("Google auth error:", signInError);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
    }
  };

  return (
    <div className="login-page">
      <div className={`container ${isActive ? "active" : ""}`}>
        {/* Form Box - Login */}
        <div className="form-box login">
          <form onSubmit={handleLogin}>
            <h1>Login</h1>
            {error && !isActive && (
              <div className="error-message" style={{
                padding: '10px',
                marginBottom: '15px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            <div className="input-box">
              <input
                type="email"
                placeholder="Email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loading}
              />
              <i className='bx bxs-envelope'></i>
            </div>
            <div className="input-box">
              <input
                type={showLoginPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={loading}
              />
              <i
                className={`bx ${showLoginPassword ? 'bx-show' : 'bx-hide'}`}
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                style={{ cursor: 'pointer' }}
              ></i>
            </div>
            <div className="forgot-link">
              <a href="#">Forgot Password?</a>
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Login"}
            </button>
            <p>or login with social platforms</p>
            <div className="social-icons">
              <a href="#" onClick={handleGoogleAuth} title="Google">
                <i className='bx bxl-google'></i>
              </a>
              <a href="#"><i className='bx bxl-facebook'></i></a>
              <a href="#"><i className='bx bxl-github'></i></a>
              <a href="#"><i className='bx bxl-linkedin'></i></a>
            </div>
          </form>
        </div>

        {/* Form Box - Register */}
        <div className="form-box register">
          <form onSubmit={handleRegister}>
            <h1>Registration</h1>
            {error && isActive && (
              <div className="error-message" style={{
                padding: '10px',
                marginBottom: '15px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            <div className="input-box">
              <input
                type="text"
                placeholder="Username"
                required
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                disabled={loading}
              />
              <i className='bx bxs-user'></i>
            </div>
            <div className="input-box">
              <input
                type="email"
                placeholder="Email"
                required
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                disabled={loading}
              />
              <i className='bx bxs-envelope'></i>
            </div>
            <div className="input-box">
              <input
                type={showRegisterPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                disabled={loading}
                minLength={6}
              />
              <i
                className={`bx ${showRegisterPassword ? 'bx-show' : 'bx-hide'}`}
                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                style={{ cursor: 'pointer' }}
              ></i>
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Đang đăng ký..." : "Register"}
            </button>
            <p>or register with social platforms</p>
            <div className="social-icons">
              <a href="#" onClick={handleGoogleAuth} title="Google">
                <i className='bx bxl-google'></i>
              </a>
              <a href="#"><i className='bx bxl-facebook'></i></a>
              <a href="#"><i className='bx bxl-github'></i></a>
              <a href="#"><i className='bx bxl-linkedin'></i></a>
            </div>
          </form>
        </div>

        {/* Toggle Box */}
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <h1>Hello, Welcome!</h1>
            <p>Don't have an account?</p>
            <button className="btn register-btn" onClick={() => setIsActive(true)}>Register</button>
          </div>

          <div className="toggle-panel toggle-right">
            <h1>Welcome Back!</h1>
            <p>Already have an account?</p>
            <button className="btn login-btn" onClick={() => setIsActive(false)}>Login</button>
          </div>
        </div>
      </div>
      <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet' />
    </div>
  );
}

