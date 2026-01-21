import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../../api";
import { canViewSidebarItem } from "../../utils/sidebarPermissions";

export default function Sidebar({ companyDetails, isCollapsed, onToggle, onMobileClose }) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});
  const [companyName, setCompanyName] = useState('NUTRYAH');

  useEffect(() => {
    fetchCompanyName();
  }, []);

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

  const toggleMenu = (menuName) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const renderMenuItem = (item) => {
    const isActive = location.pathname === item.path;
    
    if (item.submenu && !isCollapsed) {
      const isSubmenuActive = item.submenu.some(subItem => 
        subItem.path === location.pathname || 
        (subItem.submenu && subItem.submenu.some(nestedItem => nestedItem.path === location.pathname))
      );
      
      return (
        <div key={item.name} className="mb-1">
          <button
            onClick={() => toggleMenu(item.name)}
            className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 group relative overflow-hidden ${
              isSubmenuActive 
                ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 text-gray-800 shadow-md' 
                : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:shadow-sm'
            }`}
          >
            <div className={`p-2 rounded-lg transition-all duration-300 z-10 ${
              isSubmenuActive 
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105' 
                : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:scale-105'
            }`}>
              {item.icon}
            </div>
            <span className="font-semibold text-sm flex-1 z-10">{item.name}</span>
            <svg className={`w-4 h-4 transition-all duration-300 z-10 ${
              openMenus[item.name] ? 'rotate-180 text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isSubmenuActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl"></div>
            )}
          </button>

          {openMenus[item.name] && (
            <div className="ml-8 mt-2 space-y-1 border-l-2 border-gradient-to-b from-blue-200 to-purple-200 pl-4 animate-fadeIn">
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.path}
                  to={subItem.path}
                  onClick={onMobileClose}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-300 group ${
                    location.pathname === subItem.path
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                      : "text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 hover:transform hover:scale-105"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    location.pathname === subItem.path ? 'bg-white shadow-lg' : 'bg-gray-300 group-hover:bg-blue-400'
                  }`}></div>
                  <span className="font-medium">{subItem.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="relative group">
          <Link
            key={item.name}
            to={item.path || '#'}
            onClick={onMobileClose}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
              isActive
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:shadow-md hover:transform hover:scale-105"
            }`}
          >
            <div className={`p-2 rounded-lg transition-all duration-300 z-10 ${
              isActive 
                ? 'bg-white/20 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:scale-110'
            }`}>
              {item.icon}
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-sm z-10 transition-all duration-300">{item.name}</span>
            )}
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl"></div>
            )}
          </Link>
          
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-xl">
              {item.name}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          )}
        </div>
      );
    }
  };

  const menu = [
    { 
      name: "Dashboard", 
      path: "/app/dashboard",
      permissionKey: "dashboard",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" /></svg>
    },

    // ---------------- USER MANAGEMENT ----------------
    {
      name: "User Management",
      permissionKey: "userManagement",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>,
      submenu: [
        { name: "Department", path: "/app/department" },
        { name: "Roles", path: "/app/roles" },
        { name: "Users", path: "/app/users" },
      ],
    },

    // ---------------- ORGANIZATION SETUP ----------------
    { 
      name: "Organization Setup", 
      path: "/app/organization/structure",
      permissionKey: "organizationSetup",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    },

    // ---------------- CORE MODULES ----------------
    { 
      name: "Item Master", 
      path: "/app/items",
      permissionKey: "itemMaster",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    },

    { 
      name: "Vendor Master", 
      path: "/app/vendor",
      permissionKey: "vendorMaster",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    },

    { 
      name: "Customer Management", 
      path: "/app/customers",
      permissionKey: "customerManagement",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    },

    { 
      name: "Locations Management", 
      path: "/app/inventory/locations",
      permissionKey: "locationsManagement",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },

    { 
      name: "Purchase Management", 
      path: "/app/purchase-management",
      permissionKey: "purchaseManagement",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" /></svg>
    },

    { 
      name: "Goods Receipt & Inspection(GRN)", 
      path: "/app/grn",
      permissionKey: "grn",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    },

    { 
      name: "Return & Disposal", 
      path: "/app/returns",
      permissionKey: "returnDisposal",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>
    },

    
    // ================= SINGLE MENU ITEMS =================
    
    { 
      name: "Vendor Ledger", 
      path: "/app/supplier-ledger",
      permissionKey: "vendorLedger",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    },

    { 
      name: "Stock Ledger", 
      path: "/app/stocks",
      permissionKey: "stockLedger",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    },

    { 
      name: "External Transfer", 
      permissionKey: "externalTransfer",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
      submenu: [
        { name: "External Transfer", path: "/app/external-transfer" },
        { name: "Damaged Returns", path: "/app/external-transfer/damaged-returns" },
      ],
    },

    { 
      name: "Audit Log", 
      path: "/app/audit-log",
      permissionKey: "auditLog",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },

    { 
      name: "Dispensed Items", 
      path: "/app/dispensed-items",
      permissionKey: "dispensedItems",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    },

    // //billing system
    // { 
    //   name: "Billing System", 
    //   icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    //   submenu: [
    //     { name: "View Invoices", path: "/app/billing" },
    //     { name: "Create Invoice", path: "/app/billing/create" },
    //   ],
    // },

  ];

  // Filter menu items based on user permissions
  const visibleMenu = menu.filter(item => {
    if (!item.permissionKey) {
      console.log(`${item.name}: No permission key, showing`);
      return true; // Show items without permission key
    }
    
    const canView = canViewSidebarItem(item.permissionKey);
    console.log(`${item.name} (${item.permissionKey}): ${canView ? 'SHOW' : 'HIDE'}`);
    return canView;
  });

  console.log('Visible menu items:', visibleMenu.map(item => item.name));

  return (
    <>
      <div className={`${isCollapsed ? 'w-16' : 'w-72'} bg-white/95 backdrop-blur-xl border-r border-gray-200/30 min-h-screen overflow-hidden shadow-2xl transition-all duration-300 ease-in-out relative`}>
        {/* Mobile Close Button */}
        <button 
          onClick={onMobileClose}
          className="lg:hidden absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Company Header with Toggle Button */}
        <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b border-gray-200/50 transition-all duration-300`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} transition-all duration-300`}>
              {!isCollapsed && (
                <div className="transition-all duration-300">
                  <h2 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    {companyName}
                  </h2>
                
                </div>
              )}
            </div>
            
            {/* Toggle Button - Hidden on mobile */}
            <button 
              onClick={onToggle}
              className="hidden lg:flex w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 items-center justify-center group hover:scale-110"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`${isCollapsed ? 'p-2' : 'p-4'} space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] transition-all duration-300`}>
          {visibleMenu.map((item) => (
            <div key={item.name}>
              {renderMenuItem(item)}
            </div>
          ))}
        </nav>
      </div>
      
      {/* Custom CSS */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
