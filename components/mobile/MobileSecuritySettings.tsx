'use client'

import React, { useState } from 'react';
import { ChevronLeft, Fingerprint, ShieldCheck, Smartphone, Eye, EyeOff, Monitor, Trash2, Lock, AlertTriangle } from 'lucide-react';

interface MobileSecuritySettingsProps {
    onClose?: () => void;
}

export default function MobileSecuritySettings({ onClose }: MobileSecuritySettingsProps) {
    const [biometric, setBiometric] = useState(true);
    const [twoFactor, setTwoFactor] = useState(false);
    const [realTimeAlerts, setRealTimeAlerts] = useState(true);
    const [profileVisible, setProfileVisible] = useState(true);

    const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
        <button onClick={onToggle} className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-[#f5c619]' : 'bg-white/10'}`}>
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </button>
    );

    return (
        <div className="min-h-screen bg-[#0B0C15] font-sans text-white pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 bg-[#0B0C15]/90 backdrop-blur-md border-b border-white/5">
                <button onClick={onClose} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold tracking-tight">Security & Privacy</h1>
                <div className="w-10" />
            </header>

            <main className="px-5 py-6 flex flex-col gap-8">
                {/* Login Security */}
                <section className="flex flex-col gap-4">
                    <h2 className="text-xs font-bold text-[#f5c619] uppercase tracking-widest px-1">Login Security</h2>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden divide-y divide-white/[0.06]">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-[#f5c619]/10 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-[#f5c619]" /></div>
                                <div><p className="text-white text-sm font-medium">Biometric Login</p><p className="text-gray-500 text-xs mt-0.5">Use face or fingerprint</p></div>
                            </div>
                            <Toggle enabled={biometric} onToggle={() => setBiometric(!biometric)} />
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-[#f5c619]/10 flex items-center justify-center"><Smartphone className="w-5 h-5 text-[#f5c619]" /></div>
                                <div><p className="text-white text-sm font-medium">Two-Factor Auth</p><p className="text-gray-500 text-xs mt-0.5">SMS verification code</p></div>
                            </div>
                            <Toggle enabled={twoFactor} onToggle={() => setTwoFactor(!twoFactor)} />
                        </div>
                        <button className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-[#f5c619]/10 flex items-center justify-center"><Lock className="w-5 h-5 text-[#f5c619]" /></div>
                                <p className="text-white text-sm font-medium">Change Password</p>
                            </div>
                            <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
                        </button>
                    </div>
                </section>

                {/* Monitoring */}
                <section className="flex flex-col gap-4">
                    <h2 className="text-xs font-bold text-[#f5c619] uppercase tracking-widest px-1">Monitoring</h2>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden divide-y divide-white/[0.06]">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-[#f5c619]/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-[#f5c619]" /></div>
                                <div><p className="text-white text-sm font-medium">Real-Time Alerts</p><p className="text-gray-500 text-xs mt-0.5">Notify on new logins</p></div>
                            </div>
                            <Toggle enabled={realTimeAlerts} onToggle={() => setRealTimeAlerts(!realTimeAlerts)} />
                        </div>
                    </div>
                </section>

                {/* Active Sessions */}
                <section className="flex flex-col gap-4">
                    <h2 className="text-xs font-bold text-[#f5c619] uppercase tracking-widest px-1">Active Sessions</h2>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden divide-y divide-white/[0.06]">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center"><Smartphone className="w-5 h-5 text-green-400" /></div>
                                <div>
                                    <p className="text-white text-sm font-medium">This Device</p>
                                    <p className="text-gray-500 text-xs mt-0.5">Android • Last active now</p>
                                </div>
                            </div>
                            <span className="text-green-400 text-[10px] font-bold uppercase bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Active</span>
                        </div>
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-white/5 flex items-center justify-center"><Monitor className="w-5 h-5 text-gray-400" /></div>
                                <div>
                                    <p className="text-white text-sm font-medium">Chrome Desktop</p>
                                    <p className="text-gray-500 text-xs mt-0.5">Windows • 2 days ago</p>
                                </div>
                            </div>
                            <button className="text-red-400 text-xs font-semibold hover:text-red-300">Revoke</button>
                        </div>
                    </div>
                </section>

                {/* Privacy */}
                <section className="flex flex-col gap-4">
                    <h2 className="text-xs font-bold text-[#f5c619] uppercase tracking-widest px-1">Data & Privacy</h2>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden divide-y divide-white/[0.06]">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-[#f5c619]/10 flex items-center justify-center">{profileVisible ? <Eye className="w-5 h-5 text-[#f5c619]" /> : <EyeOff className="w-5 h-5 text-[#f5c619]" />}</div>
                                <div><p className="text-white text-sm font-medium">Profile Visibility</p><p className="text-gray-500 text-xs mt-0.5">Show profile to others</p></div>
                            </div>
                            <Toggle enabled={profileVisible} onToggle={() => setProfileVisible(!profileVisible)} />
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <button className="w-full mt-4 py-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors active:scale-[0.98]">
                    <Trash2 className="w-4 h-4" /> Delete Account
                </button>
            </main>
        </div>
    );
}
