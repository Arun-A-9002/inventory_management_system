import React, { useState } from 'react';
import Company from './Company';
import Branch from './Branch';
import Store from './Store';

export default function OrganizationStructure() {
  const [activeTab, setActiveTab] = useState('company');

  const tabs = [
    { id: 'company', label: 'Company', component: <Company /> },
    { id: 'branch', label: 'Branch', component: <Branch /> },
    { id: 'department', label: 'Department', component: <div>Department Component</div> },
    { id: 'store', label: 'Store', component: <Store /> },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Organization Structure Setup</h1>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}