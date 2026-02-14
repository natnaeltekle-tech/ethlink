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
