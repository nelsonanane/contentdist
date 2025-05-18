export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Add existing tables from your schema
      brand_settings: {
        Row: {
          id: string
          user_id: string
          brand_name: string
          brand_description: string | null
          primary_color: string | null
          secondary_color: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          brand_name: string
          brand_description?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          brand_name?: string
          brand_description?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // Add our new content_generator_jobs table
      content_generator_jobs: {
        Row: {
          id: string
          user_id: string
          character_type: string
          character_attributes: Json
          topic: string
          status: string
          script: string | null
          image_url: string | null
          audio_url: string | null
          video_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          character_type: string
          character_attributes: Json
          topic: string
          status: string
          script?: string | null
          image_url?: string | null
          audio_url?: string | null
          video_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          character_type?: string
          character_attributes?: Json
          topic?: string
          status?: string
          script?: string | null
          image_url?: string | null
          audio_url?: string | null
          video_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // Add any other tables here
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
