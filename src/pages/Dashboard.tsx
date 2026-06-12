import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Home, Users, Receipt, AlertTriangle,
  Plus, ArrowRight, DollarSign, HomeIcon, CalendarClock, FileText
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useStore } from '../store/useStore';
import { formatCurrency, formatCurrencyShort, getCurrentPeriod, getPreviousMonths, formatMonth } from '../utils/date';
import { generateTrendData } from '../utils/finance';
import { getBillStatusColor, getBillStatusLabel } from '../utils/finance';

const Dashboard: React.FC = () => {
  const {
    properties, tenants, bills, expenses, leases, transactions, reminders,
    getMonthlySummary, getPropertyReports
  } = useStore();

  const currentPeriod = getCurrentPeriod();
  const months = getPreviousMonths(6);

  const monthlySummary = useMemo(() => getMonthlySummary(currentPeriod), [getMonthlySummary, currentPeriod]);
  const propertyReports = useMemo(() => getPropertyReports(currentPeriod), [getPropertyReports, currentPeriod]);

  const trendData = generateTrendData(months, bills, expenses, leases, properties);

  const totalIncome = trendData.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = trendData.reduce((sum, d) => sum + d.expense, 0);
  const totalProfit = trendData.reduce((sum, d) => sum + d.profit, 0);

  const pendingBills = bills.filter(b => b.status === 'pending').length;
  const overdueBills = bills.filter(b => b.status === 'overdue').length;
  const paidBills = bills.filter(b => b.status === 'paid').length;

  const activeLeases = leases.filter(l => l.status === 'active').length;
  const occupancyRate = properties.length > 0 ? (activeLeases / properties.length) * 100 : 0;

  const recentTransactions = transactions.slice(0, 5);

  const recentReminders = reminders
    .filter(r => !r.isCompleted)
    .slice(0, 3);

  const pieData = [
    { name: '已支付', value: paidBills, color: '#10B981' },
    { name: '待支付', value: pendingBills, color: '#F59E0B' },
    { name: '已逾期', value: overdueBills, color: '#F43F5E' },
  ];

  const quickActions = [
    { label: '新增房源', icon: HomeIcon, path: '/properties', color: 'bg-blue' },
    { label: '新增租客', icon: Users, path: '/tenants', color: 'bg-emerald' },
    { label: '登记收入', icon: DollarSign, path: '/bills', color: 'bg-amber' },
    { label: '登记支出', icon: FileText, path: '/bills', color: 'bg-rose' },
  ];

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">数据概览</h1>
          <p className="text-slate-500 text-sm mt-1">
            {formatMonth(currentPeriod)} 经营数据一览
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card animate-slide-up animate-stagger-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">本月收入</p>
              <p className="stat-value text-emerald-600">
                {formatCurrencyShort(monthlySummary.totalIncome)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-emerald-600 font-medium">+12.5%</span>
            <span className="text-slate-400 ml-2">较上月</span>
          </div>
        </div>

        <div className="stat-card animate-slide-up animate-stagger-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">本月支出</p>
              <p className="stat-value text-rose-600">
                {formatCurrencyShort(monthlySummary.totalExpense)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
              <TrendingDown size={20} className="text-rose-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-emerald-600 font-medium">-5.2%</span>
            <span className="text-slate-400 ml-2">较上月</span>
          </div>
        </div>

        <div className="stat-card animate-slide-up animate-stagger-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">净利润</p>
              <p className="stat-value text-primary-700">
                {formatCurrencyShort(monthlySummary.netProfit)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <DollarSign size={20} className="text-primary-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-emerald-600 font-medium">+18.3%</span>
            <span className="text-slate-400 ml-2">较上月</span>
          </div>
        </div>

        <div className="stat-card animate-slide-up animate-stagger-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">入住率</p>
              <p className="stat-value text-amber-600">
                {occupancyRate.toFixed(0)}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Home size={20} className="text-amber-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <span className="text-slate-500">
              {activeLeases}/{properties.length} 套在租
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5 lg:col-span-2 animate-slide-up animate-stagger-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">收益趋势</h3>
            <div className="flex gap-2">
              {['6个月', '12个月'].map((period, idx) => (
                <button
                  key={period}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    idx === 0
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `¥${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                  strokeWidth={2}
                  name="收入"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#F43F5E"
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                  strokeWidth={2}
                  name="支出"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 animate-slide-up animate-stagger-6">
          <h3 className="section-title mb-4">账单状态</h3>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} 条`]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-800">{item.value} 条</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="section-title">房源收益排行</h3>
          <div className="space-y-3">
            {propertyReports.slice(0, 3).map((report, index) => (
              <div
                key={report.propertyId}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{report.propertyName}</p>
                    <p className="text-xs text-slate-500">
                      入住率 {report.occupancyRate.toFixed(0)}% | 空置 {report.vacantDays} 天
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-600">
                    {formatCurrencyShort(report.netProfit)}
                  </p>
                  <p className="text-xs text-slate-500">净利润</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">快捷操作</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.path}
                  className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Icon size={20} className="text-primary-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">待办提醒</h3>
            <Link to="/reminders" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentReminders.length > 0 ? (
              recentReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-3 rounded-lg border-l-4 border-amber-400 bg-amber-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{reminder.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{reminder.content}</p>
                    </div>
                    {!reminder.isRead && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <CalendarClock size={32} className="mx-auto mb-2 opacity-50" />
                <p>暂无待办事项</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">最近交易</h3>
            <Link to="/reconciliation" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      transaction.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'
                    }`}
                  >
                    {transaction.type === 'income' ? (
                      <TrendingUp size={18} className="text-emerald-600" />
                    ) : (
                      <TrendingDown size={18} className="text-rose-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{transaction.description}</p>
                    <p className="text-xs text-slate-500">
                      {transaction.transactionDate} · {transaction.bank}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrencyShort(transaction.amount)}
                  </p>
                  {transaction.isSuspected && (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle size={12} /> 待核对
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
