import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/login";
import Register from "./pages/register";

import Dashboard from "./pages/Dashboard";
import MainLayout from "./components/Layout/MainLayout";

// User Management
import Department from "./pages/Department";
import Roles from "./pages/Roles";
import Users from "./pages/Users";

// Organization Setup Pages
import OrganizationStructure from "./pages/organization/OrganizationStructure";
import MasterData from "./pages/organization/MasterData";
import UserAccess from "./pages/organization/UserAccess";
import InventoryRules from "./pages/organization/InventoryRules";


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

          {/* Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* User Management */}
          <Route path="department" element={<Department />} />
          <Route path="roles" element={<Roles />} />
          <Route path="users" element={<Users />} />

          

          {/* Organization Setup */}
          <Route path="organization/structure" element={<OrganizationStructure />} />
          <Route path="organization/master-data" element={<MasterData />} />
          <Route path="organization/user-access" element={<UserAccess />} />
          <Route path="organization/inventory-rules" element={<InventoryRules />} />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
