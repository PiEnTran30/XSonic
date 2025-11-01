"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Server, Plus, Play, Square, Trash2, RefreshCw, Activity } from "lucide-react";

interface GPUWorker {
  id: string;
  name: string;
  provider: string;
  status: string;
  host: string;
  port: number;
  ssh_port?: number;
  web_terminal_port?: number;
  gpu_model?: string;
  gpu_count?: number;
  cpu_cores?: number;
  ram_gb?: number;
  storage_gb?: number;
  price_per_hour?: number;
  currency?: string;
  last_heartbeat?: string;
  rented_until?: string;
  created_at: string;
}

export default function GPUWorkersPage() {
  const [workers, setWorkers] = useState<GPUWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchWorkers = async () => {
    try {
      const res = await fetch("/api/admin/gpu-workers");
      const data = await res.json();
      if (data.workers) {
        setWorkers(data.workers);
      }
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchWorkers, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/gpu-workers/${id}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Worker started");
        fetchWorkers();
      } else {
        alert(data.error || "Failed to start worker");
      }
    } catch (error) {
      alert("Failed to start worker");
    }
  };

  const handleStop = async (id: string) => {
    if (!confirm("Are you sure you want to stop this worker?")) return;
    
    try {
      const res = await fetch(`/api/admin/gpu-workers/${id}/stop`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Worker stopped");
        fetchWorkers();
      } else {
        alert(data.error || "Failed to stop worker");
      }
    } catch (error) {
      alert("Failed to stop worker");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this worker?")) return;
    
    try {
      const res = await fetch(`/api/admin/gpu-workers/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Worker deleted");
        fetchWorkers();
      } else {
        alert("Failed to delete worker");
      }
    } catch (error) {
      alert("Failed to delete worker");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "stopped":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "starting":
      case "stopping":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "error":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatTimeRemaining = (rentedUntil?: string) => {
    if (!rentedUntil) return "N/A";
    const now = new Date();
    const end = new Date(rentedUntil);
    const diff = end.getTime() - now.getTime();
    if (diff < 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
                ← Admin
              </Link>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🖥️ GPU Workers
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchWorkers}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg transition-all flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add GPU Worker
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-400">Loading workers...</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-12">
            <Server className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No GPU Workers</h3>
            <p className="text-gray-400 mb-6">Add your first GPU worker to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg transition-all"
            >
              Add GPU Worker
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="p-6 bg-white/5 border border-white/10 rounded-xl hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <Server className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{worker.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="font-mono">{worker.host}:{worker.port}</span>
                        </span>
                        <span>•</span>
                        <span className="capitalize">{worker.provider}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(worker.status)}`}>
                      {worker.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">GPU</p>
                    <p className="font-medium">{worker.gpu_model || "N/A"} x{worker.gpu_count || 1}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">CPU/RAM</p>
                    <p className="font-medium">{worker.cpu_cores || "N/A"} cores / {worker.ram_gb || "N/A"} GB</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Price</p>
                    <p className="font-medium">{worker.price_per_hour || "N/A"} {worker.currency || "VND"}/h</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Time Remaining</p>
                    <p className="font-medium">{formatTimeRemaining(worker.rented_until)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {worker.ssh_port && (
                      <span>SSH: {worker.ssh_port}</span>
                    )}
                    {worker.web_terminal_port && (
                      <span>Terminal: {worker.web_terminal_port}</span>
                    )}
                    {worker.last_heartbeat && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Last seen: {new Date(worker.last_heartbeat).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {worker.status === "stopped" && (
                      <button
                        onClick={() => handleStart(worker.id)}
                        className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg transition-all flex items-center gap-1.5 text-sm"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start
                      </button>
                    )}
                    {worker.status === "running" && (
                      <button
                        onClick={() => handleStop(worker.id)}
                        className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded-lg transition-all flex items-center gap-1.5 text-sm"
                      >
                        <Square className="h-3.5 w-3.5" />
                        Stop
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(worker.id)}
                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all flex items-center gap-1.5 text-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Worker Modal */}
      {showAddModal && (
        <AddWorkerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchWorkers();
          }}
        />
      )}
    </div>
  );
}

// Add Worker Modal Component
function AddWorkerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    provider: "ckey",
    host: "",
    port: 8080,
    ssh_port: 22,
    web_terminal_port: 7681,
    gpu_model: "",
    gpu_count: 1,
    cpu_cores: 8,
    ram_gb: 32,
    storage_gb: 190,
    price_per_hour: 1.06,
    currency: "VND",
    auto_stop: true,
    auto_stop_idle_minutes: 10,
    rented_until: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/gpu-workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("GPU Worker added successfully!");
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add worker");
      }
    } catch (error) {
      alert("Failed to add worker");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E293B] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Add GPU Worker</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., ckey-rtx3080ti-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Provider *</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                >
                  <option value="ckey">ckey.vn</option>
                  <option value="runpod">Runpod</option>
                  <option value="vast">Vast.ai</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Host *</label>
                <input
                  type="text"
                  required
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., n1.ckey.vn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Worker Port *</label>
                <input
                  type="number"
                  required
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">SSH Port</label>
                <input
                  type="number"
                  value={formData.ssh_port}
                  onChange={(e) => setFormData({ ...formData, ssh_port: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Web Terminal Port</label>
                <input
                  type="number"
                  value={formData.web_terminal_port}
                  onChange={(e) => setFormData({ ...formData, web_terminal_port: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">GPU Model</label>
                <input
                  type="text"
                  value={formData.gpu_model}
                  onChange={(e) => setFormData({ ...formData, gpu_model: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., RTX 3080 Ti"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">GPU Count</label>
                <input
                  type="number"
                  value={formData.gpu_count}
                  onChange={(e) => setFormData({ ...formData, gpu_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">CPU Cores</label>
                <input
                  type="number"
                  value={formData.cpu_cores}
                  onChange={(e) => setFormData({ ...formData, cpu_cores: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">RAM (GB)</label>
                <input
                  type="number"
                  value={formData.ram_gb}
                  onChange={(e) => setFormData({ ...formData, ram_gb: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Storage (GB)</label>
                <input
                  type="number"
                  value={formData.storage_gb}
                  onChange={(e) => setFormData({ ...formData, storage_gb: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price/Hour</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_per_hour}
                  onChange={(e) => setFormData({ ...formData, price_per_hour: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rented Until</label>
                <input
                  type="datetime-local"
                  value={formData.rented_until}
                  onChange={(e) => setFormData({ ...formData, rented_until: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Auto Stop Idle (min)</label>
                <input
                  type="number"
                  value={formData.auto_stop_idle_minutes}
                  onChange={(e) => setFormData({ ...formData, auto_stop_idle_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto_stop"
                checked={formData.auto_stop}
                onChange={(e) => setFormData({ ...formData, auto_stop: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="auto_stop" className="text-sm">Auto-stop when idle</label>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg transition-all disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Worker"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

