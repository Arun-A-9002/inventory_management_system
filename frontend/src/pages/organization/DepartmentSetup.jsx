import { useEffect, useState } from "react";
import api from "../../api";

export default function DepartmentSetup() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/departments");
      setDepartments(res.data || []);
    } catch (e) {
      console.error("Failed loading departments", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Department Overview</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">View organization departments (managed in User Management)</p>
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-lg text-center sm:text-left">
              <span className="text-sm font-medium text-gray-600">Total Departments</span>
              <span className="ml-2 text-lg font-bold text-gray-900">{departments.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* LEFT CARD — INFO */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Department Overview</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Read-only department view</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-6">
                <div className="text-xs sm:text-sm text-gray-600 mb-4">
                  Departments are managed in User Management. This is a read-only view.
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-blue-800">
                    To create or modify departments, please go to User Management section.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE — LIST */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Department Directory</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Complete overview of your organization's department information</p>
              </div>
              
              <div className="overflow-hidden">
                <div className="block sm:hidden">
                  {/* Mobile Card Layout */}
                  <div className="divide-y divide-gray-200">
                    {loading ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : departments.length === 0 ? (
                      <div className="p-4 text-center text-gray-400">
                        No departments registered
                      </div>
                    ) : (
                      departments.map((d) => (
                        <div key={d.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{d.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">{d.description || 'No description'}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              d.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {d.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="hidden sm:block overflow-x-auto">
                  {/* Desktop Table Layout */}
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                          </td>
                        </tr>
                      ) : departments.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                            No departments registered
                          </td>
                        </tr>
                      ) : (
                        departments.map((d) => (
                          <tr key={d.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{d.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{d.description || '-'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs rounded ${
                                d.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {d.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="p-3 sm:p-4 bg-gray-50 text-xs sm:text-sm text-gray-500 border-t">
                Total: {departments.length} departments
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}