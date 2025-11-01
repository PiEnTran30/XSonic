"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  show_once: boolean;
  priority: number;
}

export function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadAnnouncement();
  }, []);

  const loadAnnouncement = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get active announcements
      const { data: announcements, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error || !announcements || announcements.length === 0) return;

      // Get user's seen announcements
      const { data: seenAnnouncements } = await supabase
        .from("user_seen_announcements")
        .select("announcement_id")
        .eq("user_id", user.id);

      const seenIds = new Set(seenAnnouncements?.map((s) => s.announcement_id) || []);

      // Find first unseen announcement
      const unseenAnnouncement = announcements.find((a) => {
        // Check if user has seen it
        if (seenIds.has(a.id)) return false;

        // Check date range
        const now = new Date();
        if (a.start_date && new Date(a.start_date) > now) return false;
        if (a.end_date && new Date(a.end_date) < now) return false;

        return true;
      });

      if (unseenAnnouncement) {
        setAnnouncement(unseenAnnouncement);
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Error loading announcement:", error);
    }
  };

  const handleClose = async () => {
    if (!announcement) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark as seen
      if (announcement.show_once) {
        await supabase
          .from("user_seen_announcements")
          .insert({
            user_id: user.id,
            announcement_id: announcement.id,
          });
      }

      setIsOpen(false);
      setAnnouncement(null);
    } catch (error) {
      console.error("Error marking announcement as seen:", error);
      setIsOpen(false);
    }
  };

  if (!isOpen || !announcement) return null;

  const getIcon = () => {
    switch (announcement.type) {
      case "success":
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case "error":
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />;
      case "info":
      default:
        return <Info className="h-12 w-12 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (announcement.type) {
      case "success":
        return {
          bg: "bg-green-500/10",
          border: "border-green-500/30",
          button: "bg-green-600 hover:bg-green-700",
        };
      case "error":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          button: "bg-red-600 hover:bg-red-700",
        };
      case "warning":
        return {
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/30",
          button: "bg-yellow-600 hover:bg-yellow-700",
        };
      case "info":
      default:
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          button: "bg-blue-600 hover:bg-blue-700",
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {announcement.title}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div
            className={`mb-6 p-4 ${colors.bg} border ${colors.border} rounded-xl flex items-center justify-center`}
          >
            {getIcon()}
          </div>

          {/* Message */}
          <p className="text-center text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {announcement.message}
          </p>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={handleClose}
            className={`w-full px-4 py-2.5 ${colors.button} text-white rounded-lg font-medium transition-colors`}
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

