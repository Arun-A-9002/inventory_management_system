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

  const menu = [
    { name: "Dashboard", path: "/app/dashboard" },

    {
      name: "User Management",
      submenu: [
        { name: "Department", path: "/app/department" },
        { name: "Roles", path: "/app/roles" },
        { name: "Users", path: "/app/users" },
      ],
    },

    // ✔ FIXED — Organization Setup is now a SINGLE item
    {
      name: "Organization Setup",
      path: "/app/organization",
    },

    { name: "Reports", path: "/app/reports" },
    { name: "Settings", path: "/app/settings" },
  ];

  return (
    <div className="w-64 bg-cyan-700 text-white min-h-screen p-5">
      <h2 className="text-2xl font-bold mb-8">NUTRYAH IMS</h2>

      <ul className="space-y-3">
        {menu.map((item) => (
          <li key={item.name}>
            
            {/* If menu has submenu */}
            {item.submenu ? (
              <div>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-cyan-600 transition"
                >
                  {item.name}
                </button>

                {openMenus[item.name] && (
                  <ul className="ml-4 mt-2 space-y-2">
                    {item.submenu.map((subItem) => (
                      <li key={subItem.path}>
                        <Link
                          to={subItem.path}
                          className={`block px-4 py-2 rounded-lg transition ${
                            location.pathname === subItem.path
                              ? "bg-white text-cyan-700 font-semibold"
                              : "hover:bg-cyan-600"
                          }`}
                        >
                          {subItem.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              // Normal menu item
              <Link
                to={item.path}
                className={`block px-4 py-2 rounded-lg transition ${
                  location.pathname === item.path
                    ? "bg-white text-cyan-700 font-semibold"
                    : "hover:bg-cyan-600"
                }`}
              >
                {item.name}
              </Link>
            )}

          </li>
        ))}
      </ul>
    </div>
  );
}
