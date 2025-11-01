"use client";

import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: NotificationType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  autoClose?: number; // Auto close after X milliseconds
}

export function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  confirmText = "OK",
  cancelText = "Hủy",
  onConfirm,
  showCancel = false,
  autoClose,
}: NotificationModalProps) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case "error":
        return <AlertCircle className="h-16 w-16 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-16 w-16 text-yellow-500" />;
      case "info":
      default:
        return <Info className="h-16 w-16 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return {
          bg: "from-green-500/20 to-emerald-500/20",
          border: "border-green-500/30",
          button: "bg-green-600 hover:bg-green-700",
        };
      case "error":
        return {
          bg: "from-red-500/20 to-rose-500/20",
          border: "border-red-500/30",
          button: "bg-red-600 hover:bg-red-700",
        };
      case "warning":
        return {
          bg: "from-yellow-500/20 to-orange-500/20",
          border: "border-yellow-500/30",
          button: "bg-yellow-600 hover:bg-yellow-700",
        };
      case "info":
      default:
        return {
          bg: "from-blue-500/20 to-cyan-500/20",
          border: "border-blue-500/30",
          button: "bg-blue-600 hover:bg-blue-700",
        };
    }
  };

  const colors = getColors();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-md bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6 animate-in zoom-in duration-500 delay-100">
            {getIcon()}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center mb-3 text-white animate-in slide-in-from-bottom-4 duration-500 delay-200">
            {title}
          </h2>

          {/* Message */}
          <p className="text-center text-gray-300 mb-8 whitespace-pre-line animate-in slide-in-from-bottom-4 duration-500 delay-300">
            {message}
          </p>

          {/* Buttons */}
          <div className={`flex gap-3 animate-in slide-in-from-bottom-4 duration-500 delay-400 ${
            showCancel ? "justify-center" : "justify-center"
          }`}>
            {showCancel && (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-medium transition-all hover:scale-105"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-6 py-3 ${colors.button} rounded-lg font-medium transition-all hover:scale-105 shadow-lg`}
            >
              {confirmText}
            </button>
          </div>
        </div>

        {/* Auto-close progress bar */}
        {autoClose && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-2xl overflow-hidden">
            <div
              className="h-full bg-white/50"
              style={{
                animation: `shrink ${autoClose}ms linear`,
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

