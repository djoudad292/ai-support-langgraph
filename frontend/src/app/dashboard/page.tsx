'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp, MessageSquare, Users, Calendar, Bot } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, truncate } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
}

function StatCard({ title, value, icon, change }: StatCardProps) {
  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</CardTitle>
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        {change && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{change}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalLeads: 0,
    totalAppointments: 0,
    aiHandled: 0,
    humanHandled: 0,
  });
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsRes, convsRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/chat/conversations?limit=5'),
        ]);
        setStats(analyticsRes.data);
        setRecentConversations(convsRes.data.items || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of your AI customer support platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Conversations"
          value={stats.totalConversations}
          icon={<MessageSquare className="w-6 h-6 text-blue-600" />}
        />
        <StatCard
          title="Leads Captured"
          value={stats.totalLeads}
          icon={<Users className="w-6 h-6 text-green-600" />}
        />
        <StatCard
          title="Appointments Booked"
          value={stats.totalAppointments}
          icon={<Calendar className="w-6 h-6 text-purple-600" />}
        />
        <StatCard
          title="AI Handled"
          value={stats.aiHandled}
          icon={<Bot className="w-6 h-6 text-orange-600" />}
        />
        <StatCard
          title="Human Handled"
          value={stats.humanHandled}
          icon={<TrendingUp className="w-6 h-6 text-red-600" />}
        />
      </div>

      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {recentConversations.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No conversations yet</p>
          ) : (
            <div className="space-y-4">
              {recentConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {conv.title || 'Untitled Conversation'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      Status: {conv.status} • {conv.department ? `Dept: ${conv.department}` : 'No department'}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                    {formatDate(conv.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}