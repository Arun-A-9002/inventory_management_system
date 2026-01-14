import React, { useState } from 'react';
import Company from './Company';
import Branch from './Branch';
import DepartmentSetup from './DepartmentSetup';

export default function OrganizationStructure() {
  const [activeTab, setActiveTab] = useState('company');

  const tabs = [
    { id: 'company', label: 'Company', component: <Company /> },
    { id: 'branch', label: 'Branch', component: <Branch /> },
    { id: 'department', label: 'Department', component: <DepartmentSetup /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
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