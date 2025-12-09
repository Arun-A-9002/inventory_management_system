import React, { useState, useEffect } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // TIMER (5 minutes)
  const [timer, setTimer] = useState(300);

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

  // -----------------------------------------
  // SEND OTP (STEP 1)
  // -----------------------------------------
  const handleSendOTP = async () => {
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Invalid credentials");
        setLoading(false);
        return;
      }

      alert("OTP has been sent to your email");
      setOtpSent(true);
      setTimer(300); // reset timer

    } catch (err) {
      alert("Server not reachable");
      console.error(err);
    }

    setLoading(false);
  };

  // -----------------------------------------
  // VERIFY OTP (STEP 2)
  // -----------------------------------------
  const handleVerifyOTP = async () => {
    if (!otp) {
      alert("Enter OTP");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/auth/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "OTP verification failed");
        setLoading(false);
        return;
      }

      // Save access token
      localStorage.setItem("access_token", data.access_token);

      alert("Login successful!");

      // FIXED REDIRECT HERE ✔
      window.location.href = "/app/dashboard";

    } catch (err) {
      alert("Server error");
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-md relative">

        {/* Logo + Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 text-white p-3 rounded-xl font-bold text-lg">
            N
          </div>
          <div>
            <h2 className="text-xl font-semibold">NUTRYAH's HIMS & EMR</h2>
            <p className="text-gray-500 text-sm">
              Login with Email + Password + OTP
            </p>
          </div>
        </div>

        {/* EMAIL INPUT */}
        {!otpSent && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hospital.org"
              className="w-full p-3 rounded-lg bg-gray-50 border outline-none mb-4"
            />

            {/* PASSWORD */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••"
                className="w-full p-3 rounded-lg bg-gray-50 border outline-none"
              />

              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 cursor-pointer text-gray-500"
              >
                {showPassword ? "Hide" : "Show"}
              </span>
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full py-3 mt-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </>
        )}

        {/* OTP INPUT */}
        {otpSent && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
              Enter OTP
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="w-full p-3 rounded-lg bg-gray-50 border outline-none mb-3"
            />

            {/* TIMER */}
            <p className="text-sm text-gray-500 mb-3">
              OTP expires in <b>{formatTime(timer)}</b>
            </p>

            <button
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full py-3 mt-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              onClick={handleSendOTP}
              className="w-full py-2 mt-3 text-blue-600 font-semibold underline"
              disabled={timer > 250}
            >
              Resend OTP
            </button>
          </>
        )}

        <p className="text-center text-gray-500 text-xs mt-4">
          © 2025 NUTRYAH — Multi-tenant Secure Access
        </p>
      </div>
    </div>
  );
}
