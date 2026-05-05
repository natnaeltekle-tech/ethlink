'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { completeJob, updateBookingStatus } from '@/lib/actions';
import { toast } from 'sonner';
import { ChevronLeft, MoreHorizontal, Edit2, ClipboardList, CreditCard, Bell, ShieldCheck, LifeBuoy, LogOut, CheckCircle, XCircle, Clock, MapPin, DollarSign, Briefcase, Check, X, Loader2, Camera, User as UserIcon, Phone, Save } from 'lucide-react';
import MobileVerification from './MobileVerification';
import MobileMyBookings from './MobileMyBookings';
import MobileFavorites from './MobileFavorites';
import { updateProfile } from '@/lib/actions';

interface MobileProfileProps {
    user: any;
    profile: any;
    services: any[];
    stats: any;
    customerBookings: any[];
}

export default function MobileProfile({ 
    user, 
    profile, 
    services, 
    stats, 
    customerBookings 
}: MobileProfileProps) {
    const router = useRouter();
    const supabase = createClient();
    
    // UI Modal States
    const [showVerification, setShowVerification] = useState(false);
    const [showMyBookings, setShowMyBookings] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);

    // State for Escrow / Customer Bookings
    const [completingJob, setCompletingJob] = useState<string | null>(null);
    const [myBookings, setMyBookings] = useState<any[]>(customerBookings || []);

    // State for Provider Controls
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState<any[]>(stats?.pendingBookings || []);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    // Task 2: Edit Profile State
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    const [editForm, setEditForm] = useState({
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        phone: profile?.phone_number || ''
    });

    // 1. Escrow Release Logic (Customer confirming job is done)
    const handleCompleteJob = async (bookingId: string) => {
        if (!confirm('Are you sure the job is completed to your satisfaction?')) return;

        setCompletingJob(bookingId);
        try {
            await completeJob(bookingId);
            toast.success('Job marked as completed!');
            // Optimistically update the UI
            setMyBookings((prev: any[]) => prev.map((b: any) => b.id === bookingId ? { ...b, status: 'completed' } : b));
            router.refresh();
        } catch (error) {
            toast.error('Failed to complete job');
        } finally {
            setCompletingJob(null);
        }
    };

    // 2. Provider Controls (Accept/Reject bookings)
    const handleBookingAction = async (bookingId: string, action: 'confirmed' | 'cancelled') => {
        setIsUpdating(bookingId);
        try {
            await updateBookingStatus(bookingId, action);
            
            // Optimistic update
            setPendingRequests((prev: any[]) => prev.filter((b: any) => b.id !== bookingId));
            
            toast.success(`Booking ${action === 'confirmed' ? 'accepted' : 'rejected'}`);
            router.refresh();
        } catch (error) {
            toast.error("Failed to update booking");
        } finally {
            setIsUpdating(null);
        }
    };

    // 5. Safe Logout
    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await supabase.auth.signOut();
            window.location.href = '/auth/login'; // Hard redirect to prevent WSoD
        } catch (error) {
            console.error("Logout failed", error);
            setIsLoggingOut(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file");
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}_${Date.now()}.${fileExt}`;
            
            // Try avatars bucket first, fallback to service-images
            let bucketName = 'avatars';
            const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
            
            if (bucketError || !bucketData) {
                bucketName = 'service-images';
            }

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            toast.success("Profile picture updated!");
            router.refresh();
        } catch (error: any) {
            toast.error("Upload failed: " + (error.message || "Unknown error"));
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('firstName', editForm.firstName);
            formData.append('lastName', editForm.lastName);
            formData.append('phoneNumber', editForm.phone);

            await updateProfile(formData);
            toast.success("Profile updated!");
            setShowEditProfile(false);
            router.refresh();
        } catch (error: any) {
            toast.error("Update failed: " + (error.message || "Unknown error"));
        } finally {
            setIsSaving(false);
        }
    };

    const displayName = profile?.first_name 
        ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
        : user?.email?.split('@')[0] || 'User';

    const joinYear = profile?.created_at 
        ? new Date(profile.created_at).getFullYear() 
        : new Date().getFullYear();

    const isProvider = services && services.length > 0;

    // Render Modals Early
    if (showVerification) {
        return <div className="fixed inset-0 z-[100] bg-black"><MobileVerification onClose={() => setShowVerification(false)} /></div>;
    }
    
    if (showMyBookings) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#221e10] overflow-y-auto">
                <div className="sticky top-0 z-[110] p-4 bg-[#221e10]/90 backdrop-blur-md">
                    <button onClick={() => setShowMyBookings(false)} className="flex items-center gap-2 text-white/70 hover:text-white">
                        <ChevronLeft className="w-6 h-6" /> <span className="font-bold">Back</span>
                    </button>
                </div>
                <MobileMyBookings initialBookings={myBookings} />
            </div>
        );
    }
    
    if (showFavorites) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#221e10] overflow-y-auto">
                <div className="sticky top-0 z-[110] p-4 bg-[#221e10]/90 backdrop-blur-md border-b border-white/5 flex items-center gap-3">
                    <button onClick={() => setShowFavorites(false)} className="bg-white/5 rounded-full p-2 hover:bg-white/10">
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <h2 className="text-white font-bold text-lg">My Favorites</h2>
                </div>
                <MobileFavorites favorites={[]} /> {/* Empty for now until wired to backend favorites */}
            </div>
        );
    }

    if (showEditProfile) {
        return (
            <div className="fixed inset-0 z-[100] bg-[#0B0C15] flex flex-col font-sans">
                <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B0C15]">
                    <button onClick={() => setShowEditProfile(false)} className="text-white/70">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-white text-lg font-bold">Edit Profile</h2>
                    <div className="w-6" />
                </header>

                <main className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="flex flex-col items-center">
                        <div className="relative group" onClick={handleAvatarClick}>
                            <div className="h-24 w-24 rounded-full p-1 border-2 border-[#f5c619] bg-[#0B0C15]">
                                <div 
                                    className="h-full w-full rounded-full bg-cover bg-center overflow-hidden bg-[#1A1C2E] flex items-center justify-center text-2xl font-bold text-[#f5c619]" 
                                    style={profile?.avatar_url ? { backgroundImage: `url("${profile.avatar_url}")` } : {}}
                                >
                                    {!profile?.avatar_url && displayName[0]?.toUpperCase()}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
                                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 bg-[#f5c619] text-[#0B0C15] rounded-full p-1.5 border-4 border-[#0B0C15]">
                                <Camera className="w-4 h-4 font-bold" />
                            </div>
                        </div>
                        <p className="text-[#f5c619] text-xs font-bold mt-2 uppercase tracking-widest">Change Photo</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">First Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                                    <UserIcon className="w-4 h-4" />
                                </div>
                                <input 
                                    type="text" 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#f5c619] focus:outline-none transition-colors"
                                    value={editForm.firstName}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Last Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                                    <UserIcon className="w-4 h-4" />
                                </div>
                                <input 
                                    type="text" 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#f5c619] focus:outline-none transition-colors"
                                    value={editForm.lastName}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <input 
                                    type="tel" 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#f5c619] focus:outline-none transition-colors"
                                    placeholder="+251 ..."
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                </main>

                <div className="p-6 pb-12">
                    <button 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="w-full bg-[#f5c619] text-[#0B0C15] font-bold py-4 rounded-full shadow-lg shadow-[#f5c619]/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {isSaving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0B0C15] font-sans text-slate-400 min-h-screen selection:bg-[#f5c619] selection:text-[#0B0C15] overflow-x-hidden w-full h-full pb-24">
            {/* Top App Bar */}
            <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0B0C15]/80 backdrop-blur-md border-b border-white/5">
                <Link href="/" className="text-white/70 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/5">
                    <ChevronLeft className="w-6 h-6 ml-[-2px]" />
                </Link>
                <h2 className="text-white text-lg font-bold tracking-tight">Profile</h2>
                <button className="text-white/70 hover:text-white transition-colors p-2 -mr-2 rounded-full hover:bg-white/5" onClick={() => toast('Profile options opened')}>
                    <MoreHorizontal className="w-6 h-6" />
                </button>
            </header>

            <main className="flex flex-col items-center px-5 pt-6 pb-12 w-full gap-8 max-w-[480px] mx-auto">
                
                {/* 1. Profile Header Section */}
                <div className="flex flex-col items-center w-full relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#f5c619]/20 rounded-full blur-3xl -z-10"></div>
                    <div className="relative group cursor-pointer">
                        <div className="h-32 w-32 rounded-full p-1 border-2 border-[#f5c619] shadow-[0_0_15px_-3px_rgba(245,198,25,0.3)] bg-[#0B0C15]">
                            <div 
                                className="h-full w-full rounded-full bg-cover bg-center overflow-hidden bg-[#1A1C2E] flex items-center justify-center text-3xl font-bold text-[#f5c619]" 
                                style={profile?.avatar_url ? { backgroundImage: `url("${profile.avatar_url}")` } : {}}
                            >
                                {!profile?.avatar_url && displayName[0]?.toUpperCase()}
                            </div>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-[#f5c619] text-[#0B0C15] rounded-full p-1.5 border-4 border-[#0B0C15] flex items-center justify-center cursor-pointer hover:bg-[#e0b415] transition-colors" onClick={() => setShowEditProfile(true)}>
                            <Edit2 className="w-4 h-4 font-bold" />
                        </div>
                    </div>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange} 
                    />
                    <div className="mt-5 text-center">
                        <h1 className="text-white text-2xl font-bold leading-tight tracking-tight">{displayName}</h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">Member since {joinYear}</p>
                    </div>
                </div>

                {/* 2. My Bookings / Activity Section */}
                <div className="w-full space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xl font-bold text-white tracking-tight">My Activity</h2>
                        <button onClick={() => setShowMyBookings(true)} className="text-xs font-bold text-[#f5c619] uppercase tracking-wider">View All</button>
                    </div>
                    {myBookings.length === 0 ? (
                        <div className="p-6 rounded-2xl bg-[#13151f] border border-white/5 text-center shadow-xl shadow-black/40">
                            <p className="text-slate-400 text-sm">You haven't requested any services yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myBookings.slice(0, 2).map((booking) => (
                                <div key={booking.id} className="relative flex flex-col gap-4 p-4 rounded-[1.5rem] bg-[#13151f] border border-white/5 shadow-xl shadow-black/40 cursor-pointer" onClick={() => router.push(`/book/${booking.id}`)}>
                                    <div className="flex gap-4">
                                        <div className="flex-1 py-1 flex flex-col justify-between min-w-0">
                                            <div>
                                                <h3 className="text-white text-lg font-bold leading-tight truncate mb-1">{booking.services?.title || 'Service'}</h3>
                                                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                                    <Clock className="w-3.5 h-3.5 text-[#f5c619]" />
                                                    <span>{new Date(booking.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                    booking.status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    booking.status === 'completed' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                                                    booking.status === 'confirmed' ? 'bg-[#f5c619]/10 text-[#f5c619] border-[#f5c619]/20' :
                                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                }`}>
                                                    {booking.status === 'completed' ? 'Job Completed' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end justify-start py-1">
                                            <span className="font-bold text-[#f5c619]">{booking.services?.price} ETB</span>
                                        </div>
                                    </div>

                                    {/* Critical Action: Escrow Release for Paid Bookings */}
                                    {booking.status === 'paid' && (
                                        <>
                                            <div className="h-px w-full bg-white/5"></div>
                                            <div className="flex flex-col gap-2">
                                                <p className="text-xs text-slate-400">Payment is held securely in escrow.</p>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleCompleteJob(booking.id); }}
                                                    disabled={completingJob === booking.id}
                                                    className="h-12 w-full rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                                >
                                                    {completingJob === booking.id ? (
                                                        <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                                                    ) : (
                                                        <><CheckCircle className="w-5 h-5" /> Confirm Job Done</>
                                                    )}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Provider Dashboard Section (Conditional) */}
                {isProvider && (
                    <div className="w-full space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Briefcase className="w-6 h-6 text-[#f5c619]" />
                            <h2 className="text-xl font-bold text-white tracking-tight">Provider Dashboard</h2>
                        </div>

                        {/* Earnings Cards */}
                        <div className="flex gap-4 w-full">
                            {/* Pending Clearance */}
                            <div className="flex-1 p-4 rounded-[1.5rem] bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 shadow-lg">
                                <p className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div> Pending
                                </p>
                                <p className="text-xl font-bold text-white">{(stats?.escrow_balance || 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span></p>
                            </div>

                            {/* Available Payout */}
                            <div className="flex-1 p-4 rounded-[1.5rem] bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 shadow-lg">
                                <p className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div> Available
                                </p>
                                <p className="text-xl font-bold text-white">{(stats?.available_balance || 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span></p>
                            </div>
                        </div>

                        {/* Pending Requests */}
                        <h3 className="text-sm font-bold text-white px-1 mt-6">Pending Requests</h3>
                        {pendingRequests.length === 0 ? (
                            <div className="p-5 rounded-2xl bg-[#13151f] border border-white/5 text-center">
                                <p className="text-slate-400 text-sm">No pending requests at the moment.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingRequests.map((req: any) => (
                                    <div key={req.id} className="flex flex-col gap-4 p-4 rounded-[1.5rem] bg-[#13151f] border border-white/5 shadow-xl shadow-black/40">
                                        <div>
                                            <h4 className="text-white font-bold">{req.services?.title}</h4>
                                            <p className="text-xs text-slate-400 mt-1">{new Date(req.date).toLocaleString()}</p>
                                            <p className="text-sm font-medium text-[#f5c619] mt-2">Potential Earnings: {req.services?.price} ETB</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => handleBookingAction(req.id, 'cancelled')}
                                                disabled={isUpdating === req.id}
                                                className="flex-1 py-2.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold text-sm flex justify-center items-center gap-1 disabled:opacity-50"
                                            >
                                                {isUpdating === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Reject
                                            </button>
                                            <button 
                                                onClick={() => handleBookingAction(req.id, 'confirmed')}
                                                disabled={isUpdating === req.id}
                                                className="flex-1 py-2.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-semibold text-sm flex justify-center items-center gap-1 disabled:opacity-50"
                                            >
                                                {isUpdating === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accept
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 4. Settings Menu Section */}
                <div className="w-full space-y-4 mt-4">
                    <h2 className="text-xl font-bold text-white tracking-tight px-1">Settings</h2>
                    <div className="w-full flex flex-col gap-px bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.08] overflow-hidden">
                        
                        <div onClick={() => toast.info('This feature is coming in V2!')} className="group flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center size-10 rounded-full bg-[#f5c619]/10 text-[#f5c619]">
                                    <ClipboardList className="w-5 h-5" />
                                </div>
                                <span className="text-white text-base font-medium">My Favorites</span>
                            </div>
                            <ChevronLeft className="w-5 h-5 text-slate-500 rotate-180" />
                        </div>

                        <div className="group flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10 border-t border-white/[0.08]" onClick={() => toast.info('This feature is coming in V2!')}>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center size-10 rounded-full bg-[#f5c619]/10 text-[#f5c619]">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <span className="text-white text-base font-medium">Payment Methods</span>
                            </div>
                            <ChevronLeft className="w-5 h-5 text-slate-500 rotate-180" />
                        </div>

                        <div onClick={() => toast.info('This feature is coming in V2!')} className="group flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10 border-t border-white/[0.08]">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center size-10 rounded-full bg-[#f5c619]/10 text-[#f5c619]">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white text-base font-medium">Identity Verification</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                    <span className="text-green-400 text-[10px] font-semibold uppercase tracking-wide">Verified</span>
                                </div>
                                <ChevronLeft className="w-5 h-5 text-slate-500 rotate-180" />
                            </div>
                        </div>

                        <div className="group flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10 border-t border-white/[0.08]" onClick={() => toast.info('This feature is coming in V2!')}>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center size-10 rounded-full bg-[#f5c619]/10 text-[#f5c619]">
                                    <LifeBuoy className="w-5 h-5" />
                                </div>
                                <span className="text-white text-base font-medium">Help & Support</span>
                            </div>
                            <ChevronLeft className="w-5 h-5 text-slate-500 rotate-180" />
                        </div>
                    </div>
                </div>

                {/* 5. Safe Logout Button */}
                <div className="w-full mt-4 pt-4">
                    <button 
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full bg-[#f5c619] hover:bg-[#e0b415] active:scale-[0.98] disabled:opacity-70 transition-all duration-200 text-[#0B0C15] font-bold text-base py-4 px-6 rounded-full flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(245,198,25,0.4)]"
                    >
                        {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                        {isLoggingOut ? 'Logging Out...' : 'Log Out'}
                    </button>
                    <p className="text-center text-slate-600 text-xs mt-6">Version 2.4.0 • Midnight Gold</p>
                </div>
            </main>
        </div>
    );
}
