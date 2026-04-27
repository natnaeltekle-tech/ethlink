import React from 'react';
import Link from 'next/link';
import { 
  Link2, Bell, Search, Building, Car, Map, Utensils, Camera, 
  Heart, Star, Home, Compass, Plus, MessageCircle, User 
} from 'lucide-react';

export default function MobileHome({ services = [] }: { services?: any[] }) {
  return (
    <div className="bg-[#f8f8f5] dark:bg-[#0B0C15] font-sans text-white selection:bg-[#f5c619] selection:text-black min-h-screen pb-32">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-[#f8f8f5]/80 dark:bg-[#0B0C15]/80 backdrop-blur-md">
        <div className="flex items-center p-4 pb-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#f5c619] text-black p-1.5 rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 font-bold" />
            </div>
            <h2 className="text-white text-xl font-extrabold leading-tight tracking-tight">Eth-Links</h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative flex items-center justify-center rounded-full w-10 h-10 bg-white/5 border border-white/10">
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#f5c619] rounded-full border-2 border-[#0B0C15]"></span>
            </button>
          </div>
        </div>

        {/* Glass-morphic Search Bar */}
        <div className="px-4 py-3">
          <label className="flex flex-col w-full">
            <div className="flex w-full items-stretch bg-white/5 backdrop-blur-md border border-white/5 rounded-full h-12 overflow-hidden ring-1 ring-white/10 focus-within:ring-[#f5c619]/50 transition-all">
              <div className="text-[#f5c619] flex items-center justify-center pl-4">
                <Search className="w-5 h-5" />
              </div>
              <input 
                className="form-input flex w-full min-w-0 flex-1 border-none bg-transparent focus:outline-0 focus:ring-0 h-full placeholder:text-gray-500 px-4 text-base font-medium text-white" 
                placeholder="Search for luxury stays, cars, guides..." 
              />
            </div>
          </label>
        </div>

        {/* Horizontal Scrollable Category Pills */}
        <div className="flex gap-3 px-4 pb-4 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
          <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-[#f5c619] px-5 shadow-lg shadow-[#f5c619]/20">
            <Building className="w-5 h-5 text-black" />
            <p className="text-black text-sm font-bold">Hotels</p>
          </div>
          <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white/5 backdrop-blur-md border border-white/5 px-5">
            <Car className="w-5 h-5 text-white" />
            <p className="text-white text-sm font-medium">Cars</p>
          </div>
          <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white/5 backdrop-blur-md border border-white/5 px-5">
            <Map className="w-5 h-5 text-white" />
            <p className="text-white text-sm font-medium">Guides</p>
          </div>
          <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white/5 backdrop-blur-md border border-white/5 px-5">
            <Utensils className="w-5 h-5 text-white" />
            <p className="text-white text-sm font-medium">Dining</p>
          </div>
          <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white/5 backdrop-blur-md border border-white/5 px-5">
            <Camera className="w-5 h-5 text-white" />
            <p className="text-white text-sm font-medium">Tours</p>
          </div>
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
              <div key={service.id || index} className="flex flex-col items-stretch justify-start rounded-3xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/5 group">
                <Link href={'/services/' + service.id} className="flex flex-col w-full h-full">
                  <div className="relative w-full aspect-[4/3] overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-transform duration-500 group-hover:scale-110" 
                      style={{ backgroundImage: `url("${imageUrl}")` }}
                    ></div>
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md rounded-full p-2 text-white">
                      <Heart className="w-5 h-5" />
                    </div>
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

    </div>
  );
}
