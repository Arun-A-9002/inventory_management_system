import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const menu = [
    { name: "Dashboard", path: "/app/dashboard" },
    { name: "Inventory", path: "/app/inventory" },
    { name: "Reports", path: "/app/reports" },
    { name: "Settings", path: "/app/settings" },
  ];

  return (
    <div className="w-64 bg-cyan-700 text-white min-h-screen p-5">
      <h2 className="text-2xl font-bold mb-8">NUTRYAH IMS</h2>

      <ul className="space-y-3">
        {menu.map((item) => (
          <li key={item.path}>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
