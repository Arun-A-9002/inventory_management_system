import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import HeaderFooter from "./HeaderFooter";
import { Outlet, useLocation } from "react-router-dom";
import api from "../../api";

export default function MainLayout() {
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  const fetchPendingCount = async () => {
    try {
      const response = await api.get('/purchase/pr');
      if (response.data) {
        const pending = response.data.filter(pr => 
          !pr.status || pr.status === 'draft' || pr.status === 'submitted'
        ).length;
        setPendingCount(pending);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  useEffect(() => {
    fetchPendingCount();
  }, [location.pathname]);

  const handleRefresh = async () => {
    await fetchPendingCount();
    // Trigger refresh for current page if it's dashboard
    if (location.pathname === '/app/dashboard') {
      window.location.reload();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full">
        <HeaderFooter 
          type="header" 
          onRefresh={handleRefresh}
          pendingCount={pendingCount}
        />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
        <HeaderFooter type="footer" />
      </div>
    </div>
  );
}