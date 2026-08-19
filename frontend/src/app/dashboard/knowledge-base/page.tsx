'use client';

import { useEffect, useState } from 'react';
import { Plus, FileText, Search, Trash2, Edit, Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { formatDate, truncate } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  content: string;
  status: string;
  published: boolean;
  filename: string | null;
  mime: string | null;
  size_bytes: number;
  page_count: number;
  created_at: string;
  updated_at: string;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const { data } = await api.get('/knowledge-base?limit=50');
      setDocuments(data.items || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      if (editDoc) {
        await api.patch(`/knowledge-base/${editDoc.id}`, { title });
      } else {
        await api.post('/knowledge-base', { title, content });
      }
      setShowModal(false);
      setEditDoc(null);
      setTitle('');
      setContent('');
      fetchDocuments();
    } catch (err) {
      console.error('Failed to save document:', err);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/knowledge-base/${id}`);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      const { data } = await api.post('/knowledge-base', { title: file.name, content: '' });
      // Note: In production, you'd upload the file content differently
      fetchDocuments();
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function openEdit(doc: Document) {
    setEditDoc(doc);
    setTitle(doc.title);
    setContent('');
    setShowModal(true);
  }

  function openCreate() {
    setEditDoc(null);
    setTitle('');
    setContent('');
    setShowModal(true);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready': return <Badge variant="success">{status}</Badge>;
      case 'processing': return <Badge variant="warning">{status}</Badge>;
      case 'error': return <Badge variant="danger">{status}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage documents for AI-powered responses</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Document</Button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search documents..."
          className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">Loading...</div>
      ) : documents.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No documents yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Add documents to enable AI-powered responses</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate max-w-[300px]">{doc.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(doc.status)}
                        {doc.published && <Badge variant="default">Published</Badge>}
                        {!doc.published && <Badge variant="secondary">Draft</Badge>}
                        {doc.filename && <Badge variant="secondary">{doc.filename}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                      {doc.size_bytes > 0 ? `${(doc.size_bytes / 1024).toFixed(1)} KB` : `${doc.content.length} chars`}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(doc)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editDoc ? 'Edit Document' : 'New Document'}</h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowModal(false); setEditDoc(null); }}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="Enter document content..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditDoc(null); }}>Cancel</Button>
                <Button type="submit" disabled={uploading}>{uploading ? 'Saving...' : 'Save'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}