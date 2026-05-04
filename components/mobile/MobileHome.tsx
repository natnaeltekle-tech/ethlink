import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Handshake, Search, Building, Car, Map, Utensils, Camera, 
  Heart, Star, Home, Compass, Plus, MessageCircle, User, SlidersHorizontal 
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from '@/components/notification-bell';
import MobileMapExplore from './MobileMapExplore';
import MobileSearchFilters from './MobileSearchFilters';
import MobileNotifications from './MobileNotifications';

export default function MobileHome({ services = [] }: { services?: any[] }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  if (showNotifications) {
      return <div className="fixed inset-0 z-[100] bg-[#0B0C15]"><MobileNotifications />
      {/* Back button overlay for notifications */}
      <button onClick={() => setShowNotifications(false)} className="absolute top-12 right-6 z-[110] text-white/60 hover:text-white bg-black/50 p-2 rounded-full backdrop-blur-sm">✕</button>
      </div>;
  }

  if (showMap) {
      return <div className="fixed inset-0 z-[100] bg-[#0B0C15]"><MobileMapExplore services={services} onClose={() => setShowMap(false)} /></div>;
  }

  return (
    <div className="bg-[#f8f8f5] dark:bg-[#0B0C15] font-sans text-white selection:bg-[#f5c619] selection:text-black min-h-screen pb-32">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-[#f8f8f5]/80 dark:bg-[#0B0C15]/80 backdrop-blur-md">
        <div className="flex items-center p-4 pb-2 justify-between">
          <div className="flex items-center gap-2">
            <button 
              aria-label="Open notifications"
              className="bg-[#f5c619] text-black p-1.5 rounded-lg flex items-center justify-center cursor-pointer transition-transform active:scale-95" 
              onClick={() => setShowNotifications(true)}
            >
              <Handshake className="w-5 h-5 text-primary" />
            </button>
            <h2 className="text-white text-xl font-extrabold leading-tight tracking-tight">Eth-Links</h2>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={userId} />
          </div>
        </div>

        {/* Glass-morphic Search Bar */}
        <div className="px-4 py-3 flex flex-row gap-2 items-center w-full">
          <div className="flex w-full items-stretch bg-white/5 backdrop-blur-md border border-white/5 rounded-full h-12 overflow-hidden ring-1 ring-white/10 focus-within:ring-[#f5c619]/50 transition-all">
            <div className="text-[#f5c619] flex items-center justify-center pl-4">
              <Search className="w-5 h-5" />
            </div>
            <input 
              className="form-input flex w-full min-w-0 flex-1 border-none bg-transparent focus:outline-0 focus:ring-0 h-full placeholder:text-gray-500 px-4 text-base font-medium text-white" 
              placeholder="Search for luxury stays, cars, guides..." 
            />
          </div>
          <button onClick={() => setShowFilters(true)} className="h-12 w-12 shrink-0 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
              <SlidersHorizontal className="w-5 h-5 text-[#f5c619]" />
          </button>
        </div>
      </div>

      {/* Main Feed Content */}
      <main>
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-white text-2xl font-extrabold tracking-tight">Featured Listings</h2>
          <button className="text-[#f5c619] text-sm font-bold">View all</button>
        </div>

        {/* Listing Cards */}
        <div className="p-4 space-y-6">
          {services.map((service, index) => {
            const imageUrl = service.gallery?.[0] || service.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';
            
            return (
              <div key={service.id || index} className="flex flex-col items-stretch justify-start rounded-3xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/5 group relative">
                <div className="absolute bottom-36 right-4 z-10 bg-black/50 backdrop-blur-md rounded-full p-2 text-white" onClick={(e) => { e.preventDefault(); toast.success('Added to favorites!'); }}>
                    <Heart className="w-5 h-5 hover:fill-red-500 hover:text-red-500 transition-colors cursor-pointer" />
                </div>
                <div className="absolute bottom-36 left-4 z-10 bg-[#f5c619] text-black text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                    Premium
                </div>
                <Link href={'/services/' + service.id} className="flex flex-col w-full h-full">
                  <div className="relative w-full aspect-[4/3] overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-transform duration-500 group-hover:scale-110" 
                      style={{ backgroundImage: `url("${imageUrl}")` }}
                    ></div>
                  </div>
                  <div className="flex w-full flex-col gap-3 p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[#f5c619] text-sm font-bold uppercase tracking-wider">
                          {service.category} {service.location ? `• ${service.location}` : ''}
                        </p>
                        <h3 className="text-white text-xl font-bold leading-tight mt-1">{service.title}</h3>
                      </div>
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <Star className="w-[18px] h-[18px] text-[#f5c619] fill-[#f5c619]" />
                        <span className="text-white font-bold text-sm">{service.rating || 'New'}</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{service.description}</p>
                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[#f5c619] text-xl font-extrabold">{service.price} ETB</span>
                      </div>
                      <div className="flex items-center justify-center rounded-full h-10 px-6 bg-[#f5c619] text-black text-sm font-bold hover:bg-white transition-colors">
                        Explore
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </main>

      {showFilters && <MobileSearchFilters onClose={() => setShowFilters(false)} />}
    </div>
  );
}
