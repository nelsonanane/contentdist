import { createClient } from '@supabase/supabase-js';

// These environment variables need to be defined in your deployment environment
// For local development, you can use .env.local file (not committed to git)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database tables
export const TABLES = {
  USERS: 'users',
  BRAND_SETTINGS: 'brand_settings',
  PROJECTS: 'projects',
  CONTENT_POSTS: 'content_posts',
  SCHEDULES: 'schedules',
  SUBSCRIPTIONS: 'subscriptions',
};
