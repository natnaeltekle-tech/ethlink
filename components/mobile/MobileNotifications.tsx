'use client'

import React, { useState } from 'react';
import { Bell, Key, ShieldCheck, CreditCard, ChevronRight, ArrowRight } from 'lucide-react';

type NotifTab = 'all' | 'bookings' | 'account';

interface Notification {
    id: string;
    type: 'booking' | 'account' | 'payment';
    title: string;
    subtitle?: string;
    body: string;
    time: string;
    unread: boolean;
    actionLabel?: string;
    actionHref?: string;
}

interface MobileNotificationsProps {
    notifications?: Notification[];
}

const MOCK_NOTIFICATIONS: Notification[] = [
    { id: '1', type: 'booking', title: 'New Inquiry', subtitle: 'Service Booking', body: 'A guest has requested dates for next week. Review their profile.', time: '2m ago', unread: true, actionLabel: 'View Inquiry' },
    { id: '2', type: 'account', title: 'Profile Verified', body: 'Your expat status has been confirmed. You can now access exclusive listings.', time: '1h ago', unread: true, actionLabel: 'Dismiss' },
    { id: '3', type: 'payment', title: 'Payment Successful', body: 'Your subscription renewal was processed successfully.', time: 'Yesterday', unread: false, actionLabel: 'View Receipt' },
];

export default function MobileNotifications({ notifications = MOCK_NOTIFICATIONS }: MobileNotificationsProps) {
    const [activeTab, setActiveTab] = useState<NotifTab>('all');
    const [items, setItems] = useState(notifications);

    const tabs: { id: NotifTab; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'bookings', label: 'Bookings' },
        { id: 'account', label: 'Account' },
    ];

    const filtered = items.filter(n => {
        if (activeTab === 'all') return true;
        if (activeTab === 'bookings') return n.type === 'booking';
        return ['account', 'payment'].includes(n.type);
    });

    const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, unread: false })));

    const iconMap: Record<string, React.ElementType> = { booking: Key, account: ShieldCheck, payment: CreditCard };
    const iconColorMap: Record<string, string> = {
        booking: 'from-[#f5c619]/20 to-[#f5c619]/5 border-[#f5c619]/10 text-[#f5c619]',
        account: 'from-white/10 to-white/5 border-white/5 text-white/80',
        payment: 'from-white/10 to-white/5 border-white/5 text-white/60',
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#221e10] font-sans text-white">
            {/* Ambient Effects */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#f5c619]/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-40 -left-20 w-48 h-48 bg-[#f5c619]/5 rounded-full blur-[60px] pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 pt-12 pb-4">
                <h1 className="text-2xl font-semibold tracking-tight text-white/90">Notifications</h1>
                <button onClick={markAllRead} className="group flex items-center gap-1 text-[#f5c619]/70 hover:text-[#f5c619] transition-colors">
                    <span className="text-xs font-medium uppercase tracking-wider">Mark all as read</span>
                </button>
            </header>

            {/* Tabs */}
            <div className="relative z-10 px-6 py-2">
                <div className="flex p-1 bg-[#1a170d]/80 backdrop-blur-md rounded-full border border-white/5">
                    {tabs.map(({ id, label }) => (
                        <button key={id} onClick={() => setActiveTab(id)}
                            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === id
                                ? 'bg-[#f5c619] text-[#221e10] shadow-[0_0_15px_rgba(245,198,25,0.2)]'
                                : 'text-white/40 hover:text-white/80'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <main className="relative z-10 flex-1 overflow-y-auto px-6 py-6 space-y-5 pb-24">
                {filtered.map((notif) => {
                    const Icon = iconMap[notif.type] || Bell;
                    const colors = iconColorMap[notif.type] || iconColorMap.account;
                    return (
                        <div key={notif.id}
                            className={`rounded-[1.5rem] p-5 relative overflow-hidden hover:bg-[#2f2b1d]/60 transition-colors ${notif.unread ? '' : 'opacity-80'}`}
                            style={{ background: 'rgba(40,36,25,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(245,198,25,0.1)', boxShadow: '0 4px 24px -1px rgba(0,0,0,0.2)' }}>
                            {/* Unread dot */}
                            {notif.unread && (
                                <div className="absolute top-6 right-5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f5c619] opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f5c619] shadow-[0_0_8px_#f5c619]" />
                                </div>
                            )}
                            <div className="flex items-start gap-4">
                                <div className={`shrink-0 h-12 w-12 rounded-full bg-gradient-to-br ${colors} flex items-center justify-center border`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1 pt-0.5 pr-4">
                                    <h3 className="text-base font-semibold text-white leading-tight">{notif.title}</h3>
                                    {notif.subtitle && <p className="text-white/90 text-sm mt-1 font-medium">{notif.subtitle}</p>}
                                    <p className="text-white/50 text-xs mt-1 leading-relaxed">{notif.body}</p>
                                    {notif.actionLabel && (
                                        <div className="mt-4">
                                            <button className={`text-xs font-bold py-2 px-5 rounded-full transition-colors ${notif.unread && notif.type === 'booking'
                                                ? 'bg-[#f5c619] hover:bg-[#ffe548] text-[#221e10] shadow-lg shadow-[#f5c619]/10'
                                                : 'bg-transparent border border-white/20 hover:bg-white/5 text-white/90'}`}>
                                                {notif.actionLabel}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="absolute bottom-5 right-6 text-white/30 text-[10px] font-medium tracking-wide">{notif.time}</p>
                        </div>
                    );
                })}

                {/* Older separator */}
                <div className="flex items-center gap-4 py-4 opacity-50">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent w-full" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 shrink-0">Older</span>
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent w-full" />
                </div>

                {/* Empty State */}
                <div className="flex flex-col items-center justify-center py-10 opacity-60">
                    <div className="relative mb-4">
                        <div className="absolute inset-0 bg-[#f5c619]/20 blur-xl rounded-full" />
                        <Bell className="relative w-12 h-12 text-[#f5c619] opacity-80" />
                    </div>
                    <h4 className="text-white/90 text-sm font-medium tracking-wide text-center">Your sanctuary is quiet</h4>
                    <p className="text-white/30 text-xs mt-1 text-center font-light">No earlier notifications to display</p>
                </div>
            </main>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#221e10] to-transparent pointer-events-none z-20" />
        </div>
    );
}
