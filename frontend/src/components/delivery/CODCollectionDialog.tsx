"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

interface CODCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (collected: boolean) => void;
  amount: number;
  isLoading?: boolean;
}

export function CODCollectionDialog({
  isOpen,
  onClose,
  onConfirm,
  amount,
  isLoading = false,
}: CODCollectionDialogProps) {
  const [collected, setCollected] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(collected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">COD Collection</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-900 mb-1">
                  Cash on Delivery
                </p>
                <p className="text-sm text-yellow-700">
                  Please confirm if you have collected the payment from the customer.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Amount to Collect</span>
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(amount)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="cod_status"
                checked={collected === true}
                onChange={() => setCollected(true)}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium text-gray-900">Payment Collected</p>
                <p className="text-sm text-gray-600">
                  Customer has paid the full amount
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="cod_status"
                checked={collected === false}
                onChange={() => setCollected(false)}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium text-gray-900">Payment Not Collected</p>
                <p className="text-sm text-gray-600">
                  Customer did not pay (will be marked as failed)
                </p>
              </div>
            </label>
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
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Confirming..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}


