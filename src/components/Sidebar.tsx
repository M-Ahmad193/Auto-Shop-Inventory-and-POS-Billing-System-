import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  Receipt, 
  History, 
  FileText, 
  Settings, 
  LogOut,
  Bike,
  Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, show: isAdmin },
    { name: 'POS Billing', path: '/pos', icon: ShoppingCart, show: true },
    { name: 'Bill History', path: '/history', icon: History, show: true },
    { name: 'Inventory', path: '/inventory', icon: Package, show: isAdmin },
    { name: 'Suppliers', path: '/suppliers', icon: Truck, show: isAdmin },
    { name: 'Purchases', path: '/purchases', icon: Wallet, show: isAdmin },
    { name: 'Customers & Bikes', path: '/customers', icon: Bike, show: true },
    { name: 'Expenses', path: '/expenses', icon: Receipt, show: isAdmin },
    { name: 'Reports', path: '/reports', icon: FileText, show: isAdmin },
    { name: 'Staff Management', path: '/staff', icon: Users, show: isAdmin },
    { name: 'Settings', path: '/settings', icon: Settings, show: isAdmin },
  ];

  return (
    <div className="flex bg-sidebar text-text-p w-[200px] flex-col h-screen fixed left-0 top-0 border-r border-border">
      <div className="p-6 border-b border-border mb-4">
        <h1 className="text-xl font-serif italic font-normal text-accent flex items-center gap-2">
          Afzal Auto
        </h1>
        <p className="text-[10px] text-text-s mt-1 uppercase tracking-[0.2em] font-medium leading-tight">Service & Spares</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 space-y-1">
        {menuItems.filter(item => item.show).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-6 py-3 text-[11px] font-medium transition-all duration-200 uppercase tracking-wider",
              isActive 
                ? "bg-accent/10 text-accent border-r-[3px] border-accent" 
                : "text-text-s hover:bg-accent/5 hover:text-accent"
            )}
          >
            <item.icon size={16} />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-card/50">
          <div className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center text-xs font-bold">
            {user?.username?.[0].toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold truncate">{user?.username}</p>
            <p className="text-[9px] text-accent uppercase tracking-wider font-black">{user?.role || 'Staff'}</p>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-danger hover:bg-danger/10 rounded-lg transition-colors uppercase tracking-widest font-bold"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
