'use client'

import React from 'react'
import { ChevronLeft, Mail, MessageCircle, Phone, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface MobileHelpSupportProps {
  onClose: () => void
}

export default function MobileHelpSupport({ onClose }: MobileHelpSupportProps) {
  const email = 'support@ethlinks.app'

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email)
      toast.success('Email copied')
    } catch {
      toast.message(email)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0C15] text-white font-sans pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-4 bg-[#0B0C15]/95 backdrop-blur border-b border-white/5">
        <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Help & Support</h1>
      </header>

      <main className="p-5 space-y-4">
        <p className="text-sm text-slate-400 leading-relaxed px-1">
          Need help with a booking, payment, or your account? Reach us using the options below.
        </p>

        <button
          type="button"
          onClick={copyEmail}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#13151f] border border-white/5 text-left active:scale-[0.99] transition-transform"
        >
          <div className="size-12 rounded-full bg-[#f5c619]/15 flex items-center justify-center">
            <Mail className="w-5 h-5 text-[#f5c619]" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white">Email support</p>
            <p className="text-xs text-slate-400 truncate">{email}</p>
          </div>
        </button>

        <a
          href={`mailto:${email}?subject=Eth-Links%20Support`}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#13151f] border border-white/5"
        >
          <div className="size-12 rounded-full bg-blue-500/15 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-bold text-white">Open email app</p>
            <p className="text-xs text-slate-400">Write us a message</p>
          </div>
        </a>

        <a
          href="tel:+251911000000"
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#13151f] border border-white/5"
        >
          <div className="size-12 rounded-full bg-green-500/15 flex items-center justify-center">
            <Phone className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="font-bold text-white">Call support</p>
            <p className="text-xs text-slate-400">Update this number when ready</p>
          </div>
        </a>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#13151f] border border-white/5">
          <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white text-sm">Common issues</p>
            <ul className="mt-2 text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Location blocked → enable in browser site settings</li>
              <li>Payment pending → wait for confirmation SMS / email</li>
              <li>Chat with provider → open service → Message</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
