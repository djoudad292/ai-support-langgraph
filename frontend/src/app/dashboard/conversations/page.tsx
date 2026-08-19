'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, MoreVertical, Bot, User, AlertCircle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { formatDate, truncate } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  status: string;
  department: string | null;
  handled_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    async function fetchConversations() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (statusFilter !== 'all') params.append('status', statusFilter);
        const { data } = await api.get(`/chat/conversations?${params}`);
        setConversations(data.items || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, [page, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">{status}</Badge>;
      case 'escalated': return <Badge variant="warning">{status}</Badge>;
      case 'closed': return <Badge variant="secondary">{status}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getHandledByBadge = (handledBy: string | null) => {
    if (!handledBy) return <Badge variant="secondary">Unassigned</Badge>;
    return handledBy === 'ai' ? (
      <Badge variant="default"><Bot className="w-3 h-3 mr-1" /> AI</Badge>
    ) : (
      <Badge variant="secondary"><User className="w-3 h-3 mr-1" /> Human</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Conversations</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and monitor all customer conversations</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">Loading...</div>
      ) : conversations.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No conversations found</h3>
            <p className="text-gray-500 dark:text-gray-400">Conversations will appear here when customers start chatting</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Card key={conv.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate max-w-[300px]">
                          {conv.title || 'Untitled Conversation'}
                        </h3>
                        {getStatusBadge(conv.status)}
                        {conv.department && <Badge variant="secondary">{conv.department}</Badge>}
                        {getHandledByBadge(conv.handled_by)}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[400px]">
                        Created: {formatDate(conv.created_at)} • Updated: {formatDate(conv.updated_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="flex items-center gap-1">
                        <MoreVertical className="w-4 h-4" />
                        <span>Actions</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {total > limit && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
                disabled={page >= Math.ceil(total / limit)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}