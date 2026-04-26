import React from 'react';
import { 
  Link2, Bell, Search, Building, Car, Map, Utensils, Camera, 
  Heart, Star, Home, Compass, Plus, MessageCircle, User 
} from 'lucide-react';

export default function MobileHome({ services = [] }: { services?: any[] }) {
  // If services is empty, use the mock data from the HTML
  const displayServices = services.length > 0 ? services : [
    {
      id: 1,
      type: "Hotel • Addis Ababa",
      title: "Skyline Boutique & Spa",
      rating: 4.9,
      description: "Experience unmatched luxury in the heart of the capital with panoramic terrace views and world-class spa facilities.",
      price: "$250",
      unit: "/ night",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDO3snyiHJn3LKdhyCI5_Ik11EBEXubBy9kudCAXM9ioIpGEu8lIyD_2D0z4N3QEz5FV5ENpEfH43FQZpfp58lKl3GUGqHrCaomP8ewxKU8Q7ZmE44YccpQAzkR9xCqs6bu1O_SxRGo-Yb8trESLroKL45wA0Oqip11s20uilo4O-9hgPM3_8-VKP947ynKyfU3ln_O3IEWEcJQkD_ZlJkCAhKkFp5jLlCcChBSdTFNzsx5DfjO6pQW2O7HlpXZk_FxDQUJQsdr6I",
      badge: "Premium"
    },
    {
      id: 2,
      type: "Rental • Luxury SUV",
      title: "Land Cruiser V8 Edition",
      rating: 5.0,
      description: "Bullet-proof glass and executive interior. Professional driver included for all your regional travels.",
      price: "$180",
      unit: "/ day",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB6p5ELSPZW4MN6qrHWxEApbtuKMbdcjqpSTEHTjdwe6rU0W_E2VEdE-J4LY0-wO_YWKxssbga25sTCY174Kbed6kmL8bQeOtc_gDm_8fulatpZQ5dD6RuzwrPAdBlHTFx6NL1zSyguHWKvT0sS_4FDO3Ty3-WeZpc_06J_aCQvjKx_QnzAlgcVrwTfF-_8LUJYABDIGxim1ShcU1-xHEBOx62dSASFkrJRgDJBsgu5qLzjJ3b1lmqPDfaH0uhAV-8TdE3hgdsIXF8",
      badge: ""
    },
    {
      id: 3,
      type: "Dining • Fine Cuisine",
      title: "Luce Fine Dining",
      rating: 4.8,
      description: "A culinary journey through Ethiopian heritage and modern fusion. Reservations recommended.",
      price: "$$$",
      unit: " • Bole District",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD1XcfOzjE9nNeor_JiMVRbHtYaOpnVRwHfXYSb50XjoOjWt_S7V5qOx7ra2C41sQJT1cDtHO-ztKd9Bh-UF0kIfDo5jMzxYXmYRzxqesmIi9E4Vw3GKa9VFciGzhY-H9LPJ1TxV2Dpm1brYwzKjoY2cGPGxG7gr_06aJRaUYIb3BCkyyax9bJ3DpjUJG6yGjRQdAMNiXs7ZjvNt1wi3H-g7q-w95l00N81GrFW64yMlB-kWqYadrxhxqnSLBHGvSn9IAUH1pqm6Zc",
      badge: "Hot Choice"
    }
  ];

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
          {displayServices.map((service, index) => (
            <div key={index} className="flex flex-col items-stretch justify-start rounded-3xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/5 group">
              <div className="relative w-full aspect-[4/3] overflow-hidden">
                <div 
                  className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-transform duration-500 group-hover:scale-110" 
                  style={{ backgroundImage: `url("${service.image}")` }}
                ></div>
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md rounded-full p-2 text-white">
                  <Heart className="w-5 h-5" />
                </div>
                {service.badge && (
                  <div className="absolute bottom-4 left-4 bg-[#f5c619] text-black text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    {service.badge}
                  </div>
                )}
              </div>
              <div className="flex w-full flex-col gap-3 p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[#f5c619] text-sm font-bold uppercase tracking-wider">{service.type}</p>
                    <h3 className="text-white text-xl font-bold leading-tight mt-1">{service.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                    <Star className="w-[18px] h-[18px] text-[#f5c619] fill-[#f5c619]" />
                    <span className="text-white font-bold text-sm">{service.rating}</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2">{service.description}</p>
                <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[#f5c619] text-xl font-extrabold">{service.price}</span>
                    <span className="text-gray-500 text-sm">{service.unit}</span>
                  </div>
                  <button className="flex items-center justify-center rounded-full h-10 px-6 bg-[#f5c619] text-black text-sm font-bold hover:bg-white transition-colors">
                    Explore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Glass-morphic Bottom Navigation */}
      <nav className="fixed bottom-6 left-4 right-4 z-50">
        <div className="bg-white/5 backdrop-blur-md border border-white/5 flex items-center justify-around h-16 rounded-full px-4 shadow-2xl shadow-black/50">
          <button className="flex flex-col items-center justify-center text-[#f5c619]">
            <Home className="w-6 h-6 fill-current" />
            <span className="text-[10px] font-bold mt-0.5">Home</span>
          </button>
          <button className="flex flex-col items-center justify-center text-gray-500">
            <Compass className="w-6 h-6" />
            <span className="text-[10px] font-medium mt-0.5">Explore</span>
          </button>
          
          {/* Central Add Listing Button */}
          <div className="-mt-12">
            <button className="w-14 h-14 rounded-full bg-[#f5c619] text-black flex items-center justify-center shadow-[0_0_20px_rgba(245,198,25,0.3)] active:scale-95 transition-transform border-[6px] border-[#0B0C15]">
               <Plus className="w-8 h-8 font-bold text-black" />
            </button>
          </div>
          
          <button className="flex flex-col items-center justify-center text-gray-500">
            <MessageCircle className="w-6 h-6" />
            <span className="text-[10px] font-medium mt-0.5">Messages</span>
          </button>
          <button className="flex flex-col items-center justify-center text-gray-500">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium mt-0.5">Profile</span>
          </button>
        </div>
      </nav>

      {/* Safe area spacing for mobile */}
      <div className="h-10 bg-[#0B0C15]"></div>
    </div>
  );
}
