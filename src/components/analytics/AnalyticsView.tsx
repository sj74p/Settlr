import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { useSettlrStore } from '../../stores/useSettlrStore';
import { PieChart as PieChartIcon, BarChart3, TrendingUp, DollarSign } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AnalyticsView: React.FC = () => {
  const { groups, activeGroupId, expenses } = useSettlrStore();
  const group = groups.find(g => g.id === activeGroupId);

  // 1. Category Data for Pie Chart
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    expenses.forEach(exp => {
      counts[exp.category] = (counts[exp.category] || 0) + exp.amount;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // 2. Spending per Member for Bar Chart
  const memberData = useMemo(() => {
    if (!group) return [];
    const spending: Record<string, number> = {};
    group.members.forEach(m => spending[m.id] = 0);
    
    expenses.forEach(exp => {
      if (spending[exp.paidBy] !== undefined) {
        spending[exp.paidBy] += exp.amount;
      }
    });

    return group.members.map(m => ({
      name: m.displayName,
      amount: spending[m.id]
    }));
  }, [group, expenses]);

  // 3. Monthly Trends for Line Chart
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(exp => {
      const month = new Date(exp.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[month] = (months[month] || 0) + exp.amount;
    });
    return Object.entries(months).map(([name, amount]) => ({ name, amount }));
  }, [expenses]);

  const totalSpent = useMemo(() => expenses.reduce((sum, exp) => sum + exp.amount, 0), [expenses]);

  if (!group) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-slate-500">Total Group Spending</span>
          </div>
          <div className="text-3xl font-black">${totalSpent.toFixed(2)}</div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
              <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-sm font-bold text-slate-500">Average per Member</span>
          </div>
          <div className="text-3xl font-black">
            ${(totalSpent / (group.members.length || 1)).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary-500" />
            Spending by Category
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-secondary-500" />
            Total Spent per Member
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Spending Trend
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
              <YAxis axisLine={false} tickLine={false} fontSize={12} />
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#10b981" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
