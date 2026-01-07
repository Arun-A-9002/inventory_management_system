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
    <div>
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT CARD — INFO */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-3">Department Overview</h2>
            <div className="text-sm text-slate-500 mb-4">
              Departments are managed in User Management. This is a read-only view.
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                To create or modify departments, please go to User Management section.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — LIST */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Department Directory</h3>
              <p className="text-sm text-gray-500 mt-1">Complete overview of your organization's department information</p>
            </div>
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
                        </td>
                      </tr>
                    ) : departments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                          No departments registered
                        </td>
                      </tr>
                    ) : (
                      departments.map((d, idx) => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-center">{idx + 1}</td>
                          <td className="px-4 py-4">
                            <div className="font-semibold">{d.name}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-600">{d.description || '-'}</div>
                          </td>
                          <td className="px-4 py-4">
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
            <div className="p-4 bg-gray-50 text-sm text-gray-500">
              Total: {departments.length} departments
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}