import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import HeaderFooter from "./HeaderFooter";
import DispensedItemsSidebar from "../DispensedItemsSidebar";
import { Outlet, useLocation } from "react-router-dom";
import api from "../../api";

export default function MainLayout() {
  const [pendingCount, setPendingCount] = useState(0);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [isDispensedSidebarOpen, setIsDispensedSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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

  const fetchCompanyDetails = async () => {
    try {
      const response = await api.get('/organization/company');
      if (response.data && response.data.length > 0) {
        setCompanyDetails(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  useEffect(() => {
    fetchPendingCount();
    fetchCompanyDetails();
  }, [location.pathname]);

  const handleRefresh = async () => {
    await fetchPendingCount();
    await fetchCompanyDetails();
    
    // Trigger refresh for current page based on pathname
    if (location.pathname.includes('/purchase')) {
      // For purchase pages, dispatch a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('refreshData'));
    } else if (location.pathname === '/app/dashboard') {
      window.location.reload();
    } else {
      // For other pages, dispatch refresh event
      window.dispatchEvent(new CustomEvent('refreshData'));
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 invisible-scrollbar">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Hidden on mobile, shown as overlay when open */}
      <div className={`${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-50 lg:z-auto transition-transform duration-300 ease-in-out lg:transition-none`}>
        <Sidebar 
          companyDetails={companyDetails} 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
      </div>
      
      <div className="flex flex-col flex-1 min-h-screen overflow-y-auto">
        <HeaderFooter 
          type="header" 
          onRefresh={handleRefresh}
          pendingCount={pendingCount}
          onToggleDispensedSidebar={() => setIsDispensedSidebarOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />
        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
        <HeaderFooter type="footer" />
      </div>
      
      {/* Dispensed Items Sidebar */}
      <DispensedItemsSidebar 
        isOpen={isDispensedSidebarOpen}
        onClose={() => setIsDispensedSidebarOpen(false)}
      />
    </div>
  );
}