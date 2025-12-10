import { useEffect, useState } from "react";
import api from "../api"; // your global axios instance

function Department() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Load all departments
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    const res = await api.get("/departments");
    setDepartments(res.data);
  };

  const handleCreate = async () => {
    if (!name) return alert("Name is required");

    await api.post("/departments", { name, description });

    setName("");
    setDescription("");
    loadDepartments();
  };

  const handleEdit = (dept) => {
    setEditing(dept.id);
    setEditName(dept.name);
    setEditDescription(dept.description || "");
  };

  const handleUpdate = async () => {
    await api.put(`/departments/${editing}`, {
      name: editName,
      description: editDescription,
    });

    setEditing(null);
    loadDepartments();
  };

  const handleDelete = async (id) => {
    await api.delete(`/departments/${id}`);
    loadDepartments();
  };

  return (
    <div className="container">
      <h2>Department Management</h2>

      {/* CREATE FORM */}
      <div className="card">
        <h3>Add Department</h3>

        <input
          type="text"
          placeholder="Department Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button onClick={handleCreate}>Add</button>
      </div>

      {/* DEPARTMENT TABLE */}
      <table border="1" width="100%" style={{ marginTop: 20 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id}>
              <td>
                {editing === dept.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                ) : (
                  dept.name
                )}
              </td>

              <td>
                {editing === dept.id ? (
                  <input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                ) : (
                  dept.description || "-"
                )}
              </td>

              <td>{dept.is_active ? "Active" : "Inactive"}</td>

              <td>
                {editing === dept.id ? (
                  <>
                    <button onClick={handleUpdate}>Save</button>
                    <button onClick={() => setEditing(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEdit(dept)}>Edit</button>
                    <button onClick={() => handleDelete(dept.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Department;
