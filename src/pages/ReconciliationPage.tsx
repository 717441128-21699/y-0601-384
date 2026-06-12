import React, { useState, useMemo } from 'react';
import {
  Link2, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  Search, Filter, ChevronDown, RefreshCw, FileText,
  Home, User, Calendar, DollarSign, Info,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency, getCurrentPeriod, getPreviousMonths } from '../utils/date';
import { getBillStatusLabel, getBillStatusColor, getLeaseByBill, getTenantByLease, getPropertyByLease } from '../utils/finance';
import type { Bill, Transaction } from '../types';

const ReconciliationPage: React.FC = () => {
  const {
    bills, transactions, leases, tenants, properties,
    autoMatchAll, reconcileTransaction, updateTransaction,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>(getCurrentPeriod());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState<Bill | null>(null);

  const periods = useMemo(() => {
    return [getCurrentPeriod(), ...getPreviousMonths(5)];
  }, []);

  const periodBills = useMemo(() => {
    return bills.filter(b => b.period === periodFilter);
  }, [bills, periodFilter]);

  const periodTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tMonth = t.transactionDate.slice(0, 7);
      return tMonth === periodFilter && t.type === 'income';
    });
  }, [transactions, periodFilter]);

  const filteredBills = useMemo(() => {
    return periodBills.filter((bill) => {
      if (statusFilter === 'matched' && bill.status !== 'paid') return false;
      if (statusFilter === 'unmatched' && bill.status === 'paid') return false;
      if (statusFilter === 'overdue' && bill.status !== 'overdue') return false;
      if (statusFilter === 'partial' && bill.status !== 'partial') return false;

      const lease = getLeaseByBill(bill, leases);
      const tenant = lease ? getTenantByLease(lease, tenants) : null;
      const property = lease ? getPropertyByLease(lease, properties) : null;

      const searchLower = searchQuery.toLowerCase();
      return (
        tenant?.name.toLowerCase().includes(searchLower) ||
        property?.name.toLowerCase().includes(searchLower) ||
        bill.totalAmount.toString().includes(searchQuery)
      );
    });
  }, [periodBills, leases, tenants, properties, searchQuery, statusFilter]);

  const unmatchedTransactions = useMemo(() => {
    return periodTransactions.filter(t => !t.isMatched);
  }, [periodTransactions]);

  const stats = useMemo(() => {
    const totalBills = periodBills.length;
    const paidBills = periodBills.filter(b => b.status === 'paid').length;
    const unpaidBills = totalBills - paidBills;
    const totalReceivable = periodBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalReceived = periodBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalUnmatched = unmatchedTransactions.length;
    const unmatchedAmount = unmatchedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const reconciliationRate = totalBills > 0 ? Math.round((paidBills / totalBills) * 100) : 0;

    const anomalies = periodBills.filter(bill => {
      if (bill.status !== 'paid' || !bill.paidAmount) return false;
      const diff = Math.abs(bill.totalAmount - bill.paidAmount);
      return diff > 0 && (diff / bill.totalAmount) > 0.1;
    }).length;

    return {
      totalBills,
      paidBills,
      unpaidBills,
      totalReceivable,
      totalReceived,
      totalUnmatched,
      unmatchedAmount,
      reconciliationRate,
      anomalies,
    };
  }, [periodBills, unmatchedTransactions]);

  const handleAutoMatch = () => {
    const count = autoMatchAll();
    alert(`成功自动匹配 ${count} 笔交易`);
  };

  const handleManualMatch = (bill: Bill, transaction: Transaction) => {
    reconcileTransaction(transaction.id, bill.id);
    setShowMatchModal(null);
  };

  const getMatchedTransaction = (bill: Bill) => {
    return transactions.find(t => t.matchedBillId === bill.id);
  };

  return (
    <div className="content-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">对账管理</h1>
          <p className="text-slate-500 text-sm mt-1">
            核对账单与银行流水，确保每笔租金都准确到账
          </p>
        </div>
        <button className="btn-primary" onClick={handleAutoMatch}>
          <RefreshCw size={16} className="mr-2" />
          一键自动对账
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">应收账单</p>
              <p className="stat-value text-slate-800">{stats.totalBills}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <FileText size={20} className="text-primary-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">已对账</p>
              <p className="stat-value text-emerald-600">{stats.paidBills}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">待对账</p>
              <p className="stat-value text-amber-600">{stats.unpaidBills}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Link2 size={20} className="text-amber-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">对账率</p>
              <p className="stat-value text-primary-600">{stats.reconciliationRate}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-primary-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">未匹配流水</p>
              <p className="stat-value text-rose-600">{stats.totalUnmatched}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <XCircle size={20} className="text-rose-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">金额异常</p>
              <p className="stat-value text-rose-600">{stats.anomalies}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">应收 vs 实收</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">应收总额</span>
                <span className="font-medium text-slate-700">{formatCurrency(stats.totalReceivable)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-300 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">实收总额</span>
                <span className="font-medium text-emerald-600">{formatCurrency(stats.totalReceived)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.reconciliationRate}%` }}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">差额</span>
                <span className={`font-bold ${
                  stats.totalReceivable - stats.totalReceived > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {stats.totalReceivable - stats.totalReceived > 0 ? '-' : '+'}
                  {formatCurrency(Math.abs(stats.totalReceivable - stats.totalReceived))}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">未匹配的收入流水</h3>
          {unmatchedTransactions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={32} className="mx-auto mb-2 text-emerald-300" />
              <p className="text-slate-500">太棒了！所有流水都已匹配</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {unmatchedTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 bg-rose-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-800">{t.description}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(t.transactionDate)} · {t.bank}
                    </p>
                  </div>
                  <span className="font-bold text-emerald-600">+{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {unmatchedTransactions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">合计未匹配金额</span>
                <span className="font-bold text-rose-600">{formatCurrency(stats.unmatchedAmount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-slate-50 mb-6">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-primary-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-slate-800 mb-2">对账说明</h4>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>已对账：账单已匹配到对应的银行流水</span>
              </div>
              <div className="flex items-center gap-2">
                <Link2 size={14} className="text-amber-500" />
                <span>待对账：账单尚未匹配银行流水</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-500" />
                <span>金额异常：实收金额与应收偏差超过 10%</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-rose-500" />
                <span>未匹配流水：收入流水未关联到任何账单</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索租客姓名、房源名称、金额..."
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2 min-w-[140px]"
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            >
              <Calendar size={16} />
              {periodFilter.replace('-', '年')}月
              <ChevronDown size={16} />
            </button>
            {showPeriodDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[140px] z-20">
                {periods.map((p) => (
                  <button
                    key={p}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                      periodFilter === p ? 'text-primary-600 bg-primary-50' : 'text-slate-700'
                    }`}
                    onClick={() => {
                      setPeriodFilter(p);
                      setShowPeriodDropdown(false);
                    }}
                  >
                    {p.replace('-', '年')}月
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2 min-w-[140px]"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <Filter size={16} />
              {statusFilter === 'all' ? '全部状态' :
               statusFilter === 'matched' ? '已对账' :
               statusFilter === 'unmatched' ? '待对账' :
               statusFilter === 'overdue' ? '已逾期' : '部分收款'}
              <ChevronDown size={16} />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[140px] z-20">
                {[
                  { value: 'all', label: '全部状态' },
                  { value: 'matched', label: '已对账' },
                  { value: 'unmatched', label: '待对账' },
                  { value: 'overdue', label: '已逾期' },
                  { value: 'partial', label: '部分收款' },
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                      statusFilter === option.value ? 'text-primary-600 bg-primary-50' : 'text-slate-700'
                    }`}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setShowStatusDropdown(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">账单信息</th>
                <th className="table-header">租客/房源</th>
                <th className="table-header">应收金额</th>
                <th className="table-header">实收金额</th>
                <th className="table-header">匹配流水</th>
                <th className="table-header">状态</th>
                <th className="table-header text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill, index) => {
                const lease = getLeaseByBill(bill, leases);
                const tenant = lease ? getTenantByLease(lease, tenants) : null;
                const property = lease ? getPropertyByLease(lease, properties) : null;
                const matchedTransaction = getMatchedTransaction(bill);
                const hasAmountDiff = bill.paidAmount && bill.paidAmount !== bill.totalAmount;

                return (
                  <tr
                    key={bill.id}
                    className={`hover:bg-slate-50 transition-colors animate-slide-up ${
                      hasAmountDiff ? 'bg-amber-50/50' : ''
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          bill.status === 'paid' ? 'bg-emerald-100' :
                          bill.status === 'overdue' ? 'bg-rose-100' : 'bg-amber-100'
                        }`}>
                          <FileText size={16} className={`
                            ${bill.status === 'paid' ? 'text-emerald-600' :
                              bill.status === 'overdue' ? 'text-rose-600' : 'text-amber-600'}
                          `} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{bill.period.replace('-', '年')}月</p>
                          <p className="text-xs text-slate-500">
                            截止：{formatDate(bill.dueDate)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User size={14} className="text-slate-400" />
                          <span className="font-medium text-slate-800">{tenant?.name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Home size={12} className="text-slate-400" />
                          <span>{property?.name || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-bold text-slate-800">{formatCurrency(bill.totalAmount)}</span>
                    </td>
                    <td className="table-cell">
                      {bill.paidAmount ? (
                        <div>
                          <span className={`font-bold ${
                            hasAmountDiff ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {formatCurrency(bill.paidAmount)}
                          </span>
                          {hasAmountDiff && (
                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} />
                              差额 {formatCurrency(Math.abs(bill.totalAmount - bill.paidAmount))}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {matchedTransaction ? (
                        <div>
                          <p className="text-sm text-slate-700">{matchedTransaction.description}</p>
                          <p className="text-xs text-slate-500">
                            {formatDate(matchedTransaction.transactionDate)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">未匹配</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${getBillStatusColor(bill.status)}`}>
                        {getBillStatusLabel(bill.status)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        {bill.status !== 'paid' && unmatchedTransactions.length > 0 && (
                          <button
                            onClick={() => setShowMatchModal(bill)}
                            className="p-2 rounded-lg hover:bg-primary-50 transition-colors"
                            title="手动匹配"
                          >
                            <Link2 size={16} className="text-primary-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredBills.length === 0 && (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">暂无账单记录</p>
          </div>
        )}
      </div>

      {showMatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">匹配银行流水</h2>
              <button
                onClick={() => setShowMatchModal(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <p className="text-sm text-slate-600 mb-1">当前账单：</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">
                    {showMatchModal.period.replace('-', '年')}月账单
                  </span>
                  <p className="text-xs text-slate-500">
                    {tenants.find(t => {
                      const lease = leases.find(l => l.id === showMatchModal.leaseId);
                      return lease?.tenantId === t.id;
                    })?.name} · {properties.find(p => {
                      const lease = leases.find(l => l.id === showMatchModal.leaseId);
                      return lease?.propertyId === p.id;
                    })?.name}
                  </p>
                </div>
                <span className="font-bold text-slate-800">
                  {formatCurrency(showMatchModal.totalAmount)}
                </span>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <p className="text-sm font-medium text-slate-700 mb-3">选择要匹配的流水：</p>
              <div className="space-y-3">
                {unmatchedTransactions.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">暂无可匹配的流水</p>
                ) : (
                  unmatchedTransactions.map((transaction) => {
                    const diff = Math.abs(showMatchModal.totalAmount - transaction.amount);
                    const isAmountMatch = diff / showMatchModal.totalAmount < 0.1;

                    return (
                      <div
                        key={transaction.id}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isAmountMatch
                            ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                            : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50'
                        }`}
                        onClick={() => handleManualMatch(showMatchModal, transaction)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">
                              {transaction.description}
                            </span>
                            {isAmountMatch && (
                              <span className="badge bg-emerald-100 text-emerald-700 text-xs">
                                金额匹配
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-emerald-600">
                            +{formatCurrency(transaction.amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{formatDate(transaction.transactionDate)}</span>
                          <span>·</span>
                          <span>{transaction.bank}</span>
                        </div>
                        {diff > 0 && (
                          <p className="text-xs text-slate-500 mt-2">
                            差额：{diff > 0 ? '+' : ''}{formatCurrency(transaction.amount - showMatchModal.totalAmount)}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200">
              <button
                className="btn-secondary w-full"
                onClick={() => setShowMatchModal(null)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationPage;
