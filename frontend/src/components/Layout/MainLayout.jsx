import React from "react";
import Sidebar from "./Sidebar";
import HeaderFooter from "./HeaderFooter";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* LEFT SIDEBAR */}
      <Sidebar />

      {/* RIGHT SIDE CONTENT */}
      <div className="flex flex-col flex-1">

        {/* HEADER */}
        <HeaderFooter type="header" />

        {/* MAIN PAGE CONTENT */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>

        {/* FOOTER */}
        <HeaderFooter type="footer" />
      </div>

    </div>
  );
}
