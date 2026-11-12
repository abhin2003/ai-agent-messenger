"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ClearConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ClearConversationModal: React.FC<ClearConversationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-white border border-[#e9edef] shadow-xl overflow-hidden">
        <div className="p-6 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-rose-50 border border-rose-200 text-rose-500 mx-auto flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[#111b21]">Clear Conversation?</h3>
          <p className="text-xs text-[#54656f] leading-relaxed">
            This will permanently delete this conversation and its message history from the database. This action cannot be undone.
          </p>
        </div>

        <div className="px-5 py-3.5 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-[#e9edef] text-[#54656f] hover:text-[#111b21] hover:bg-gray-50 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors shadow-xs"
          >
            Clear Conversation
          </button>
        </div>
      </div>
    </div>
  );
};

