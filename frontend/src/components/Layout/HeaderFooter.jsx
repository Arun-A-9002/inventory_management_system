import React, { useState, useEffect } from "react";

export default function HeaderFooter({ type, onRefresh, pendingCount = 0 }) {
  const [userInfo, setUserInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (type === "header") {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
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
      
      // Update time every second
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [type]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    window.location.href = "/";
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  if (type === "header") {
    return (
      <header className="bg-gray-800 shadow-lg border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">
          Nutryah IMS
        </h1>

        <div className="flex items-center gap-4">
          {/* Real-time Clock */}
          <div className="text-center bg-gray-700 px-3 py-2 rounded-lg border border-gray-600">
            <p className="text-xs text-gray-300 uppercase tracking-wide">Time</p>
            <p className="text-sm font-bold text-white font-mono">
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </p>
          </div>

          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors duration-200 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
        

          {/* User Info */}
          {userInfo && (
            <div className="text-right bg-gray-700 px-3 py-2 rounded-lg border border-gray-600">
              <p className="text-sm font-medium text-white">
                {userInfo.email.split('@')[0]} ({userInfo.userType === 'admin' ? 'Admin' : 'User'})
              </p>
              {userInfo.org && userInfo.org !== 'User' && (
                <p className="text-xs text-gray-300">{userInfo.org}</p>
              )}
            </div>
          )}
          
          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
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
