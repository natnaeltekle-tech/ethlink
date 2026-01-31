# Eth-Links: The AI-Powered Service Marketplace of Ethiopia 🇪🇹

![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-blueviolet?style=for-the-badge&logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Ready-green?style=for-the-badge&logo=pwa)
![Fintech Ready](https://img.shields.io/badge/Fintech-Ready-gold?style=for-the-badge)

**A decentralized service economy connecting 120M+ Ethiopians with verified providers via AI and Escrow payments.**

---

## 🚀 Core Modules (The 'Big 4')

### 🧠 AI Concierge
Powered by custom algorithms and Gemini AI, our hybrid search engine combines tradition keyword Matching with Fuzzy logic to help users find local services instantly.

### 🏦 Fintech Engine
Fully integrated **Telebirr H5** and **CBE Birr** payment flows with an internal Escrow Ledger. Money is held securely in the platform until the job is marked as complete, ensuring trust for both parties.

### 📱 Native PWA
A premium mobile-first experience. Installable on iOS and Android with Haptic Feedback, smooth Bottom Navigation, and Offline-first capabilities for low-connectivity areas.

### 🤝 Realtime Negotiation
Direct peer-to-peer chat system with presence indicators ('Online/Offline'), realtime message delivery via Supabase, and integrated image sharing for project requirements.

---

## 🏗️ Technical Architecture

*   **Frontend**: Next.js 16 (App Router), Tailwind CSS, Shadcn UI (Premium Dark/Luxury Theme).
*   **Backend**: Supabase (PostgreSQL, Row Level Security, Realtime, Storage).
*   **Security**: Admin-only Actions, Automated Profile Creation Triggers, and Strict RLS policies.

---

## ✨ Features List

*   **Provider Dashboard**: Comprehensive earnings tracking, Escrow balance management, and booking scheduling.
*   **Smart Listing**: Interactive Map Pins (Leaflet), High-res Photo Galleries, and Detailed Service Specs.
*   **Review System**: Verified-only feedback loop to maintain high service standards.
*   **Admin Control Center**: 'God Mode' for platform moderation, user verification, and dispute resolution.

---

## 🛠️ Setup & Local Development

### Prerequisites
- Node.js 18+ 
- Supabase Account

### Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/eth-links-v2.git

# Install dependencies
npm install

# Run the development server
npm run dev
```

### Environment Variables
Create a `.env.local` file in the root directory and add the following:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Fintech & AI
TELEBIRR_APP_ID=your_telebirr_id
GOOGLE_API_KEY=your_gemini_api_key
```

---

*Built with ❤️ for the Ethiopian Digital Economy.*
