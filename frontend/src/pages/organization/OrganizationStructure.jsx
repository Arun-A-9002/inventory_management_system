import React, { useState } from 'react';
import Company from './Company';
import Branch from './Branch';
import Store from './Store';
import DepartmentSetup from './DepartmentSetup';

export default function OrganizationStructure() {
  const [activeTab, setActiveTab] = useState('company');

  const tabs = [
    { id: 'company', label: 'Company', component: <Company /> },
    { id: 'branch', label: 'Branch', component: <Branch /> },
    { id: 'department', label: 'Department', component: <DepartmentSetup /> },
    { id: 'store', label: 'Store', component: <Store /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white/70 backdrop-blur-xl shadow-lg border-b border-gray-200/50">
        <div className="px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Organization Setup</h1>
              <p className="text-gray-600 text-lg font-medium">Configure your organization structure and hierarchy</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 mb-8">
          <div className="px-6 py-4 border-b border-gray-200/50">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-4 font-semibold text-sm rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>
        </div>
      </div>
    </div>
  );
}