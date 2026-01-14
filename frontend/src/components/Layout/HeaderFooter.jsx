import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../../api";

export default function HeaderFooter({ type, onRefresh, pendingCount = 0, onToggleDispensedSidebar, onToggleMobileSidebar }) {
  const [userInfo, setUserInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [companyName, setCompanyName] = useState('NUTRYAH');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchCompanyName();
    
    if (type === "header") {
      fetchUserProfile();
      // Update time every second
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      
      // Close dropdown when clicking outside
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsDropdownOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        clearInterval(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [type]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      if (response.data) {
        const userData = response.data;
        setUserInfo({
          name: userData.full_name || userData.email?.split('@')[0] || 'User',
          role: userData.role_names ? userData.role_names.join(', ') : (userData.role === 'admin' ? 'Admin' : userData.role || 'User'),
          email: userData.email,
          userType: userData.user_type || 'admin'
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to token decoding
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserInfo({
            name: payload.full_name || payload.email?.split('@')[0] || 'User',
            role: payload.role === 'admin' ? 'Admin' : (payload.role || 'User'),
            email: payload.email,
            userType: payload.user_type || 'admin'
          });
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    }
  };

  const fetchCompanyName = async () => {
    try {
      const response = await api.get('/company/');
      if (response.data && response.data.length > 0) {
        setCompanyName(response.data[0].name);
      }
    } catch (error) {
      console.error('Error fetching company name:', error);
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Logout button clicked');
    
    try {
      console.log('Calling backend logout endpoint...');
      // Call backend logout endpoint
      await api.post('/auth/logout');
      console.log('Backend logout successful');
    } catch (error) {
      console.error('Error during logout:', error);
      // Continue with logout even if backend call fails
    } finally {
      console.log('Clearing localStorage and redirecting...');
      // Clear local storage and redirect
      localStorage.removeItem("access_token");
      window.location.href = "/";
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      // Also dispatch the refresh event for components listening to it
      window.dispatchEvent(new CustomEvent('refreshData'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Sync all data - refresh company info, user profile, and trigger page refresh
      await Promise.all([
        fetchCompanyName(),
        fetchUserProfile(),
        onRefresh ? onRefresh() : Promise.resolve()
      ]);
      
      // Force a complete page refresh for thorough sync
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } finally {
      setIsSyncing(false);
    }
  };

  if (type === "header") {
    return (
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-50 to-gray-100 backdrop-blur-xl border-b border-gray-200/50 px-3 sm:px-4 lg:px-6 py-2 flex justify-between items-center shadow-sm">
        {/* Mobile Menu Button */}
        <button 
          onClick={onToggleMobileSidebar}
          className="lg:hidden w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg mr-2"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Company Logo/Name */}
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {companyName}
            </h1>
            <p className="text-xs text-gray-500 font-medium">Inventory Management System</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Real-time Clock - Hidden on mobile */}
          <div className="hidden md:block bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200/50 shadow-sm">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12,6 12,12 16,14"></polyline>
              </svg>
              <div className="text-center">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Time</p>
                <p className="text-sm font-mono font-semibold text-gray-800">
                  {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                </p>
              </div>
            </div>
          </div>

          {/* Sync Button - Responsive */}
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center px-2 sm:px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg border border-blue-300 hover:from-blue-600 hover:to-blue-700 hover:shadow-md transition-all duration-200 disabled:opacity-50 group"
          >
            <svg className={`w-4 h-4 sm:mr-2 transition-transform duration-200 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">
              {isSyncing ? 'Syncing...' : 'Sync'}
            </span>
          </button>

          {/* Refresh Button - Responsive */}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center px-2 sm:px-3 py-1.5 bg-white/70 backdrop-blur-sm text-gray-700 rounded-lg border border-gray-200/50 hover:bg-white/90 hover:shadow-md transition-all duration-200 disabled:opacity-50 group"
          >
            <svg className={`w-4 h-4 sm:mr-2 transition-transform duration-200 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>

          {/* User Profile Dropdown */}
          {userInfo && (
            <div className="relative" ref={dropdownRef} style={{zIndex: 1000}}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200/50 shadow-sm hover:bg-white/90 transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {userInfo.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-gray-800">
                      {userInfo.name}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {userInfo.role}
                    </p>
                  </div>
                  <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && createPortal(
                <div className="fixed right-3 sm:right-8 w-48 bg-white rounded-lg border border-gray-200 shadow-xl py-2" style={{zIndex: 99999, top: '60px'}}>
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-800">{userInfo.name}</p>
                    <p className="text-xs text-gray-500">{userInfo.email}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full flex items-center px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors duration-200 group"
                  >
                    <svg className="w-4 h-4 mr-3 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>,
                document.body
              )}
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <footer className="bg-gray-800 text-white py-2">
      <div className="container mx-auto px-4 text-center">
        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 text-xs">
          <span className="font-semibold">Powered by NUTRYAH DIGITAL HEALTH</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Support: Mobile: +91 96266 99001</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden md:inline">Email: support@nutryah.com</span>
          <span className="hidden md:inline">|</span>
          <a href="http://www.nutryah.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300">
            Website: www.nutryah.com
          </a>
          <span className="hidden lg:inline">|</span>
          <a href="#" className="hidden lg:inline hover:text-blue-300">Privacy Policy</a>
          <span className="hidden lg:inline">|</span>
          <a href="#" className="hidden lg:inline hover:text-blue-300">Terms & Conditions</a>
        </div>
      </div>
    </footer>
  );
}
