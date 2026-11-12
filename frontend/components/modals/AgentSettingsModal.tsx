"use client";

import React, { useState, useEffect } from "react";
import { X, Sliders, Sparkles, Check, RotateCcw, ShieldAlert } from "lucide-react";
import { AgentConfig } from "@/types";

interface AgentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentConfig;
  onSave: (updated: AgentConfig) => void;
}

export const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({
  isOpen,
  onClose,
  agent,
  onSave,
}) => {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
  const [model, setModel] = useState(agent.model);

  useEffect(() => {
    if (isOpen) {
      setName(agent.name);
      setRole(agent.role);
      setSystemPrompt(agent.systemPrompt);
      setModel(agent.model);
    }
  }, [isOpen, agent]);

  if (!isOpen) return null;

  const handleReset = () => {
    setName("Research Assistant");
    setRole("AI Research Assistant");
    setSystemPrompt(
      "You are a dedicated AI Research Assistant. Your role is to analyze research papers, synthesize data, retrieve facts from persistent semantic memory, and provide accurate, cited academic summaries."
    );
    setModel("gemini-3.5-flash");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...agent,
      name: name.trim() || agent.name,
      role: role.trim() || agent.role,
      systemPrompt: systemPrompt.trim() || agent.systemPrompt,
      model,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0f1218] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Agent Persona & Configuration</h3>
              <p className="text-xs text-zinc-400">Tune the employee persona, role and system instructions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Note Banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300">
            <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Frontend Local State:</span> In this stage, configuration is saved
              in your browser session. Backend PostgreSQL persistence via FastAPI will be wired in Stage 3.
            </div>
          </div>

          {/* Agent Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Agent Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl bg-zinc-900/80 border border-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              placeholder="e.g. Research Assistant, Senior DevOps Engineer"
            />
          </div>

          {/* Agent Role */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Agent Role / Title
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full rounded-xl bg-zinc-900/80 border border-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              placeholder="e.g. AI Research Assistant"
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Target AI Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl bg-zinc-900/80 border border-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            >
              <option value="gemini-3.5-flash">gemini-3.5-flash (Fast & Stable)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Latest Flash)</option>
            </select>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex justify-between items-center">
              <span>System Prompt (Instructions)</span>
              <span className="text-[10px] font-mono text-zinc-400">{systemPrompt.length} chars</span>
            </label>
            <textarea
              rows={5}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              required
              className="w-full rounded-xl bg-zinc-900/80 border border-zinc-800 p-3.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none font-mono text-xs leading-relaxed"
              placeholder="Define behavioral rules, boundaries, and domain expertise..."
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/40">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Check className="h-3.5 w-3.5" />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

