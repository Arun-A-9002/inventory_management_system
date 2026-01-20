import React from 'react';
import { useNavigate } from 'react-router-dom';

const MasterDataSetup = () => {
  const navigate = useNavigate();

  const masterDataItems = [
    {
      id: 'category',
      title: 'Category',
      description: 'Organize your products using categories',
      icon: '📁',
      path: '/organization/category',
      color: 'bg-blue-500'
    },
    {
      id: 'subcategory',
      title: 'Sub Category',
      description: 'Create subcategories under main categories',
      icon: '📂',
      path: '/organization/subcategory',
      color: 'bg-green-500'
    },
    {
      id: 'brand',
      title: 'Brand',
      description: 'Manage product brands and manufacturer information',
      icon: '🏷️',
      path: '/organization/brand',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Master Data Setup</h1>
            <p className="text-gray-600 mt-1">Configure your inventory master data</p>
            <p className="text-sm text-gray-500 mt-2">Set up categories, subcategories, and brands for your products</p>
          </div>
        </div>
      </div>

      {/* Master Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {masterDataItems.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(item.path)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                {item.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
              <div className="text-gray-400">
                <span>→</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-600">Sub Categories</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-600">Brands</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterDataSetup;