import React from "react";

export default function HeaderFooter({ type }) {
  if (type === "header") {
    return (
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-cyan-700">Dashboard</h1>

        <button className="px-4 py-2 bg-cyan-700 text-white rounded-lg">
          Logout
        </button>
      </header>
    );
  }

  return (
    <footer className="bg-white shadow px-6 py-3 text-center text-gray-500">
      © 2025 NUTRYAH — Inventory Management System
    </footer>
  );
}
