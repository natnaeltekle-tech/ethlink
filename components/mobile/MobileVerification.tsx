'use client'

import React, { useRef, useState } from 'react'
import {
  ChevronLeft,
  BookOpen,
  CreditCard,
  Car,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  Lock,
  CheckCircle,
  Star,
  ShieldCheck,
  Sparkles,
  Diamond,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type VerifStep = 'select' | 'capture' | 'review' | 'success'
type DocType = 'passport' | 'national_id' | 'driver_license'

interface MobileVerificationProps {
  onClose?: () => void
}

const DOC_OPTIONS: { id: DocType; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'passport', label: 'Passport', desc: 'Recommended for tourists', icon: BookOpen },
  { id: 'national_id', label: 'National ID', desc: 'For Ethiopian residents', icon: CreditCard },
  { id: 'driver_license', label: 'Driver License', desc: 'International license', icon: Car },
]

const BENEFITS = [
  { icon: Star, label: 'Priority Support', desc: '24/7 dedicated concierge' },
  { icon: ShieldCheck, label: 'Verified Badge', desc: 'Build trust instantly' },
  { icon: Sparkles, label: 'Higher Booking Limits', desc: 'Unlimited reservations' },
  { icon: Diamond, label: 'Exclusive Listings', desc: 'Access hidden gems' },
]

const DOC_LABEL: Record<DocType, string> = {
  passport: 'Passport',
  national_id: 'National ID',
  driver_license: 'Driver License',
}

export default function MobileVerification({ onClose }: MobileVerificationProps) {
  const [step, setStep] = useState<VerifStep>('select')
  const [docType, setDocType] = useState<DocType>('national_id')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Progress dots: select=0, capture/review=1, success=2
  const stepIndex = step === 'select' ? 0 : step === 'success' ? 2 : 1

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setSelectedFile(null)
  }

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image must be under 8MB')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(url)
    setStep('review')
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Please add a document photo first')
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) {
        toast.error('You must be logged in')
        setIsSubmitting(false)
        return
      }

      const ext = (selectedFile.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `verification/${user.id}_${docType}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('service-images')
        .upload(path, selectedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: selectedFile.type,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('service-images').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        id_card_link: publicUrl,
        updated_at: new Date().toISOString(),
      })

      if (profileError) throw profileError

      setStep('success')
      toast.success('Document submitted for verification')
    } catch (err: any) {
      console.error('[verification]', err)
      toast.error(err?.message || 'Upload failed. Try again or pick another image.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Hidden inputs — camera + gallery
  const fileInputs = (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFilePicked}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFilePicked}
      />
    </>
  )

  // ——— Step 3: Success ———
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#0B0C15] font-sans text-white flex flex-col">
        <main className="flex-1 flex flex-col px-6 pt-12 pb-6">
          <div className="flex flex-col items-center justify-center text-center mt-4 mb-8">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-[#f5c619]/20 blur-xl rounded-full" />
              <div className="relative flex items-center justify-center w-32 h-32 rounded-full border-2 border-[#f5c619]/30 bg-[#0B0C15]">
                <CheckCircle className="w-16 h-16 text-[#f5c619]" />
              </div>
            </div>
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight px-4 pb-2">
              Verification Submitted
            </h1>
            <p className="text-gray-400 text-base font-medium leading-relaxed px-4 max-w-[300px]">
              Your {DOC_LABEL[docType]} was uploaded. We&apos;ll review it shortly.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full mt-2">
            <h2 className="text-xs font-bold text-[#f5c619]/80 uppercase tracking-widest mb-2 px-2">
              Unlocked Benefits
            </h2>
            {BENEFITS.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-center gap-4 bg-[#13141f] border border-white/5 rounded-2xl px-4 py-4"
              >
                <div className="flex items-center justify-center rounded-full bg-[#f5c619]/10 shrink-0 size-12 border border-[#f5c619]/20">
                  <Icon className="w-6 h-6 text-[#f5c619]" />
                </div>
                <div>
                  <p className="text-white text-base font-bold">{label}</p>
                  <p className="text-gray-400 text-sm font-medium">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-grow" />
          <div className="mt-8 mb-4">
            <button
              onClick={() => {
                onClose?.()
                toast.success('Identity verification submitted!')
              }}
              className="w-full bg-gradient-to-r from-[#f5c619] to-[#d4a000] text-black font-extrabold text-lg py-4 rounded-full active:scale-[0.98] transition-all"
            >
              Return to Profile
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ——— Step 2b: Review & submit ———
  if (step === 'review' && previewUrl) {
    return (
      <div className="min-h-screen bg-[#0B0C15] font-sans text-white flex flex-col">
        {fileInputs}
        <header className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <button
            onClick={() => {
              clearSelection()
              setStep('capture')
            }}
            className="flex size-10 items-center justify-center rounded-full bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">Review document</h2>
          <div className="w-10" />
        </header>

        <main className="flex-1 flex flex-col px-5 pt-6 pb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <div className="h-1.5 w-8 rounded-full bg-[#f5c619]" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
          </div>
          <p className="text-center text-sm text-slate-400 mb-4">
            Step 2 of 3 · {DOC_LABEL[docType]}
          </p>

          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-[#f5c619]/40 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Document preview" className="w-full h-full object-contain" />
          </div>

          <button
            type="button"
            onClick={() => {
              clearSelection()
              setStep('capture')
            }}
            className="mt-4 flex items-center justify-center gap-2 text-sm text-[#f5c619] font-semibold"
          >
            <RotateCcw className="w-4 h-4" /> Retake or choose another
          </button>

          <div className="flex-grow" />

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 rounded-full bg-[#f5c619] text-[#0B0C15] font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                Submit for verification <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <p className="text-center text-white/30 text-xs mt-3 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Encrypted upload to your profile
          </p>
        </main>
      </div>
    )
  }

  // ——— Step 2: Capture / gallery ———
  if (step === 'capture') {
    return (
      <div className="relative flex h-screen w-full flex-col overflow-hidden bg-black font-sans text-white">
        {fileInputs}

        <div className="absolute inset-0 z-0 bg-[#181611]" />

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="relative h-[220px] w-[min(340px,90vw)] rounded-2xl"
            style={{ boxShadow: '0 0 0 100vmax rgba(0,0,0,0.75)' }}
          >
            <div className="absolute -left-[2px] -top-[2px] h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-[#f5c619]" />
            <div className="absolute -right-[2px] -top-[2px] h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-[#f5c619]" />
            <div className="absolute -bottom-[2px] -left-[2px] h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-[#f5c619]" />
            <div className="absolute -bottom-[2px] -right-[2px] h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-[#f5c619]" />
            <div
              className="absolute inset-x-4 h-0.5 bg-[#f5c619]/50 shadow-[0_0_15px_rgba(245,198,25,0.8)] animate-pulse"
              style={{ top: '40%' }}
            />
          </div>
          <p className="mt-8 text-center text-slate-300 text-sm font-medium tracking-wide px-6">
            Take a photo or choose from your gallery
          </p>
        </div>

        <div className="relative z-20 flex w-full items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4 pb-12">
          <button
            onClick={() => {
              clearSelection()
              setStep('select')
            }}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-white text-lg font-bold tracking-tight">Verification</h2>
          <div className="w-10" />
        </div>

        <div className="flex-1" />

        <div className="relative z-20 flex w-full flex-col items-center bg-gradient-to-t from-[#221e10] via-[#221e10]/95 to-transparent pb-10 pt-12 px-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <div className="h-1.5 w-8 rounded-full bg-[#f5c619] shadow-[0_0_10px_rgba(245,198,25,0.4)]" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
          </div>

          <div className="flex w-full max-w-sm items-center justify-center gap-6">
            {/* Gallery */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-white/10 border border-white/15">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-white/70 font-medium">Gallery</span>
            </button>

            {/* Camera (primary) */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="group relative flex size-20 items-center justify-center rounded-full border-4 border-white/20 active:scale-95 transition-all"
            >
              <div className="absolute inset-1 rounded-full bg-[#f5c619] shadow-[0_0_20px_rgba(245,198,25,0.3)]" />
              <Camera className="relative z-10 w-8 h-8 text-[#221e10]" />
            </button>

            <div className="w-14" />
          </div>

          <p className="mt-6 text-xs font-medium text-white/40">Step 2 of 3 · {DOC_LABEL[docType]}</p>
        </div>
      </div>
    )
  }

  // ——— Step 1: Select document ———
  return (
    <div className="min-h-screen bg-[#221e10] font-sans text-white flex flex-col relative overflow-hidden">
      {fileInputs}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-[#f5c619]/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full px-6 py-6 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/5"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? 'w-6 bg-[#f5c619] shadow-[0_0_10px_rgba(245,198,25,0.5)]'
                  : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
        <div className="w-10" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col px-6 pb-44 overflow-y-auto">
        <div className="mt-4 mb-8">
          <h1 className="text-3xl font-bold mb-3 tracking-wide">
            Choose <span className="text-[#f5c619]">Document Type</span>
          </h1>
          <p className="text-white/60 text-[15px] leading-relaxed">
            To ensure the safety of our community, please verify your identity.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {DOC_OPTIONS.map(({ id, label, desc, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDocType(id)}
              className={`flex items-center gap-5 p-5 w-full rounded-[24px] border transition-all ${
                docType === id
                  ? 'bg-gradient-to-br from-[#f5c619]/15 to-[#f5c619]/5 border-[#f5c619]'
                  : 'bg-white/[0.06] border-white/10'
              }`}
            >
              <div
                className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${
                  docType === id ? 'bg-[#f5c619] text-[#221e10]' : 'bg-white/5 text-white/70'
                }`}
              >
                <Icon className="w-7 h-7" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white text-lg font-bold leading-tight mb-1">{label}</h3>
                <p className="text-white/40 text-sm font-medium">{desc}</p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  docType === id ? 'border-[#f5c619] bg-[#f5c619]' : 'border-white/20'
                }`}
              >
                {docType === id && <CheckCircle className="w-4 h-4 text-[#221e10]" />}
              </div>
            </button>
          ))}
        </div>
      </main>

      <div className="fixed bottom-20 left-0 right-0 z-20 px-6 pb-8 pt-4 bg-gradient-to-t from-[#0B0C15] via-[#0B0C15]/95 to-transparent">
        <button
          type="button"
          onClick={() => setStep('capture')}
          className="w-full h-14 rounded-full bg-[#f5c619] text-[#221e10] font-bold text-lg shadow-[0_0_25px_rgba(245,198,25,0.35)] active:scale-[0.98] flex items-center justify-center gap-3"
        >
          Start Verification <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center mt-3 text-white/20 text-xs flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Encrypted & Secure Verification
        </p>
      </div>
    </div>
  )
}
