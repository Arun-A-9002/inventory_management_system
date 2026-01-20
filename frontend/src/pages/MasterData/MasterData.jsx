import React, { useState } from 'react';
import Category from './Category';
import SubCategory from './SubCategory';
import Brand from './Brand';

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('category');

  const tabs = [
    { id: 'category', label: 'Category', component: <Category /> },
    { id: 'subcategory', label: 'Sub Category', component: <SubCategory /> },
    { id: 'brand', label: 'Brand', component: <Brand /> },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Master Data Setup</h1>
      
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