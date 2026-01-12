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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-6">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Department Overview</h2>
                    <p className="text-sm text-gray-500">Read-only department view</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="text-sm text-gray-600 mb-4">
                  Departments are managed in User Management. This is a read-only view.
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    To create or modify departments, please go to User Management section.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE — LIST */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Department Directory</h3>
                <p className="text-sm text-gray-500 mt-1">Complete overview of your organization's department information</p>
              </div>
              
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">#</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                          </td>
                        </tr>
                      ) : departments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                            No departments registered
                          </td>
                        </tr>
                      ) : (
                        departments.map((d, idx) => (
                          <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-500 text-center">{idx + 1}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">{d.name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-600">{d.description || '-'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs rounded ${
                                d.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-600'
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

              {/* Mobile Cards */}
              <div className="lg:hidden">
                {loading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : departments.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">No departments registered</div>
                ) : (
                  <div className="space-y-4 p-4">
                    {departments.map((d, idx) => (
                      <div key={d.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="text-blue-600 font-semibold text-sm">{d.name.charAt(0)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-900 truncate">{d.name}</h4>
                              <p className="text-xs text-gray-500">#{idx + 1}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded flex-shrink-0 ml-2 ${
                            d.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {d.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="text-sm mb-4">
                          <span className="text-gray-500">Description:</span>
                          <div className="mt-1 font-medium">{d.description || "No description provided"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-gray-50 text-sm text-gray-500 border-t">
                Total: {departments.length} departments
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}