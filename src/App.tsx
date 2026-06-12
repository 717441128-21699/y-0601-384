import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout/Layout";
import Dashboard from "@/pages/Dashboard";
import PropertyList from "@/pages/PropertyList";
import TenantList from "@/pages/TenantList";
import BillList from "@/pages/BillList";
import ImportPage from "@/pages/ImportPage";
import ReminderPage from "@/pages/ReminderPage";
import ReconciliationPage from "@/pages/ReconciliationPage";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="properties" element={<PropertyList />} />
          <Route path="tenants" element={<TenantList />} />
          <Route path="bills" element={<BillList />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="reminders" element={<ReminderPage />} />
          <Route path="reconciliation" element={<ReconciliationPage />} />
          <Route path="reports" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
