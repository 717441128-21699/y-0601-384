import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '../../store/useStore';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initializeData = useStore((state) => state.initializeData);
  const refreshReminders = useStore((state) => state.refreshReminders);

  useEffect(() => {
    initializeData();
    refreshReminders();
  }, [initializeData, refreshReminders]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
