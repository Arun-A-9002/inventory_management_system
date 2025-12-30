import React from 'react';

export default function SimpleSidebar() {
  return (
    <aside className="w-64 bg-white shadow-lg border-r h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
      </div>
      
      <nav className="p-2">
        <div className="flex items-center px-4 py-3 mb-1 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer">
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
          Dashboard
        </div>
        
        <div className="flex items-center px-4 py-3 mb-1 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer">
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
          Inventory
        </div>
        
        <div className="flex items-center px-4 py-3 mb-1 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer">
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Orders
        </div>
        
        <div className="flex items-center px-4 py-3 mb-1 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer">
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Reports
        </div>
      </nav>
    </aside>
  );
}