import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';

// Views
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Inventory from './views/Inventory';
import POSBilling from './views/POSBilling';
import BillHistory from './views/BillHistory';
import Customers from './views/Customers';
import Suppliers from './views/Suppliers';
import Purchases from './views/Purchases';
import Expenses from './views/Expenses';
import Reports from './views/Reports';
import Staff from './views/Staff';
import Settings from './views/Settings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<POSBilling />} />
            <Route path="history" element={<BillHistory />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="customers" element={<Customers />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="staff" element={<Staff />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
