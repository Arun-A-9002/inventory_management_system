import React from 'react';
import { useNavigate } from 'react-router-dom';

const MasterDataHeader = ({ title, subtitle, onCreateClick, createButtonText }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
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
            <p className="text-gray-600 mt-1">{title}</p>
            <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/app/organization/master-data')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span>⚙️</span>
            <span>Master Data Setup</span>
          </button>
          <button
            onClick={onCreateClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span>+</span>
            <span>{createButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterDataHeader;