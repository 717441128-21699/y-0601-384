import React from 'react';
import { Menu, Bell, Settings, Download, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getCurrentPeriod } from '../../utils/date';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const unreadCount = useStore((state) => state.getUnreadReminderCount());
  const exportAllData = useStore((state) => state.exportAllData);
  const generateMonthlyBills = useStore((state) => state.generateMonthlyBills);
  const refreshReminders = useStore((state) => state.refreshReminders);

  const handleGenerateBills = () => {
    const period = getCurrentPeriod();
    const newBills = generateMonthlyBills(period);
    if (newBills.length > 0) {
      alert(`已生成 ${newBills.length} 条 ${period} 月账单`);
    } else {
      alert(`${period} 月账单已存在，无需重复生成`);
    }
    refreshReminders();
  };

  const handleExportData = () => {
    if (confirm('确定要导出所有数据吗？')) {
      exportAllData();
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-800 hidden sm:block">
              欢迎使用房东租金管理系统
            </h2>
            <p className="text-xs text-slate-500 hidden sm:block">
              高效管理您的房产投资，轻松掌控收益
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateBills}
            className="btn-secondary text-xs hidden sm:flex"
          >
            <RefreshCw size={16} className="mr-1.5" />
            生成账单
          </button>

          <button
            onClick={handleExportData}
            className="btn-secondary text-xs hidden sm:flex"
          >
            <Download size={16} className="mr-1.5" />
            导出数据
          </button>

          <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Bell size={20} className="text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Settings size={20} className="text-slate-600" />
          </button>

          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-sm ml-2">
            房
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
