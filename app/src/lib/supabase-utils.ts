import { supabase, TABLES } from './supabase-config';
import { PostgrestError } from '@supabase/supabase-js';

// Types
export type User = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  preferences?: Record<string, unknown>;
  created_at: string;
};

export type BrandSetting = {
  id: string;
  user_id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  font: string;
  theme?: Record<string, unknown>;
  created_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  brand_id?: string;
  name: string;
  description?: string;
  settings?: Record<string, unknown>;
  created_at: string;
  is_archived: boolean;
};

export type ContentPost = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content?: string;
  media_urls?: string[];
  tags?: string[];
  status: 'draft' | 'published' | 'archived';
  scheduled_for?: string;
  published_at?: string;
  platforms?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  created_at: string;
};

export type Schedule = {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  frequency: Record<string, unknown>;
  platforms?: string[];
  is_active: boolean;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  tier: 'free' | 'pro' | 'enterprise';
  started_at: string;
  ends_at?: string;
  is_active: boolean;
  limits: {
    monthly_posts: number;
    storage_mb: number;
    team_members: number;
  };
};

// Error handling helper
export type DbResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

// User functions
export async function getCurrentUser(): Promise<DbResult<User>> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated', details: '', hint: '', code: 'UNAUTHENTICATED', name: 'AuthError' } };
  }
  
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .eq('id', user.id)
    .single();
    
  return { data, error };
}

// Brand settings functions
export async function getUserBrands(userId: string): Promise<DbResult<BrandSetting[]>> {
  const { data, error } = await supabase
    .from(TABLES.BRAND_SETTINGS)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  return { data, error };
}

// Project functions
export async function getUserProjects(userId: string): Promise<DbResult<Project[]>> {
  const { data, error } = await supabase
    .from(TABLES.PROJECTS)
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });
    
  return { data, error };
}

// Content post functions
export async function getProjectPosts(projectId: string): Promise<DbResult<ContentPost[]>> {
  const { data, error } = await supabase
    .from(TABLES.CONTENT_POSTS)
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
    
  return { data, error };
}

// Schedule functions
export async function getProjectSchedules(projectId: string): Promise<DbResult<Schedule[]>> {
  const { data, error } = await supabase
    .from(TABLES.SCHEDULES)
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
    
  return { data, error };
}

// Subscription functions
export async function getUserSubscription(userId: string): Promise<DbResult<Subscription>> {
  const { data, error } = await supabase
    .from(TABLES.SUBSCRIPTIONS)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
    
  return { data, error };
}

// Helper to check user's subscription tier limits
export async function checkUserPostLimit(userId: string): Promise<{
  canCreatePost: boolean;
  postsUsed: number;
  postsLimit: number;
}> {
  // Get user's subscription
  const { data: subscription } = await getUserSubscription(userId);
  
  if (!subscription) {
    return {
      canCreatePost: false,
      postsUsed: 0,
      postsLimit: 0
    };
  }
  
  // Count user's posts this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const { data: posts, error } = await supabase
    .from(TABLES.CONTENT_POSTS)
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());
  
  const postsUsed = error ? 0 : (posts?.length || 0);
  const postsLimit = subscription.limits.monthly_posts;
  
  return {
    canCreatePost: postsUsed < postsLimit,
    postsUsed,
    postsLimit
  };
}
