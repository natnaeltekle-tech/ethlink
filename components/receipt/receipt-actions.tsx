'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { toast } from 'sonner'
import { Check, Copy, Download, Send, Share2 } from 'lucide-react'

type Props = {
    verifyUrl: string
    receiptNumber: string | null
    amountLabel: string
    serviceTitle: string
    statusLabel: string
    scheduledLabel: string
    /** Print automatically on load (?print=1 — used when the Android app opens this page in the browser). */
    autoPrint?: boolean
}

async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        ta.remove()
        return ok
    }
}

export function ReceiptActions({ verifyUrl, receiptNumber, amountLabel, serviceTitle, statusLabel, scheduledLabel, autoPrint }: Props) {
    const [native, setNative] = useState(false)
    const [canShare, setCanShare] = useState(false)
    const [showShare, setShowShare] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const isNative = Capacitor.isNativePlatform()
        setNative(isNative)
        setCanShare(!isNative && typeof navigator !== 'undefined' && typeof navigator.share === 'function')
        if (autoPrint && !isNative) {
            const t = setTimeout(() => window.print(), 700)
            return () => clearTimeout(t)
        }
    }, [autoPrint])

    const text = [
        `Eth-Links Escrow Receipt ${receiptNumber ?? ''}`.trim(),
        `${serviceTitle} — ${scheduledLabel}`,
        `${amountLabel} · ${statusLabel}`,
        `Verify: ${verifyUrl}`,
    ].join('\n')

    const savePdf = () => {
        if (native) {
            // Android WebView can't print: open the public receipt in the phone's browser,
            // which prints / saves as PDF (the app hands other hosts to the system browser).
            const url = new URL(verifyUrl)
            url.searchParams.set('print', '1')
            window.location.href = url.toString()
            return
        }
        window.print()
    }

    const share = async () => {
        if (canShare) {
            try {
                await navigator.share({ title: `Eth-Links receipt ${receiptNumber ?? ''}`.trim(), text, url: verifyUrl })
                return
            } catch (e) {
                if (e instanceof DOMException && e.name === 'AbortError') return
            }
        }
        setShowShare((v) => !v)
    }

    const copy = async () => {
        const ok = await copyText(text)
        if (ok) {
            setCopied(true)
            toast.success('Receipt copied — paste it in any chat')
            setTimeout(() => setCopied(false), 2000)
        } else {
            toast.error('Could not copy. Long-press the link to copy it.')
        }
    }

    const enc = encodeURIComponent
    const btn = 'inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold'

    return (
        <div className="receipt-actions mx-auto w-full max-w-lg space-y-2 print:hidden">
            <div className="flex gap-2">
                <button type="button" onClick={savePdf} className={`${btn} bg-[#f5c619] text-[#0B0C15]`}>
                    <Download className="h-4 w-4" />{native ? 'Save PDF' : 'Print / Save PDF'}
                </button>
                <button type="button" onClick={share} aria-expanded={showShare} className={`${btn} border border-white/15 bg-white/5 text-white`}>
                    <Share2 className="h-4 w-4" />Share
                </button>
            </div>
            {showShare && (
                <div className="grid grid-cols-3 gap-2">
                    <a href={`https://wa.me/?text=${enc(text)}`} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#25D366] text-white`}>
                        WhatsApp
                    </a>
                    <a href={`https://t.me/share/url?url=${enc(verifyUrl)}&text=${enc(text)}`} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#229ED9] text-white`}>
                        <Send className="h-4 w-4" />Telegram
                    </a>
                    <button type="button" onClick={copy} className={`${btn} border border-white/15 bg-white/5 text-white`}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            )}
        </div>
    )
}
