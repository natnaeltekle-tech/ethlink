# Eth-Links: The AI-Powered Service Marketplace of Ethiopia 🇪🇹

![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-blueviolet?style=for-the-badge&logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Ready-green?style=for-the-badge&logo=pwa)
![Fintech Ready](https://img.shields.io/badge/Fintech-Ready-gold?style=for-the-badge)

**A decentralized service economy connecting 120M+ Ethiopians with verified providers via AI and Escrow payments.**

---

## 🚀 Core Modules (The 'Big 4')

### 🧠 AI Concierge - Hybrid Search Architecture
Powered by a production-ready **Hybrid Search** system that combines Gemini AI with intelligent rule-based fallback:

- **AI-First Strategy**: Primary queries are processed by Gemini AI for natural language understanding
- **Intelligent Fallback**: Rule-based system with fuzzy logic activates when AI is unavailable
- **Fuzzy Matching**: Levenshtein distance algorithm handles typos and approximate keyword matching
- **Error Resilience**: Graceful degradation ensures 24/7 service availability
- **Observability**: Structured logging of all AI requests with model version, prompt length, and success metrics

### 🏦 Fintech Engine
Fully integrated **Chapa** payment gateway supporting TeleBirr, CBE Birr, bank cards, and more — all through a single redirect checkout. Money is held securely in the platform via an internal Escrow Ledger until the job is marked as complete, ensuring trust for both parties.

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

# Payments & AI
CHAPA_SECRET_KEY=your_chapa_secret_key
CHAPA_WEBHOOK_SECRET=your_chapa_webhook_secret  # Optional
GOOGLE_API_KEY=your_gemini_api_key

# AI Configuration (Optional - defaults provided)
GEMINI_MODEL_VERSION=gemini-pro        # Model version to use
AI_TEMPERATURE=0.7                     # Response creativity (0.0 - 1.0)
AI_MAX_TOKENS=2048                     # Maximum response length
AI_TOP_P=0.9                          # Nucleus sampling parameter
AI_TOP_K=40                           # Top-k sampling parameter
```

---

*Built with ❤️ for the Ethiopian Digital Economy.*
