import { createClient } from './supabase-browser';

// Type for brand settings
export interface BrandSettings {
  id?: string;
  user_id: string;
  brand_name: string;
  brand_description: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Database service for brand settings
export const brandSettingsService = {
  // Get brand settings for a user
  async getBrandSettings(userId: string): Promise<{ data: BrandSettings | null; error: any }> {
    const supabase = createClient();
    
    try {
      // First try with user_id
      const { data, error } = await supabase
        .from('brand_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (data) {
        return { data, error: null };
      }
      
      // If error or no data, try with brand_name (backward compatibility)
      const { data: altData, error: altError } = await supabase
        .from('brand_settings')
        .select('*')
        .eq('brand_name', userId)
        .single();
      
      return { data: altData, error: altError };
    } catch (error) {
      console.error('Error in getBrandSettings:', error);
      return { data: null, error };
    }
  },
  
  // Create or update brand settings
  async saveBrandSettings(settings: BrandSettings): Promise<{ data: BrandSettings | null; error: any }> {
    const supabase = createClient();
    
    try {
      // Check if settings already exist for this user
      const { data: existingSettings } = await supabase
        .from('brand_settings')
        .select('id')
        .eq('user_id', settings.user_id)
        .single();
      
      if (existingSettings) {
        // Update existing settings
        const { data, error } = await supabase
          .from('brand_settings')
          .update({
            brand_name: settings.brand_name,
            brand_description: settings.brand_description,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            logo_url: settings.logo_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSettings.id)
          .select()
          .single();
        
        return { data, error };
      } else {
        // Try to create new settings
        try {
          const { data, error } = await supabase
            .from('brand_settings')
            .insert({
              user_id: settings.user_id,
              brand_name: settings.brand_name,
              brand_description: settings.brand_description,
              primary_color: settings.primary_color,
              secondary_color: settings.secondary_color,
              logo_url: settings.logo_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          return { data, error };
        } catch (error) {
          console.error('Failed to insert with user_id, trying without FK:', error);
          
          // If FK error, try creating a record without the FK dependency
          const { data, error: insertError } = await supabase.rpc('create_brand_settings_safe', {
            p_user_id: settings.user_id,
            p_brand_name: settings.brand_name,
            p_brand_description: settings.brand_description,
            p_primary_color: settings.primary_color,
            p_secondary_color: settings.secondary_color,
            p_logo_url: settings.logo_url
          });
          
          return { data, error: insertError };
        }
      }
    } catch (error) {
      console.error('Error in saveBrandSettings:', error);
      return { data: null, error };
    }
  },
  
  // Upload logo file
  async uploadLogo(userId: string, file: File): Promise<{ url: string | null; error: any }> {
    const supabase = createClient();
    
    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `brand_logos/${fileName}`;
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from('brand_assets')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      });
    
    if (error) {
      return { url: null, error };
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('brand_assets')
      .getPublicUrl(filePath);
    
    return { url: publicUrl, error: null };
  }
};
