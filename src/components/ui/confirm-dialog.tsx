"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Onay",
  message = "Bu işlemi yapmak istediğinize emin misiniz?",
  confirmLabel = "Onayla",
  cancelLabel = "İptal",
  variant = "danger",
  loading = false,
}: Props) {
  const iconMap = {
    danger: "bg-ena-primary/10 text-ena-primary",
    warning: "bg-amber-100 text-amber-600",
    info: "bg-blue-100 text-blue-600",
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" showClose={false}>
      <div className="text-center">
        <div className={`inline-flex p-3 rounded-full ${iconMap[variant]} mb-4`}>
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={
              variant === "danger"
                ? "bg-red-600 hover:brightness-90 text-white"
                : variant === "warning"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : ""
            }
          >
            {loading ? "İşleniyor..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
