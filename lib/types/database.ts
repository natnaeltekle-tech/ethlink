export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            services: {
                // Synced with live schema (market-ai-v3) 2026-11-15
                Row: {
                    id: string
                    title: string
                    description: string | null
                    price: number // NOT NULL: 20261115100100_services_price_not_null.sql
                    category: string
                    location: string | null
                    image_url: string | null
                    user_id: string
                    created_at: string
                    updated_at: string
                    images: string[] | null
                    is_active: boolean | null
                    gallery: string[] | null
                    latitude: number | null
                    longitude: number | null
                    amenities: string[] | null
                    pricing_unit: 'fixed' | 'per_hour' | 'per_day' | 'starting_from'
                    working_days: string[]
                    opens_at: string | null
                    closes_at: string | null
                    whats_included: string | null
                }
                Insert: {
                    id?: string
                    title: string
                    description?: string | null
                    price: number
                    category: string
                    location?: string | null
                    image_url?: string | null
                    user_id: string
                    created_at?: string
                    updated_at?: string
                    images?: string[] | null
                    is_active?: boolean | null
                    gallery?: string[] | null
                    latitude?: number | null
                    longitude?: number | null
                    amenities?: string[] | null
                    pricing_unit?: 'fixed' | 'per_hour' | 'per_day' | 'starting_from'
                    working_days?: string[]
                    opens_at?: string | null
                    closes_at?: string | null
                    whats_included?: string | null
                }
                Update: {
                    id?: string
                    title?: string
                    description?: string | null
                    price?: number
                    category?: string
                    location?: string | null
                    image_url?: string | null
                    user_id?: string
                    created_at?: string
                    updated_at?: string
                    images?: string[] | null
                    is_active?: boolean | null
                    gallery?: string[] | null
                    latitude?: number | null
                    longitude?: number | null
                    amenities?: string[] | null
                    pricing_unit?: 'fixed' | 'per_hour' | 'per_day' | 'starting_from'
                    working_days?: string[]
                    opens_at?: string | null
                    closes_at?: string | null
                    whats_included?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "services_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                // Synced with live schema + 20261115120000_prelaunch_catch_up.sql.
                // role / is_verified are guarded by a trigger: clients may only go user → provider.
                Row: {
                    id: string
                    first_name: string | null
                    last_name: string | null
                    full_name: string | null
                    phone_number: string | null
                    id_card_link: string | null
                    role: 'user' | 'provider' | 'admin'
                    is_verified: boolean | null
                    avatar_url: string | null
                    updated_at: string | null
                    username: string | null
                    email: string | null
                    business_name: string | null
                    business_category: string | null
                    /** legacy; app uses phone_number */
                    phone: string | null
                    /** legacy; app uses id_card_link */
                    id_card_url: string | null
                    account_type: 'individual' | 'business' | null
                    /** Workflow: unsubmitted → pending → verified | rejected (admin-only except → pending) */
                    verification_status: 'unsubmitted' | 'pending' | 'verified' | 'rejected'
                    rejection_reason: string | null
                    verification_submitted_at: string | null
                    verified_at: string | null
                    has_business_license: boolean
                }
                Insert: {
                    id: string
                    first_name?: string | null
                    last_name?: string | null
                    full_name?: string | null
                    phone_number?: string | null
                    id_card_link?: string | null
                    role?: 'user' | 'provider' | 'admin'
                    is_verified?: boolean | null
                    avatar_url?: string | null
                    updated_at?: string | null
                    username?: string | null
                    email?: string | null
                    business_name?: string | null
                    business_category?: string | null
                    phone?: string | null
                    id_card_url?: string | null
                    account_type?: 'individual' | 'business' | null
                    verification_status?: 'unsubmitted' | 'pending' | 'verified' | 'rejected'
                    rejection_reason?: string | null
                    verification_submitted_at?: string | null
                    verified_at?: string | null
                    has_business_license?: boolean
                }
                Update: {
                    id?: string
                    first_name?: string | null
                    last_name?: string | null
                    full_name?: string | null
                    phone_number?: string | null
                    id_card_link?: string | null
                    role?: 'user' | 'provider' | 'admin'
                    is_verified?: boolean | null
                    avatar_url?: string | null
                    updated_at?: string | null
                    username?: string | null
                    email?: string | null
                    business_name?: string | null
                    business_category?: string | null
                    phone?: string | null
                    id_card_url?: string | null
                    account_type?: 'individual' | 'business' | null
                    verification_status?: 'unsubmitted' | 'pending' | 'verified' | 'rejected'
                    rejection_reason?: string | null
                    verification_submitted_at?: string | null
                    verified_at?: string | null
                    has_business_license?: boolean
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            reviews: {
                Row: {
                    id: string
                    service_id: string
                    user_id: string
                    rating: number
                    comment: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    service_id: string
                    user_id: string
                    rating: number
                    comment?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    service_id?: string
                    user_id?: string
                    rating?: number
                    comment?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "reviews_service_id_fkey"
                        columns: ["service_id"]
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "reviews_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            messages: {
                // Live schema + 20261117090000_chat_messaging.sql. Clients may only
                // insert as themselves and (as receiver) set is_read = true.
                Row: {
                    id: number
                    service_id: string
                    sender_id: string
                    receiver_id: string
                    content: string
                    created_at: string
                    is_read: boolean
                    read_at: string | null
                    listing_id: number | null
                }
                Insert: {
                    id?: number
                    service_id: string
                    sender_id: string
                    receiver_id: string
                    content: string
                    created_at?: string
                    is_read?: boolean
                    read_at?: string | null
                    listing_id?: number | null
                }
                Update: {
                    id?: number
                    service_id?: string
                    sender_id?: string
                    receiver_id?: string
                    content?: string
                    created_at?: string
                    is_read?: boolean
                    read_at?: string | null
                    listing_id?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "messages_service_id_fkey"
                        columns: ["service_id"]
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "messages_sender_id_fkey"
                        columns: ["sender_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "messages_receiver_id_fkey"
                        columns: ["receiver_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            favorites: {
                Row: {
                    id: string
                    user_id: string
                    service_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    service_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    service_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "favorites_service_id_fkey"
                        columns: ["service_id"]
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "favorites_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            notifications: {
                // App writes content + type; title/message are legacy (nullable).
                Row: {
                    id: string
                    user_id: string
                    title: string | null
                    message: string | null
                    content: string | null
                    link: string | null
                    is_read: boolean
                    created_at: string
                    type: 'booking' | 'payment' | 'message' | 'info' | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    title?: string | null
                    message?: string | null
                    content?: string | null
                    link?: string | null
                    is_read?: boolean
                    created_at?: string
                    type?: 'booking' | 'payment' | 'message' | 'info' | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string | null
                    message?: string | null
                    content?: string | null
                    link?: string | null
                    is_read?: boolean
                    created_at?: string
                    type?: 'booking' | 'payment' | 'message' | 'info' | null
                }
                Relationships: [
                    {
                        foreignKeyName: "notifications_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            bookings: {
                Row: {
                    id: string
                    service_id: string
                    user_id: string
                    date: string
                    status: string
                    created_at: string
                    guests: number
                    total_price: number | null
                    provider_earnings: number | null
                    commission_rate: number | null
                    commission_amount: number | null
                    dispute_reason: string | null
                    dispute_resolution: string | null
                    dispute_resolved_at: string | null
                }
                Insert: {
                    id?: string
                    service_id: string
                    user_id: string
                    date: string
                    status?: string
                    created_at?: string
                    guests?: number
                    total_price?: number | null
                    provider_earnings?: number | null
                    commission_rate?: number | null
                    commission_amount?: number | null
                    dispute_reason?: string | null
                    dispute_resolution?: string | null
                    dispute_resolved_at?: string | null
                }
                Update: {
                    id?: string
                    service_id?: string
                    user_id?: string
                    date?: string
                    status?: string
                    created_at?: string
                    guests?: number
                    total_price?: number | null
                    provider_earnings?: number | null
                    commission_rate?: number | null
                    commission_amount?: number | null
                    dispute_reason?: string | null
                    dispute_resolution?: string | null
                    dispute_resolved_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "bookings_service_id_fkey"
                        columns: ["service_id"]
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "bookings_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            notes: {
                Row: {
                    id: string
                    title: string | null
                    content: string | null
                    created_at: string
                    user_id: string | null
                }
                Insert: {
                    id?: string
                    title?: string | null
                    content?: string | null
                    created_at?: string
                    user_id?: string | null
                }
                Update: {
                    id?: string
                    title?: string | null
                    content?: string | null
                    created_at?: string
                    user_id?: string | null
                }
                Relationships: []
            }
            listings: {
                Row: {
                    id: number
                    title: string
                    description: string | null
                    price: number
                    category: string | null
                    image_url: string | null
                    user_id: string
                    created_at: string
                }
                Insert: {
                    id?: number
                    title: string
                    description?: string | null
                    price: number
                    category?: string | null
                    image_url?: string | null
                    user_id: string
                    created_at?: string
                }
                Update: {
                    id?: number
                    title?: string
                    description?: string | null
                    price?: number
                    category?: string | null
                    image_url?: string | null
                    user_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "listings_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            payments: {
                Row: {
                    id: string
                    booking_id: string
                    amount: number
                    status: string
                    tx_ref: string
                    provider_earnings: number | null
                    commission_amount: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    booking_id: string
                    amount: number
                    status?: string
                    tx_ref: string
                    provider_earnings?: number | null
                    commission_amount?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    booking_id?: string
                    amount?: number
                    status?: string
                    tx_ref?: string
                    provider_earnings?: number | null
                    commission_amount?: number | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "payments_booking_id_fkey"
                        columns: ["booking_id"]
                        referencedRelation: "bookings"
                        referencedColumns: ["id"]
                    }
                ]
            }
            processed_payments: {
                Row: {
                    id: string
                    tx_ref: string
                    booking_id: string
                    provider: string
                    processed_at: string
                    commission_amount: number | null
                    provider_earnings: number | null
                }
                Insert: {
                    id?: string
                    tx_ref: string
                    booking_id: string
                    provider: string
                    processed_at?: string
                    commission_amount?: number | null
                    provider_earnings?: number | null
                }
                Update: {
                    id?: string
                    tx_ref?: string
                    booking_id?: string
                    provider?: string
                    processed_at?: string
                    commission_amount?: number | null
                    provider_earnings?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "processed_payments_booking_id_fkey"
                        columns: ["booking_id"]
                        referencedRelation: "bookings"
                        referencedColumns: ["id"]
                    }
                ]
            }
            system_settings: {
                Row: {
                    key: string
                    value: string
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    key: string
                    value: string
                    created_at?: string
                    updated_at?: string | null
                }
                Update: {
                    key?: string
                    value?: string
                    created_at?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            ai_logs: {
                // Written only with the service role (lib/gemini.ts)
                Row: {
                    id: string
                    created_at: string
                    model_version: string
                    prompt_length: number
                    success: boolean
                    input_tokens: number | null
                    output_tokens: number | null
                    total_tokens: number | null
                    fallback_used: boolean
                    error_message: string | null
                    metadata: Json | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    model_version: string
                    prompt_length?: number
                    success: boolean
                    input_tokens?: number | null
                    output_tokens?: number | null
                    total_tokens?: number | null
                    fallback_used?: boolean
                    error_message?: string | null
                    metadata?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    model_version?: string
                    prompt_length?: number
                    success?: boolean
                    input_tokens?: number | null
                    output_tokens?: number | null
                    total_tokens?: number | null
                    fallback_used?: boolean
                    error_message?: string | null
                    metadata?: Json | null
                }
                Relationships: []
            }
            provider_verifications: {
                // Private screening data: owner + service role only (RLS)
                Row: {
                    user_id: string
                    id_type: 'fayda' | 'kebele' | 'passport' | 'drivers_license'
                    id_front_path: string
                    id_back_path: string | null
                    selfie_path: string
                    license_path: string | null
                    phone_whatsapp: boolean
                    phone_telegram: boolean
                    service_modes: string[]
                    service_zones: string[]
                    payout_telebirr_phone: string | null
                    payout_cbe_account: string | null
                    payout_account_name: string
                    years_experience: number | null
                    bio: string | null
                    created_at: string
                    updated_at: string
                    reviewed_at: string | null
                    reviewed_by: string | null
                }
                Insert: {
                    user_id: string
                    id_type: 'fayda' | 'kebele' | 'passport' | 'drivers_license'
                    id_front_path: string
                    id_back_path?: string | null
                    selfie_path: string
                    license_path?: string | null
                    phone_whatsapp?: boolean
                    phone_telegram?: boolean
                    service_modes?: string[]
                    service_zones?: string[]
                    payout_telebirr_phone?: string | null
                    payout_cbe_account?: string | null
                    payout_account_name: string
                    years_experience?: number | null
                    bio?: string | null
                    created_at?: string
                    updated_at?: string
                    reviewed_at?: string | null
                    reviewed_by?: string | null
                }
                Update: {
                    user_id?: string
                    id_type?: 'fayda' | 'kebele' | 'passport' | 'drivers_license'
                    id_front_path?: string
                    id_back_path?: string | null
                    selfie_path?: string
                    license_path?: string | null
                    phone_whatsapp?: boolean
                    phone_telegram?: boolean
                    service_modes?: string[]
                    service_zones?: string[]
                    payout_telebirr_phone?: string | null
                    payout_cbe_account?: string | null
                    payout_account_name?: string
                    years_experience?: number | null
                    bio?: string | null
                    created_at?: string
                    updated_at?: string
                    reviewed_at?: string | null
                    reviewed_by?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            services_view: {
                // Definition: supabase/migrations/20261115100000_services_view_add_gallery_coords.sql
                // Nullability follows the underlying services columns. Not exposed: amenities.
                Row: {
                    id: string
                    title: string
                    category: string
                    description: string | null
                    price: number
                    location: string | null
                    image_url: string | null
                    user_id: string
                    created_at: string
                    updated_at: string
                    images: string[] | null
                    is_active: boolean | null
                    /** COALESCE(avg(reviews.rating), 0) — 0 when unrated */
                    avg_rating: number
                    review_count: number
                    gallery: string[] | null
                    latitude: number | null
                    longitude: number | null
                    pricing_unit: 'fixed' | 'per_hour' | 'per_day' | 'starting_from'
                    working_days: string[]
                    opens_at: string | null
                    closes_at: string | null
                    whats_included: string | null
                    amenities: string[] | null
                    provider_verified: boolean
                }
                Relationships: [
                    {
                        foreignKeyName: "services_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            public_profiles: {
                Row: {
                    id: string
                    first_name: string | null
                    last_name: string | null
                    full_name: string | null
                    username: string | null
                    avatar_url: string | null
                    is_verified: boolean | null
                    account_type: 'individual' | 'business' | null
                    business_name: string | null
                    has_business_license: boolean
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Functions: {
            get_my_conversations: {
                Args: Record<string, never>
                Returns: {
                    service_id: string
                    service_title: string
                    service_owner_id: string
                    other_user_id: string
                    other_name: string | null
                    other_avatar: string | null
                    other_is_verified: boolean
                    other_has_license: boolean
                    last_message: string
                    last_sender_id: string
                    last_at: string
                    unread_count: number
                }[]
            }
            can_message: {
                Args: { p_service: string; p_sender: string; p_receiver: string }
                Returns: boolean
            }
            is_verified_provider: {
                Args: { p_user_id: string }
                Returns: boolean
            }
            has_booking_on_service: {
                Args: { p_service_id: string }
                Returns: boolean
            }
            my_verification_status: {
                Args: Record<string, never>
                Returns: string
            }
            process_payment_confirmation: {
                Args: {
                    p_tx_ref: string
                    p_booking_id: string
                    p_provider: string
                    p_commission: number
                    p_provider_earnings: number
                }
                Returns: Json
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Domain Model Type Helpers
export type Service = Database["public"]["Tables"]["services"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Booking = Database["public"]["Tables"]["bookings"]["Row"]
export type Review = Database["public"]["Tables"]["reviews"]["Row"]
export type Message = Database["public"]["Tables"]["messages"]["Row"]
export type Favorite = Database["public"]["Tables"]["favorites"]["Row"]
export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
export type Note = Database["public"]["Tables"]["notes"]["Row"]
export type Listing = Database["public"]["Tables"]["listings"]["Row"]
export type Payment = Database["public"]["Tables"]["payments"]["Row"]
export type SystemSetting = Database["public"]["Tables"]["system_settings"]["Row"]
export type ProcessedPayment = Database["public"]["Tables"]["processed_payments"]["Row"]
export type ServiceView = Database["public"]["Views"]["services_view"]["Row"]
export type PublicProfile = Database["public"]["Views"]["public_profiles"]["Row"]

// Safe, client-shareable provider info. Mirrors the public_profiles view
// columns — never contains phone, phone_number, id_card_url, or email.
export interface PublicProviderInfo {
    id: string
    first_name: string
    last_name: string
    full_name: string
    username: string | null
    avatar_url: string | null
    is_verified: boolean
    has_business_license: boolean
    account_type: 'individual' | 'business' | null
    business_name: string | null
}

// Composite types for joined queries
export interface ReviewProfile {
    first_name: string
    last_name: string
    username: string | null
    avatar_url: string | null
    full_name: string
}

export interface ReviewWithProfile extends Review {
    profiles: ReviewProfile | null
}
export type ProviderVerification = Database["public"]["Tables"]["provider_verifications"]["Row"]
