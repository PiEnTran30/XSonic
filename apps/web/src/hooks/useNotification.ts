"use client";

import { useState, useCallback } from "react";
import { NotificationType } from "@/components/ui/notification-modal";

interface NotificationState {
  isOpen: boolean;
  title: string;
  message: string;
  type: NotificationType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  autoClose?: number;
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const showNotification = useCallback(
    ({
      title,
      message,
      type = "info",
      confirmText = "OK",
      cancelText = "Hủy",
      onConfirm,
      showCancel = false,
      autoClose,
    }: Omit<NotificationState, "isOpen">) => {
      setNotification({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        onConfirm,
        showCancel,
        autoClose,
      });
    },
    []
  );

  const closeNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Convenience methods
  const showSuccess = useCallback(
    (title: string, message: string, autoClose?: number) => {
      showNotification({ title, message, type: "success", autoClose });
    },
    [showNotification]
  );

  const showError = useCallback(
    (title: string, message: string) => {
      showNotification({ title, message, type: "error" });
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string) => {
      showNotification({ title, message, type: "warning" });
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, autoClose?: number) => {
      showNotification({ title, message, type: "info", autoClose });
    },
    [showNotification]
  );

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      confirmText = "Xác nhận",
      cancelText = "Hủy"
    ) => {
      showNotification({
        title,
        message,
        type: "warning",
        onConfirm,
        showCancel: true,
        confirmText,
        cancelText,
      });
    },
    [showNotification]
  );

  return {
    notification,
    showNotification,
    closeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
  };
}

