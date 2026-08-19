'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, MessageSquare, Users, Calendar, Bot, BarChart2, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Analytics {
  totalConversations: number;
  totalLeads: number;
  totalAppointments: number;
  aiHandled: number;
  humanHandled: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalConversations: 0,
    totalLeads: 0,
    totalAppointments: 0,
    aiHandled: 0,
    humanHandled: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const { data } = await api.get('/analytics/summary');
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const stats = [
    { label: 'Total Conversations', value: analytics.totalConversations, icon: MessageSquare, color: 'text-blue-600' },
    { label: 'Leads Captured', value: analytics.totalLeads, icon: Users, color: 'text-green-600' },
    { label: 'Appointments Booked', value: analytics.totalAppointments, icon: Calendar, color: 'text-purple-600' },
    { label: 'AI Handled', value: analytics.aiHandled, icon: Bot, color: 'text-orange-600' },
    { label: 'Human Handled', value: analytics.humanHandled, icon: TrendingUp, color: 'text-red-600' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Platform performance overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</CardTitle>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Conversation Handling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">AI Handled</span>
                  <span className="font-medium">{analytics.aiHandled}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${analytics.totalConversations > 0 ? (analytics.aiHandled / analytics.totalConversations) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Human Handled</span>
                  <span className="font-medium">{analytics.humanHandled}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all"
                    style={{ width: `${analytics.totalConversations > 0 ? (analytics.humanHandled / analytics.totalConversations) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total: {analytics.totalConversations} conversations
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Conversion Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-600">{analytics.totalLeads}</div>
                  <div className="text-sm text-gray-500">Leads</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">{analytics.totalAppointments}</div>
                  <div className="text-sm text-gray-500">Appointments</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600">
                    {analytics.totalConversations > 0
                      ? ((analytics.totalLeads / analytics.totalConversations) * 100).toFixed(1) + '%'
                      : '0%'}
                  </div>
                  <div className="text-sm text-gray-500">Lead Rate</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}