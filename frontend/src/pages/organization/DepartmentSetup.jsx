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
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Department Overview</h3>
        <p className="text-sm text-slate-500">
          Departments are managed in User Management. This is a read-only view.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="text-sm text-slate-500 border-b">
              <th className="py-3 text-left">#</th>
              <th className="py-3 text-left">Name</th>
              <th className="py-3 text-left">Description</th>
              <th className="py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-6 text-center">Loading...</td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  No departments found
                </td>
              </tr>
            ) : (
              departments.map((d, idx) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="py-3">{idx + 1}</td>
                  <td className="py-3 font-medium">{d.name}</td>
                  <td className="py-3">{d.description || "-"}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      d.is_active 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {d.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-slate-500">
        Total: {departments.length} departments
      </div>
    </div>
  );
}