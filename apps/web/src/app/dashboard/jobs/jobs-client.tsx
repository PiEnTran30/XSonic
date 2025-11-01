'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle, XCircle, Loader2, Download, Trash2, ArrowLeft } from 'lucide-react';

interface Job {
  id: string;
  tool_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  credits_cost?: number;
  input_params?: any;
  output_url?: string;
  error?: string;
  progress?: number;
}

interface JobsClientProps {
  initialJobs: Job[];
}

export default function JobsClient({ initialJobs }: JobsClientProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Đang chờ' },
    processing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Đang xử lý' },
    completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Hoàn thành' },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Thất bại' },
  } as const;

  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const toggleAllJobs = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map(j => j.id)));
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa job này? Hành động này không thể hoàn tác.')) {
      return;
    }

    setDeletingJobId(jobId);
    try {
      const response = await fetch('/api/jobs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete job');
      }

      setJobs(jobs.filter(j => j.id !== jobId));
      selectedJobs.delete(jobId);
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Không thể xóa job. Vui lòng thử lại.');
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedJobs.size === 0) {
      alert('Vui lòng chọn ít nhất một job để xóa');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedJobs.size} job? Hành động này không thể hoàn tác.`)) {
      return;
    }

    for (const jobId of selectedJobs) {
      await handleDeleteJob(jobId);
    }
    setSelectedJobs(new Set());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-white/20"></div>
            <h1 className="text-2xl font-bold">Lịch sử Jobs</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {jobs && jobs.length > 0 ? (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedJobs.size === jobs.length && jobs.length > 0}
                  onChange={toggleAllJobs}
                  className="w-5 h-5 rounded border-white/30 bg-white/10 cursor-pointer"
                  title="Chọn tất cả"
                />
                <span className="text-sm text-gray-400">
                  {selectedJobs.size > 0 ? `Đã chọn ${selectedJobs.size}/${jobs.length}` : `${jobs.length} jobs`}
                </span>
              </div>
              {selectedJobs.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa {selectedJobs.size} job
                </button>
              )}
            </div>

            {/* Jobs List */}
            {jobs.map((job) => {
              const status = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.pending;
              const Icon = status.icon;
              const isSelected = selectedJobs.has(job.id);
              const jobClassName = isSelected ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10';

              return (
                <div
                  key={job.id}
                  className={`group p-6 bg-gradient-to-r from-white/5 to-white/10 border rounded-xl hover:border-white/20 hover:bg-white/15 transition-all duration-300 ${jobClassName}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleJobSelection(job.id)}
                        className="w-5 h-5 rounded border-white/30 bg-white/10 cursor-pointer mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold capitalize">{job.tool_id}</h3>
                          <div className={`flex items-center gap-2 px-3 py-1 ${status.bg} rounded-full`}>
                            <Icon className={`h-4 w-4 ${status.color} ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          Job ID: {job.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {new Date(job.created_at).toLocaleString('vi-VN')}
                        </div>
                        {job.credits_cost && (
                          <div className="text-sm font-medium text-yellow-400 mt-1">
                            {job.credits_cost} credits
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        disabled={deletingJobId === job.id}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Xóa job"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {job.input_params && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-400 mb-2">Input:</div>
                      <div className="text-sm bg-black/30 rounded-lg p-3 font-mono">
                        {job.input_params.file_url && (
                          <div>File: {job.input_params.file_url.split('/').pop()}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {job.status === 'completed' && job.output_url && (
                    <div className="flex items-center gap-2">
                      <a
                        href={job.output_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span>Tải xuống kết quả</span>
                      </a>
                    </div>
                  )}

                  {job.status === 'failed' && job.error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="text-sm text-red-400">
                        Lỗi: {job.error}
                      </div>
                    </div>
                  )}

                  {job.progress !== null && job.progress !== undefined && job.status === 'processing' && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">Tiến độ</span>
                        <span className="font-medium">{job.progress}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-2xl font-bold mb-2">Chưa có jobs nào</h2>
            <p className="text-gray-400 mb-8">Upload file và chọn công cụ để bắt đầu xử lý</p>
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-bold transition-all"
            >
              Chọn công cụ
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

