import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (menuName) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const renderMenuItem = (item) => {
    if (item.submenu) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleMenu(item.name)}
            className="w-full text-left px-4 py-2 rounded-lg hover:bg-cyan-600 transition flex items-center gap-3"
          >
            {item.icon}
            <span>{item.name}</span>
            <svg className={`w-4 h-4 ml-auto transition-transform ${openMenus[item.name] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openMenus[item.name] && (
            <ul className="ml-8 mt-2 space-y-1">
              {item.submenu.map((subItem) => (
                <li key={subItem.name}>
                  {subItem.submenu ? (
                    <div>
                      <button
                        onClick={() => toggleMenu(subItem.name)}
                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-cyan-600 transition flex items-center gap-2"
                      >
                        <span className="w-1 h-1 bg-white rounded-full"></span>
                        <span>{subItem.name}</span>
                      </button>
                      {openMenus[subItem.name] && (
                        <ul className="ml-6 mt-1 space-y-1">
                          {subItem.submenu.map((nestedItem) => (
                            <li key={nestedItem.path}>
                              <Link
                                to={nestedItem.path}
                                className={`flex items-center gap-2 px-3 py-1 text-sm rounded transition ${
                                  location.pathname === nestedItem.path
                                    ? "bg-white text-cyan-700 font-semibold"
                                    : "hover:bg-cyan-600"
                                }`}
                              >
                                <span className="w-1 h-1 bg-current rounded-full"></span>
                                <span>{nestedItem.name}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={subItem.path}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition ${
                        location.pathname === subItem.path
                          ? "bg-white text-cyan-700 font-semibold"
                          : "hover:bg-cyan-600"
                      }`}
                    >
                      <span className="w-1 h-1 bg-white rounded-full"></span>
                      <span>{subItem.name}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    } else {
      return (
        <Link
          key={item.name}
          to={item.path}
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
            location.pathname === item.path
              ? "bg-white text-cyan-700 font-semibold"
              : "hover:bg-cyan-600"
          }`}
        >
          {item.icon}
          <span>{item.name}</span>
        </Link>
      );
    }
  };

  const menu = [
    { 
      name: "Dashboard", 
      path: "/app/dashboard",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" /></svg>
    },

    // ---------------- USER MANAGEMENT ----------------
    {
      name: "User Management",
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
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
      submenu: [
        { name: "Organization Structure Setup", path: "/app/organization/structure" },
        { name: "Master Data Setup", path: "/app/organization/master-data" },
      ],
    },

    // ---------------- CORE MODULES ----------------
    { 
      name: "Item Master", 
      path: "/app/items",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    },

    { 
      name: "Vendor Master", 
      path: "/app/vendor",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    },

    { 
      name: "Customer Management", 
      path: "/app/customers",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    },

    { 
      name: "Locations Management", 
      path: "/app/inventory/locations",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },

    { 
      name: "Purchase Management", 
      path: "/app/purchase-management",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" /></svg>
    },

    { 
      name: "Goods Receipt & Inspection(GRN)", 
      path: "/app/grn",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    },

    { 
      name: "Return & Disposal", 
      path: "/app/returns",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>
    },

    
    // ================= SINGLE MENU ITEMS =================
    
    { 
      name: "Vendor Ledger", 
      path: "/app/supplier-ledger",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    },

    { 
      name: "Stock Ledger", 
      path: "/app/stocks",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    },

    //billing system
    { 
      name: "Billing System", 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
      submenu: [
        { name: "View Invoices", path: "/app/billing" },
        { name: "Create Invoice", path: "/app/billing/create" },
      ],
    },

  ];

  return (
    <div className="w-64 bg-cyan-700 text-white min-h-screen p-5 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-8">NUTRYAH IMS</h2>

      <ul className="space-y-3">
        {menu.map((item) => (
          <li key={item.name}>
            {renderMenuItem(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}
