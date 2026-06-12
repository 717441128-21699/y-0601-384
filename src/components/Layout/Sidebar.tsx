import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  Users,
  Receipt,
  Upload,
  Bell,
  FileCheck,
  BarChart3,
  Building2,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/properties', label: '房源管理', icon: Home },
  { path: '/tenants', label: '租客管理', icon: Users },
  { path: '/bills', label: '账单管理', icon: Receipt },
  { path: '/import', label: '流水导入', icon: Upload },
  { path: '/reminders', label: '提醒中心', icon: Bell },
  { path: '/reconciliation', label: '对账管理', icon: FileCheck },
  { path: '/reports', label: '报表中心', icon: BarChart3 },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const unreadCount = useStore((state) => state.getUnreadReminderCount());

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-slate-800">房东管家</h1>
              <p className="text-xs text-slate-500">租金记账理财工具</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto scrollbar-hide">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`nav-item group ${isActive ? 'nav-item-active' : ''}`}
                >
                  <Icon
                    size={20}
                    className={`transition-colors ${
                      isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-primary-600'
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.path === '/reminders' && unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="bg-gradient-to-r from-primary-50 to-teal-50 rounded-xl p-4">
            <p className="text-sm text-primary-700 font-medium mb-1">💡 快捷提示</p>
            <p className="text-xs text-primary-600/80">
              每月1号自动生成当月账单，记得导入银行流水进行对账哦！
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
