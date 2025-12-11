// src/pages/Users.jsx
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import api from "../api";
import { hasPermission } from "../utils/permissions";

const UserCard = memo(({ user, onEdit, onDelete }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border flex flex-col justify-between">
    <div>
      <div className="text-lg font-semibold">{user.full_name}</div>
      <div className="text-sm text-slate-500">{user.email}</div>
      <div className="mt-4 text-sm text-slate-500">
        <div><span className="font-medium">Department:</span> {user.department ? user.department.name : 'No department'}</div>
        <div className="mt-2">
          <div className="flex gap-2 flex-wrap mt-2">{(user.roles || []).map(r => <div key={r.id} className="text-xs bg-slate-100 px-3 py-1 rounded-full">{r.name}</div>)}</div>
        </div>
      </div>
    </div>
    <div className="mt-4 flex gap-2">
      {hasPermission("users.update") && <button onClick={()=>onEdit(user)} className="rounded-full border px-4 py-2">Edit</button>}
      {hasPermission("users.delete") && <button onClick={()=>onDelete(user.id)} className="rounded-full border px-4 py-2 text-red-600">Delete</button>}
    </div>
  </div>
));

const UserGrid = memo(({ users, loading, onEdit, onDelete }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {loading ? <div>Loading...</div> : users.length === 0 ? <div className="col-span-3">No users</div> : users.map(u => (
      <UserCard key={u.id} user={u} onEdit={onEdit} onDelete={onDelete} />
    ))}
  </div>
));

export default function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [editingId, setEditingId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, rRes, uRes] = await Promise.all([api.get("/departments"), api.get("/roles"), api.get("/users")]);
      setDepartments(dRes.data || []);
      setRoles(rRes.data || []);
      setUsers(uRes.data || []);
    } catch (e) {
      console.error("Load error:", e);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasPermission("users.view")) loadAll();
  }, [loadAll]);

  const toggleRole = useCallback((id) => {
    setSelectedRoles(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!editingId && !hasPermission("users.create")) return alert("Permission denied");
    if (editingId && !hasPermission("users.update")) return alert("Permission denied");

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

      if (!editingId) {
        await api.post("/users", payload);
      } else {
        await api.put(`/users/${editingId}`, { ...payload, password: password || undefined });
      }

      closeModal();
      await loadAll();
    } catch (e) {
      console.error("Full error:", e);
      alert(e?.response?.data?.detail || "Save failed");
    }
  }, [editingId, fullName, email, password, departmentId, isActive, selectedRoles, loadAll]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setFullName(""); setEmail(""); setPassword("");
    setDepartmentId(null); setIsActive(true); setSelectedRoles(new Set());
  }, []);

  const startEdit = useCallback((u) => {
    if (!hasPermission("users.update")) return alert("Permission denied");
    setEditingId(u.id);
    setFullName(u.full_name);
    setEmail(u.email);
    setDepartmentId(u.department_id);
    setIsActive(!!u.is_active);
    setSelectedRoles(new Set((u.roles || []).map(r => r.id)));
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!hasPermission("users.delete")) return alert("Permission denied");
    if (!window.confirm("Delete user?")) return;
    try {
      await api.delete(`/users/${id}`);
      await loadAll();
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  }, [loadAll]);

  if (!hasPermission("users.view")) {
    return <div className="p-6 text-red-600">You do not have permission to view users.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6 bg-gradient-to-r from-emerald-600 to-sky-500 p-6 text-white rounded-2xl shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="opacity-80">Manage system users, roles, and access.</p>
          </div>

          {hasPermission("users.create") && (
            <button onClick={()=>setShowModal(true)} className="bg-sky-600 px-4 py-2 rounded-full shadow text-white">New User</button>
          )}
        </div>
      </div>

      <UserGrid users={users} loading={loading} onEdit={startEdit} onDelete={handleDelete} />

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl p-6 z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{editingId ? 'Edit user' : 'Add new user'}</h3>
              <button onClick={closeModal}>✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)} className="rounded-lg border px-4 py-2" />
              <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="rounded-lg border px-4 py-2" />
              {!editingId && <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="rounded-lg border px-4 py-2" />}
              <select value={departmentId||''} onChange={e=>setDepartmentId(e.target.value?Number(e.target.value):null)} className="rounded-lg border px-4 py-2">
                <option value="">No department</option>
                {departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} /> Active user</label>

              <div className="col-span-2">
                <div className="text-sm font-medium mb-2">Roles ({roles.length} total)</div>
                <div className="h-44 overflow-auto border rounded-md p-3 bg-slate-50 grid grid-cols-2 gap-2">
                  {roles.map(r => (
                    <label key={r.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/50">
                      <input type="checkbox" checked={selectedRoles.has(r.id)} onChange={()=>toggleRole(r.id)} />
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
              <button onClick={closeModal} className="rounded-full border px-4 py-2">Cancel</button>
              <button onClick={handleCreate} className="rounded-full bg-emerald-600 text-white px-5 py-2">{editingId ? 'Save' : 'Create user'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}