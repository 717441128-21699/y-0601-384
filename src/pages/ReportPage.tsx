import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, PieChart, Download,
  Calendar, ChevronDown, Home, DollarSign, Building,
  FileSpreadsheet, CheckCircle, AlertTriangle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell,
  BarChart, Bar, Legend,
} from 'recharts';
import { useStore } from '../store/useStore';
import { formatCurrency, getPreviousMonths, getCurrentPeriod } from '../utils/date';
import { generateTrendData } from '../utils/finance';
import type { MonthlySummary, PropertyReport } from '../types';

const ReportPage: React.FC = () => {
  const {
    properties, bills, expenses, leases,
    getMonthlySummary, getPropertyReports,
    exportLedger, exportExpenses, exportAllData,
  } = useStore();

  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentPeriod());
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'property' | 'monthly'>('overview');

  const periods = useMemo(() => {
    const current = getCurrentPeriod();
    const future: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const [y, m] = current.split('-').map(Number);
      const d = new Date(y, m - 1 + i, 1);
      future.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return [...future.reverse(), current, ...getPreviousMonths(11)];
  }, []);

  const currentSummary = useMemo(() => {
    return getMonthlySummary(selectedPeriod);
  }, [selectedPeriod, getMonthlySummary]);

  const propertyReports = useMemo(() => {
    return getPropertyReports(selectedPeriod).sort((a, b) => b.netProfit - a.netProfit);
  }, [selectedPeriod, getPropertyReports]);

  const trendData = useMemo(() => {
    const months = getPreviousMonths(6, selectedPeriod);
    return months.map(month => {
      const summary = getMonthlySummary(month);
      return {
        month: month.slice(5) + '月',
        收入: summary.totalIncome,
        支出: summary.totalExpense,
        净利润: summary.netProfit,
      };
    });
  }, [getMonthlySummary, selectedPeriod]);

  const expenseBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    const periodExpenses = expenses.filter(e => {
      const expMonth = e.expenseDate.slice(0, 7);
      return expMonth === selectedPeriod;
    });

    periodExpenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });

    const colorMap: Record<string, string> = {
      maintenance: '#f97316',
      property: '#64748b',
      water: '#0ea5e9',
      electric: '#f59e0b',
      internet: '#8b5cf6',
      insurance: '#10b981',
      tax: '#ef4444',
      other: '#6b7280',
    };

    const labelMap: Record<string, string> = {
      maintenance: '维修',
      property: '物业',
      water: '水费',
      electric: '电费',
      internet: '网络',
      insurance: '保险',
      tax: '税费',
      other: '其他',
    };

    return Object.entries(categories).map(([key, value]) => ({
      name: labelMap[key] || key,
      value,
      color: colorMap[key] || '#6b7280',
    })).sort((a, b) => b.value - a.value);
  }, [expenses, selectedPeriod]);

  const yearlyData = useMemo(() => {
    const months = getPreviousMonths(12, selectedPeriod);
    return months.map(month => {
      const summary = getMonthlySummary(month);
      return {
        month: month.slice(5) + '月',
        收入: summary.totalIncome,
        支出: summary.totalExpense,
      };
    });
  }, [getMonthlySummary, selectedPeriod]);

  const yearlyTotal = useMemo(() => {
    const months = getPreviousMonths(12, selectedPeriod);
    let totalIncome = 0;
    let totalExpense = 0;
    let totalBillsPaid = 0;
    let totalBillsPending = 0;
    let totalBillsOverdue = 0;

    months.forEach(month => {
      const summary = getMonthlySummary(month);
      totalIncome += summary.totalIncome;
      totalExpense += summary.totalExpense;
      totalBillsPaid += summary.billsPaid;
      totalBillsPending += summary.billsPending;
      totalBillsOverdue += summary.billsOverdue;
    });

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      totalBillsPaid,
      totalBillsPending,
      totalBillsOverdue,
      avgMonthlyProfit: Math.round((totalIncome - totalExpense) / months.length),
      monthsCount: months.length,
    };
  }, [getMonthlySummary, selectedPeriod]);

  const handleExport = (type: 'ledger' | 'expenses' | 'all') => {
    if (type === 'ledger') exportLedger(selectedPeriod);
    else if (type === 'expenses') exportExpenses(selectedPeriod);
    else exportAllData();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-700 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">报表中心</h1>
          <p className="text-slate-500 text-sm mt-1">
            多维度收益分析，月度汇总，年度复盘
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            >
              <Calendar size={16} />
              {selectedPeriod.replace('-', '年')}月
              <ChevronDown size={16} />
            </button>
            {showPeriodDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[140px] z-20 max-h-[300px] overflow-y-auto">
                {periods.map((p) => (
                  <button
                    key={p}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                      selectedPeriod === p ? 'text-primary-600 bg-primary-50' : 'text-slate-700'
                    }`}
                    onClick={() => {
                      setSelectedPeriod(p);
                      setShowPeriodDropdown(false);
                    }}
                  >
                    {p.replace('-', '年')}月
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative group">
            <button className="btn-primary flex items-center gap-2">
              <Download size={16} />
              导出报表
            </button>
            <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[160px] z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                onClick={() => handleExport('ledger')}
              >
                <FileSpreadsheet size={14} />
                导出租金台账
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                onClick={() => handleExport('expenses')}
              >
                <Building size={14} />
                导出支出明细
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                onClick={() => handleExport('all')}
              >
                <Download size={14} />
                导出全部数据
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { id: 'overview', label: '总览', icon: BarChart3 },
          { id: 'property', label: '房源收益', icon: Home },
          { id: 'monthly', label: '年度复盘', icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? 'bg-primary-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">本月收入</p>
                  <p className="stat-value text-emerald-600">{formatCurrency(currentSummary.totalIncome)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp size={24} className="text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">本月支出</p>
                  <p className="stat-value text-rose-600">{formatCurrency(currentSummary.totalExpense)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                  <TrendingDown size={24} className="text-rose-600" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">本月净利润</p>
                  <p className={`stat-value ${
                    currentSummary.netProfit >= 0 ? 'text-primary-600' : 'text-rose-600'
                  }`}>
                    {formatCurrency(currentSummary.netProfit)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                  <DollarSign size={24} className="text-primary-600" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">入住率</p>
                  <p className="stat-value text-purple-600">{currentSummary.occupancyRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Home size={24} className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-6">
              <h3 className="font-semibold text-slate-800 mb-4">近6个月收支趋势</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `¥${v / 1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="收入" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="支出" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-slate-800 mb-4">本月支出构成</h3>
              {expenseBreakdown.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-slate-400">暂无支出数据</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">本月账单状态</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-emerald-50 rounded-xl">
                <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold text-emerald-600">{currentSummary.billsPaid}</p>
                <p className="text-sm text-slate-600">已收款</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-xl">
                <TrendingUp size={32} className="mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold text-amber-600">{currentSummary.billsPending}</p>
                <p className="text-sm text-slate-600">待收款</p>
              </div>
              <div className="text-center p-4 bg-rose-50 rounded-xl">
                <AlertTriangle size={32} className="mx-auto mb-2 text-rose-500" />
                <p className="text-2xl font-bold text-rose-600">{currentSummary.billsOverdue}</p>
                <p className="text-sm text-slate-600">已逾期</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'property' && (
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">房源收益排行</h3>
            <p className="text-sm text-slate-500 mt-1">按净利润降序排列</p>
          </div>
          <div className="p-6">
            <div className="h-[300px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={propertyReports} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `¥${v / 1000}k`} />
                  <YAxis type="category" dataKey="propertyName" stroke="#94a3b8" fontSize={12} width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="totalIncome" name="收入" fill="#10b981" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="totalExpense" name="支出" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="netProfit" name="净利润" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">房源名称</th>
                    <th className="table-header text-right">总收入</th>
                    <th className="table-header text-right">总支出</th>
                    <th className="table-header text-right">净利润</th>
                    <th className="table-header text-right">入住率</th>
                    <th className="table-header text-right">空置天数</th>
                    <th className="table-header text-right">投资回报率</th>
                  </tr>
                </thead>
                <tbody>
                  {propertyReports.map((report, index) => (
                    <tr key={report.propertyId} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-800">{report.propertyName}</span>
                        </div>
                      </td>
                      <td className="table-cell text-right font-medium text-emerald-600">
                        {formatCurrency(report.totalIncome)}
                      </td>
                      <td className="table-cell text-right font-medium text-rose-600">
                        {formatCurrency(report.totalExpense)}
                      </td>
                      <td className="table-cell text-right">
                        <span className={`font-bold ${
                          report.netProfit >= 0 ? 'text-primary-600' : 'text-rose-600'
                        }`}>
                          {formatCurrency(report.netProfit)}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        <span className="badge bg-purple-100 text-purple-700">
                          {report.occupancyRate}%
                        </span>
                      </td>
                      <td className="table-cell text-right text-slate-600">
                        {report.vacantDays} 天
                      </td>
                      <td className="table-cell text-right">
                        <span className={`font-medium ${
                          report.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {report.roi.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="stat-card bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label text-emerald-700">年度总收入</p>
                  <p className="stat-value text-emerald-600">{formatCurrency(yearlyTotal.totalIncome)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center">
                  <TrendingUp size={24} className="text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="stat-card bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label text-rose-700">年度总支出</p>
                  <p className="stat-value text-rose-600">{formatCurrency(yearlyTotal.totalExpense)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-200 flex items-center justify-center">
                  <TrendingDown size={24} className="text-rose-600" />
                </div>
              </div>
            </div>

            <div className="stat-card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label text-primary-700">年度净利润</p>
                  <p className="stat-value text-primary-600">{formatCurrency(yearlyTotal.netProfit)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-200 flex items-center justify-center">
                  <DollarSign size={24} className="text-primary-600" />
                </div>
              </div>
            </div>

            <div className="stat-card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label text-purple-700">月均净利润</p>
                  <p className="stat-value text-purple-600">{formatCurrency(yearlyTotal.avgMonthlyProfit)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-200 flex items-center justify-center">
                  <Calendar size={24} className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 mb-6">
            <h3 className="font-semibold text-slate-800 mb-4">年度收支走势</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyData}>
                  <defs>
                    <linearGradient id="colorIncomeYear" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenseYear" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `¥${v / 1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="收入" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncomeYear)" />
                  <Area type="monotone" dataKey="支出" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenseYear)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="card p-6 text-center">
              <CheckCircle size={40} className="mx-auto mb-3 text-emerald-500" />
              <p className="text-3xl font-bold text-emerald-600">{yearlyTotal.totalBillsPaid}</p>
              <p className="text-slate-600 mt-1">已收账单</p>
              <p className="text-sm text-slate-500 mt-2">
                平均每月 {Math.round(yearlyTotal.totalBillsPaid / 12)} 笔
              </p>
            </div>

            <div className="card p-6 text-center">
              <AlertTriangle size={40} className="mx-auto mb-3 text-amber-500" />
              <p className="text-3xl font-bold text-amber-600">{yearlyTotal.totalBillsPending}</p>
              <p className="text-slate-600 mt-1">待收账单</p>
              <p className="text-sm text-slate-500 mt-2">
                需要及时跟进催收
              </p>
            </div>

            <div className="card p-6 text-center">
              <AlertTriangle size={40} className="mx-auto mb-3 text-rose-500" />
              <p className="text-3xl font-bold text-rose-600">{yearlyTotal.totalBillsOverdue}</p>
              <p className="text-slate-600 mt-1">逾期账单</p>
              <p className="text-sm text-slate-500 mt-2">
                需要重点关注
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportPage;
