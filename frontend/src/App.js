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

//items
import Item from "./pages/items/Item";

//vendors
import Vendor from "./pages/vendors/vendor";

// Purchase Management
import PurchaseManagement from "./pages/purchase/PurchaseManagement";

// stocks
import StockManagement from "./pages/stocks/StockManagement";

// inventory
import InventoryLocations from "./pages/inventory/InventoryLocations";

// Goods Receipt Note (GRN) - New Module to be added later
import GoodsReceipt from "./pages/grn/GoodsReceipt";

//return & disposal
import ReturnDisposal from "./pages/returns/ReturnDisposal";

//customers
import CustomerRegistration from "./pages/customers/CustomerRegistration";

//supplier ledger
import SupplierLedger from "./pages/suppliers/SupplierLedger";

//billing system
import Billing from "./pages/BillingSystem/billing";
import InvoiceCreation from "./pages/BillingSystem/InvoiceCreation";
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
          
          <Route path="items" element={<Item />} />
          {/* Vendor Management */}
          <Route path="vendor" element={<Vendor />} />

          {/* Purchase Management */}
          <Route path="purchase-management" element={<PurchaseManagement />} />

           {/* GRN */}
          <Route path="grn" element={<GoodsReceipt />} />

          {/* Stocks */}
          <Route path="stocks" element={<StockManagement />} />
          
          {/* Inventory Locations */}
          <Route path="inventory/locations" element={<InventoryLocations />} />

          {/* Return & Disposal */}
          <Route path="returns" element={<ReturnDisposal />} />

          {/* Customer Management */}
          <Route path="customers" element={<CustomerRegistration />} />

          {/* Supplier Ledger */}
          <Route path="supplier-ledger" element={<SupplierLedger />} />
          {/* Billing System */}
          <Route path="billing" element={<Billing />} />
          <Route path="billing/create" element={<InvoiceCreation />} />
            
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
