'use client'

import React from 'react'
import { ChevronLeft, Smartphone, Building2, ShieldCheck, Info } from 'lucide-react'

interface MobilePaymentMethodsProps {
  onClose: () => void
}

export default function MobilePaymentMethods({ onClose }: MobilePaymentMethodsProps) {
  return (
    <div className="min-h-screen bg-[#0B0C15] text-white font-sans pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-4 bg-[#0B0C15]/95 backdrop-blur border-b border-white/5">
        <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Payment Methods</h1>
      </header>

      <main className="p-5 space-y-6">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#f5c619]/10 border border-[#f5c619]/20">
          <Info className="w-5 h-5 text-[#f5c619] shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300 leading-relaxed">
            Payments are processed securely at checkout. Your money is held in escrow until the job is completed.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Available at checkout</h2>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#13151f] border border-white/5">
            <div className="size-12 rounded-full bg-green-500/15 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white">Telebirr</p>
              <p className="text-xs text-slate-400">Mobile money · Ethiopia</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
              Active
            </span>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#13151f] border border-white/5">
            <div className="size-12 rounded-full bg-blue-500/15 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white">Chapa</p>
              <p className="text-xs text-slate-400">Cards & bank transfer</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
              Active
            </span>
          </div>
        </section>

        <section className="flex items-start gap-3 p-4 rounded-2xl bg-[#13151f] border border-white/5">
          <ShieldCheck className="w-5 h-5 text-[#f5c619] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white text-sm">Escrow protection</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              When you book, payment is held until you confirm the job is done. Providers are paid after completion.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
