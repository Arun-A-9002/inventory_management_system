import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./components/Layout/MainLayout";
import Department from "./pages/Department";
import Roles from "./pages/Roles";
import Users from "./pages/Users";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        

        {/* Protected pages */}
        <Route path="/app" element={<MainLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="department" element={<Department />} />
          <Route path="roles" element={<Roles />} />
          <Route path="users" element={<Users />} />
          
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
