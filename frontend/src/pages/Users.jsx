import { useEffect, useState } from "react";
import api from "../api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal form state
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState(null);

  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState(new Set());

  // edit
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      console.log("Loading departments...");
      const dRes = await api.get("/departments");
      console.log("Departments loaded:", dRes.data);
      setDepartments(dRes.data || []);
      
      console.log("Loading roles...");
      try {
        const rRes = await api.get("/roles");
        console.log("Roles loaded:", rRes.data);
        setRoles(rRes.data || []);
      } catch (roleError) {
        console.error("Roles endpoint not available:", roleError);
        setRoles([]);
      }
      
      console.log("Loading users...");
      try {
        const uRes = await api.get("/users");
        console.log("Users loaded:", uRes.data);
        setUsers(uRes.data || []);
      } catch (userError) {
        console.error("Users endpoint not available:", userError);
        setUsers([]);
      }
    } catch (e) {
      console.error("Load error:", e);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function toggleRole(id) {
    const copy = new Set(selectedRoles);
    if (copy.has(id)) copy.delete(id); else copy.add(id);
    setSelectedRoles(copy);
  }

  async function handleCreate() {
    if (!fullName || !email || (!editingId && !password)) return alert("Name, email and password required");
    try {
      const payload = {
        full_name: fullName,
        email,
        password: editingId ? undefined : password,
        department_id: departmentId,
        is_doctor: false,
        is_active: isActive,
        role_ids: Array.from(selectedRoles),
      };
      console.log("Sending payload:", payload);
      
      if (!editingId) {
        const response = await api.post("/users", payload);
        console.log("User created:", response.data);
      } else {
        const response = await api.put(`/users/${editingId}`, {
          ...payload,
          password: password || undefined,
        });
        console.log("User updated:", response.data);
      }
      setShowModal(false);
      resetForm();
      await loadAll();
    } catch (e) {
      console.error("Full error:", e);
      console.error("Response data:", e?.response?.data);
      console.error("Response status:", e?.response?.status);
      alert(e?.response?.data?.detail || "Save failed");
    }
  }

  function resetForm() {
    setEditingId(null);
    setFullName(""); setEmail(""); setPassword("");
    setDepartmentId(null); setIsActive(true); setSelectedRoles(new Set());
  }

  function startEdit(user) {
    setEditingId(user.id);
    setFullName(user.full_name);
    setEmail(user.email);
    setDepartmentId(user.department_id);

    setIsActive(!!user.is_active);
    setSelectedRoles(new Set((user.roles || []).map(r => r.id)));
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete user?")) return;
    await api.delete(`/users/${id}`);
    await loadAll();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* header */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-500 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase opacity-80">Staff & access directory</div>
              <h1 className="text-3xl font-semibold mt-2">User Management</h1>
            </div>
            <div>
              <button onClick={()=>setShowModal(true)} className="rounded-full bg-sky-600 px-4 py-2 text-white">New user</button>
            </div>
          </div>
        </div>
      </div>

      {/* user cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div>Loading...</div>
        ) : users.length === 0 ? (
          <div className="col-span-3">No users</div>
        ) : users.map(u => (
          <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{u.full_name}</div>
                <div className="text-sm text-slate-500">{u.email}</div>
              </div>
              <div className="text-right">

                <div className={`text-xs mt-1 px-2 py-1 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{u.is_active ? 'ACTIVE' : 'INACTIVE'}</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-500">
              <div><span className="font-medium">Department:</span> {u.department ? u.department.name : 'No department'}</div>
              <div className="mt-2">
                <div className="flex gap-2 flex-wrap mt-2">
                  {(u.roles || []).map(r => (
                    <div key={r.id} className="text-xs bg-slate-100 px-3 py-1 rounded-full">{r.name}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={()=>startEdit(u)} className="rounded-full border px-4 py-2">Edit</button>
              <button onClick={()=>handleDelete(u.id)} className="rounded-full border px-4 py-2 text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/40" onClick={()=>{setShowModal(false); resetForm();}} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl p-6 z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{editingId ? 'Edit user' : 'Add new user'}</h3>
              <button onClick={()=>{setShowModal(false); resetForm();}}>✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)} className="rounded-lg border px-4 py-2" />
              <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="rounded-lg border px-4 py-2" />
              <input placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="rounded-lg border px-4 py-2" />
              
              <select value={departmentId||''} onChange={e=>setDepartmentId(e.target.value?Number(e.target.value):null)} className="rounded-lg border px-4 py-2">
                <option value="">No department</option>
                {departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} /> Active user</label>
              </div>

              <div className="col-span-2">
                <div className="text-sm font-medium mb-2">Roles ({roles.length} total)</div>
                <div className="h-44 overflow-auto border rounded-md p-3 bg-slate-50 grid grid-cols-2 gap-2">
                  {roles.map(r => (
                    <label key={r.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/50">
                      <input type="checkbox" checked={selectedRoles.has(r.id)} onChange={()=> {
                        const copy = new Set(selectedRoles);
                        if (copy.has(r.id)) copy.delete(r.id); else copy.add(r.id);
                        setSelectedRoles(copy);
                      }} />
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-slate-400">{r.description || ''}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>{setShowModal(false); resetForm();}} className="rounded-full border px-4 py-2">Cancel</button>
              <button onClick={handleCreate} className="rounded-full bg-emerald-600 text-white px-5 py-2">{editingId ? 'Save' : 'Create user'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
