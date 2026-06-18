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
                Row: {
                    id: string
                    title: string
                    description: string
                    price: number
                    category: string
                    location: string | null
                    image_url: string | null
                    user_id: string
                    created_at: string
                    updated_at: string | null
                    is_active: boolean
                    gallery: string[] | null
                    latitude: number | null
                    longitude: number | null
                }
                Insert: {
                    id?: string
                    title: string
                    description: string
                    price: number
                    category: string
                    location?: string | null
                    image_url?: string | null
                    user_id: string
                    created_at?: string
                    updated_at?: string | null
                    is_active?: boolean
                    gallery?: string[] | null
                    latitude?: number | null
                    longitude?: number | null
                }
                Update: {
                    id?: string
                    title?: string
                    description?: string
                    price?: number
                    category?: string
                    location?: string | null
                    image_url?: string | null
                    user_id?: string
                    created_at?: string
                    updated_at?: string | null
                    is_active?: boolean
                    gallery?: string[] | null
                    latitude?: number | null
                    longitude?: number | null
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
                Row: {
                    id: string
                    first_name: string | null
                    last_name: string | null
                    full_name: string | null
                    phone_number: string | null
                    id_card_link: string | null
                    role: string | null
                    avatar_url: string | null
                    updated_at: string | null
                    username: string | null
                }
                Insert: {
                    id: string
                    first_name?: string | null
                    last_name?: string | null
                    full_name?: string | null
                    phone_number?: string | null
                    id_card_link?: string | null
                    role?: string | null
                    avatar_url?: string | null
                    updated_at?: string | null
                    username?: string | null
                }
                Update: {
                    id?: string
                    first_name?: string | null
                    last_name?: string | null
                    full_name?: string | null
                    phone_number?: string | null
                    id_card_link?: string | null
                    role?: string | null
                    avatar_url?: string | null
                    updated_at?: string | null
                    username?: string | null
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
                Row: {
                    id: string
                    service_id: string
                    sender_id: string
                    receiver_id: string
                    content: string
                    created_at: string
                    is_read: boolean
                }
                Insert: {
                    id?: string
                    service_id: string
                    sender_id: string
                    receiver_id: string
                    content: string
                    created_at?: string
                    is_read?: boolean
                }
                Update: {
                    id?: string
                    service_id?: string
                    sender_id?: string
                    receiver_id?: string
                    content?: string
                    created_at?: string
                    is_read?: boolean
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
                Row: {
                    id: string
                    user_id: string
                    title: string | null
                    content: string | null
                    link: string | null
                    is_read: boolean
                    created_at: string
                    type: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    title?: string | null
                    content?: string | null
                    link?: string | null
                    is_read?: boolean
                    created_at?: string
                    type?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string | null
                    content?: string | null
                    link?: string | null
                    is_read?: boolean
                    created_at?: string
                    type?: string | null
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
                    commission_amount: number | null
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
                    commission_amount?: number | null
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
                    commission_amount?: number | null
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
        }
        Views: {
            services_view: {
                Row: {
                    id: string
                    title: string
                    description: string
                    price: number
                    category: string
                    location: string | null
                    image_url: string | null
                    user_id: string
                    created_at: string
                    updated_at: string | null
                    is_active: boolean
                    gallery: string[] | null
                    latitude: number | null
                    longitude: number | null
                    avg_rating: number | null
                    total_reviews: number | null
                    provider_name: string | null
                    provider_avatar: string | null
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
                    full_name: string | null
                    username: string | null
                    avatar_url: string | null
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
            [_ in never]: never
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
export type ServiceView = Database["public"]["Views"]["services_view"]["Row"]
export type PublicProfile = Database["public"]["Views"]["public_profiles"]["Row"]

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
