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
pe        <div className="px-4 sm:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Organization Setup</h1>
              <p className="text-gray-600 text-base sm:text-lg font-medium">Configure your organization structure and hierarchy</p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg self-start sm:self-auto">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 sm:py-8">
        {/* Tab Navigation */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 mb-8">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200/50">
            {/* Desktop Navigation */}
            <nav className="hidden sm:flex space-x-8">
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
            
            {/* Mobile Navigation */}
            <nav className="sm:hidden">
              <div className="grid grid-cols-2 gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 px-3 font-semibold text-sm rounded-xl transition-all duration-200 text-center ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 border border-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>
        </div>
      </div>
    </div>
  );
}