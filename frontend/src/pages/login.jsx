import React, { useState, useEffect } from "react";

export default function Login() {
  const [tenantCode, setTenantCode] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300);
  const [userEmail, setUserEmail] = useState(""); // Store email for OTP verification

  // Start countdown when OTP is sent
  useEffect(() => {
    let interval = null;

    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }

    if (timer === 0) {
      setOtpSent(false);
    }

    return () => clearInterval(interval);
  }, [otpSent, timer]);

  // Format mm:ss
  const formatTime = (sec) =>
    `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(
      2,
      "0"
    )}`;

  // Validation function
  const validateForm = () => {
    const newErrors = {};
    if (!tenantCode.trim()) newErrors.tenantCode = "Hospital code is required";
    if (!loginIdentifier.trim()) newErrors.loginIdentifier = "Login code or email is required";
    if (!password.trim()) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // -----------------------------------------
  // SEND OTP (STEP 1)
  // -----------------------------------------
  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Always use the regular login endpoint - it will handle both admin and user login
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_code: tenantCode, login_identifier: loginIdentifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.detail || "Invalid credentials" });
        setLoading(false);
        return;
      }

      setErrors({});
      
      // Check if OTP is required
      if (data.requires_otp) {
        setOtpSent(true);
        setTimer(300); // reset timer
        // Store user email for OTP verification
        setUserEmail(data.email || loginIdentifier);
      } else {
        // Direct login success
        localStorage.setItem("access_token", data.access_token);
        window.location.href = "/app/dashboard";
      }

    } catch (err) {
      setErrors({ general: "Server not reachable. Please try again." });
      console.error(err);
    }

    setLoading(false);
  };

  // -----------------------------------------
  // VERIFY OTP (STEP 2)
  // -----------------------------------------
  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setErrors({ otp: "Please enter OTP" });
      return;
    }
    if (otp.length !== 6) {
      setErrors({ otp: "OTP must be 6 digits" });
      return;
    }
    setErrors({});

    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/auth/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_code: tenantCode, email: userEmail, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ otp: data.detail || "OTP verification failed" });
        setLoading(false);
        return;
      }

      // Save access token
      localStorage.setItem("access_token", data.access_token);

      // FIXED REDIRECT HERE ✔
      window.location.href = "/app/dashboard";

    } catch (err) {
      setErrors({ otp: "Server error. Please try again." });
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl font-bold">N</span>
            </div>
            <h1 className="text-4xl font-light mb-4">NUTRYAH</h1>
            <h2 className="text-xl text-blue-200 mb-6">Healthcare Information Management</h2>
            <p className="text-slate-300 text-lg leading-relaxed max-w-md">
              Enterprise-grade healthcare management platform with advanced security and multi-tenant architecture.
            </p>
          </div>
          <div className="space-y-4 text-sm text-slate-400">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>SOC 2 Type II Compliant</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>256-bit Encryption</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-blue-500/20 to-transparent rounded-full transform translate-x-32 translate-y-32"></div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">N</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">NUTRYAH</h1>
            <p className="text-slate-600 text-sm">Healthcare Management System</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Sign in to your account</h2>
            <p className="text-slate-600">Enter your credentials to access the system</p>
          </div>

          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm">
              {errors.general}
            </div>
          )}

          {!otpSent && (
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Organization Code
                </label>
                <input
                  type="text"
                  value={tenantCode}
                  onChange={(e) => {
                    setTenantCode(e.target.value.toUpperCase());
                    if (errors.tenantCode) setErrors(prev => ({ ...prev, tenantCode: '' }));
                  }}
                  placeholder="Enter your organization code"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.tenantCode ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.tenantCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.tenantCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Login Code or Email
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    if (errors.loginIdentifier) setErrors(prev => ({ ...prev, loginIdentifier: '' }));
                  }}
                  placeholder="Enter login code (AB123456) or email address"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.loginIdentifier ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.loginIdentifier && (
                  <p className="mt-1 text-sm text-red-600">{errors.loginIdentifier}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {otpSent && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Check your email</h3>
                <p className="text-slate-600 text-sm">We've sent a verification code to your email address</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setOtp(value);
                    if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
                  }}
                  placeholder="Enter 6-digit code"
                  className={`w-full px-4 py-3 border rounded-lg text-center text-lg font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.otp ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.otp && (
                  <p className="mt-1 text-sm text-red-600">{errors.otp}</p>
                )}
              </div>

              <div className="text-center text-sm text-slate-600">
                Code expires in <span className="font-mono font-semibold">{formatTime(timer)}</span>
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading || !otp}
                className="w-full py-3 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <div className="text-center space-y-2">
                <button
                  onClick={() => {
                    setOtp('');
                    handleLogin();
                  }}
                  disabled={timer > 250}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {timer > 250 ? 'Resend available soon' : 'Resend code'}
                </button>
                <div>
                  <button
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setTimer(300);
                      setErrors({});
                    }}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    ← Back to sign in
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              © 2024 NUTRYAH. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
