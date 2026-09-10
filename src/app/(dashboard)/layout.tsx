"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { AiQuickEntryModal } from "@/components/ai/ai-quick-entry-modal";
import { AiDraftModal } from "@/components/ai/ai-draft-modal";
import { TransactionFormModal } from "@/components/transactions/transaction-form-modal";
import { PageTransition } from "@/components/ui/page-transition";
import { Coins, Plus, Camera, Mic, MessageSquare } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [suggestedData, setSuggestedData] = useState<any>(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleDraftCreated = (id: string, data: any) => {
    setDraftId(id);
    setSuggestedData(data);
    setIsDraftModalOpen(true);
  };

  const handleTransactionSuccess = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("transaction-updated"));
    }
  };

  const fabActions = [
    { icon: MessageSquare, label: "Nhập text", action: () => { setIsAiModalOpen(true); setIsFabExpanded(false); } },
    { icon: Camera, label: "Quét hóa đơn", action: () => { setIsAiModalOpen(true); setIsFabExpanded(false); } },
    { icon: Mic, label: "Giọng nói", action: () => { setIsAiModalOpen(true); setIsFabExpanded(false); } },
    { icon: Plus, label: "Nhập tay", action: () => { setIsAddTxModalOpen(true); setIsFabExpanded(false); } },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-[#f2f2f2] flex">
      {/* Sidebar Navigation (desktop only) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Sticky Header */}
        <Header
          onOpenAiEntry={() => setIsAiModalOpen(true)}
          onOpenAddTransaction={() => setIsAddTxModalOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Bottom Navigation (mobile only) */}
      <BottomNav />

      {/* ═══ Gold AI FAB (Floating Action Button) ═══ */}
      {/* Overlay – click to collapse */}
      <AnimatePresence>
        {isFabExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFabExpanded(false)}
            className="fixed inset-0 z-40"
          />
        )}
      </AnimatePresence>

      {/* FAB Group */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-50">
        {/* Expanded action items */}
        <AnimatePresence>
          {isFabExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute bottom-16 right-0 flex flex-col gap-2 items-end mb-1"
            >
              {fabActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 350, damping: 28 }}
                  onClick={action.action}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#0f0f0f] border border-[rgba(245,200,66,0.25)] text-[#c0a035] hover:border-[rgba(245,200,66,0.50)] hover:text-[#f5c842] hover:bg-[#141414] transition-all text-sm font-medium shadow-xl shadow-black/60 cursor-pointer whitespace-nowrap group"
                  whileHover={{ scale: 1.03, x: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <action.icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          onClick={() => setIsFabExpanded(!isFabExpanded)}
          title="AI Nhập liệu"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.06, y: -2 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
          animate={isFabExpanded ? { rotate: 45 } : { rotate: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-[#f5c842] via-[#d4a017] to-[#92692a] text-[#080808] shadow-2xl shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-shadow duration-300 cursor-pointer overflow-hidden animate-gold-pulse border border-[rgba(255,220,80,0.4)]"
        >
          {/* Shimmer */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          <Coins className="h-6 w-6 relative z-10" />
        </motion.button>
      </div>

      {/* AI Quick Entry Modal */}
      <AiQuickEntryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onDraftCreated={handleDraftCreated}
      />

      {/* AI Draft Confirmation Modal */}
      <AiDraftModal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        draftId={draftId}
        suggestedData={suggestedData}
        onConfirmed={handleTransactionSuccess}
        onRejected={handleTransactionSuccess}
      />

      {/* Manual Transaction Modal */}
      <TransactionFormModal
        isOpen={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
        onSuccess={handleTransactionSuccess}
      />
    </div>
  );
}
