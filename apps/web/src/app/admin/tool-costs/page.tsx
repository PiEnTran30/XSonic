"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Save, X, Zap } from "lucide-react";

export default function AdminToolCostsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [toolCosts, setToolCosts] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    loadToolCosts();
  };

  const loadToolCosts = async () => {
    const { data, error } = await supabase
      .from("tool_costs")
      .select("*")
      .order("category, credits_per_minute", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setToolCosts(data || []);
    }
    setLoading(false);
  };

  const startEdit = (tool: any) => {
    setEditingId(tool.id);
    setEditForm({
      base_credits: tool.base_credits,
      credits_per_minute: tool.credits_per_minute,
      description: tool.description,
      is_active: tool.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (toolId: string) => {
    try {
      const { error } = await supabase
        .from("tool_costs")
        .update({
          base_credits: parseFloat(editForm.base_credits),
          credits_per_minute: parseFloat(editForm.credits_per_minute),
          description: editForm.description,
          is_active: editForm.is_active,
        })
        .eq("id", toolId);

      if (error) throw error;

      setMessage("Đã cập nhật thành công!");
      setTimeout(() => setMessage(""), 3000);
      setEditingId(null);
      loadToolCosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const categoryColors = {
    "ai-audio": "from-blue-500/20 to-purple-500/20 border-blue-500/30",
    "audio-basic": "from-green-500/20 to-teal-500/20 border-green-500/30",
    "video": "from-purple-500/20 to-pink-500/20 border-purple-500/30",
  };

  const categoryIcons = {
    "ai-audio": "✨",
    "audio-basic": "🎵",
    "video": "🎬",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Admin</span>
            </Link>
            <div className="h-6 w-px bg-white/20"></div>
            <h1 className="text-2xl font-bold">Quản lý giá Credits</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Tool Costs by Category */}
        {['ai-audio', 'audio-basic', 'video'].map((category) => {
          const tools = toolCosts.filter((t) => t.category === category);
          if (tools.length === 0) return null;

          return (
            <div key={category} className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="text-3xl">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                {category === 'ai-audio' && 'AI Audio Tools'}
                {category === 'audio-basic' && 'Basic Audio Tools'}
                {category === 'video' && 'Video Tools'}
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {tools.map((tool) => {
                  const isEditing = editingId === tool.id;
                  const colorClass = categoryColors[category as keyof typeof categoryColors];

                  return (
                    <div
                      key={tool.id}
                      className={`p-6 bg-gradient-to-br ${colorClass} rounded-xl border`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{tool.tool_name}</h3>
                          <div className="text-sm text-gray-400">{tool.tool_id}</div>
                        </div>
                        {!isEditing ? (
                          <button
                            onClick={() => startEdit(tool)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(tool.id)}
                              className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                            >
                              <Save className="h-5 w-5 text-green-400" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                            >
                              <X className="h-5 w-5 text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Base Credits</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editForm.base_credits}
                              onChange={(e) => setEditForm({ ...editForm, base_credits: e.target.value })}
                              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Credits per Minute</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editForm.credits_per_minute}
                              onChange={(e) => setEditForm({ ...editForm, credits_per_minute: e.target.value })}
                              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                              rows={2}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editForm.is_active}
                              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <label className="text-sm">Active</label>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-400 mb-4">{tool.description}</p>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center gap-2 text-yellow-400">
                              <Zap className="h-5 w-5" />
                              <span className="text-2xl font-bold">{tool.base_credits}</span>
                              <span className="text-sm">base</span>
                            </div>
                            <span className="text-gray-500">+</span>
                            <div className="flex items-center gap-2 text-yellow-400">
                              <span className="text-2xl font-bold">{tool.credits_per_minute}</span>
                              <span className="text-sm">/phút</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                tool.is_active
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {tool.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}

