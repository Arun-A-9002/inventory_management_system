import React, { useState, useEffect } from "react";

export default function HeaderFooter({ type }) {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (type === "header") {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          // Decode JWT token to get user info
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserInfo({
            email: payload.email,
            org: payload.org || 'User',
            userType: payload.user_type || 'admin'
          });
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    }
  }, [type]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    window.location.href = "/";
  };

  if (type === "header") {
    return (
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-cyan-700">Dashboard</h1>

        <div className="flex items-center gap-4">
          {userInfo && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {userInfo.email.split('@')[0]} ({userInfo.userType === 'admin' ? 'Admin' : 'User'})
              </p>
              {userInfo.org && userInfo.org !== 'User' && (
                <p className="text-xs text-gray-500">{userInfo.org}</p>
              )}
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
    );
  }

  return (
    <footer className="bg-white shadow px-6 py-3 text-center text-gray-500">
      © 2025 NUTRYAH — Inventory Management System
    </footer>
  );
}
