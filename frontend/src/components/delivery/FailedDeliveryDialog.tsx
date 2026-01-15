"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button, Card } from "@/components/ui";

interface FailedDeliveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes?: string) => void;
  isLoading?: boolean;
}

const FAILURE_REASONS = [
  { value: "customer_not_available", label: "Customer Not Available" },
  { value: "wrong_address", label: "Wrong Address" },
  { value: "customer_refused", label: "Customer Refused" },
  { value: "damaged_package", label: "Damaged Package" },
  { value: "other", label: "Other" },
];

export function FailedDeliveryDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: FailedDeliveryDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedReason) {
      return;
    }
    onConfirm(selectedReason, notes.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Mark Delivery as Failed</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">
                  Delivery Failed
                </p>
                <p className="text-sm text-red-700">
                  Please select the reason for delivery failure. You can retry the delivery later.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Failure Reason <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {FAILURE_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="failure_reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="text-gray-900">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details about the delivery failure..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isLoading || !selectedReason}
              className="flex-1"
            >
              {isLoading ? "Marking..." : "Mark as Failed"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}


