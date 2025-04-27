# Supabase Database Setup

This directory contains the database schema and configuration for the ContentDist application using Supabase.

## Database Schema

The database is structured with the following tables:

1. **users** - User accounts and profile information
   - Includes GDPR/CCPA compliance fields
   - Contains user preferences as JSONB

2. **brand_settings** - Brand configuration for each user
   - Colors, fonts, logos
   - Theme settings as JSONB

3. **projects** - Content projects created by users
   - Associated with users and brands
   - Project-specific settings as JSONB

4. **content_posts** - Content created within projects
   - Supports text content and media URLs
   - Tagging system and platform-specific data
   - Post metrics stored as JSONB

5. **schedules** - Publishing schedules for content
   - Frequency configuration stored as JSONB
   - Support for multiple platforms

6. **subscriptions** - User subscription tiers and limits
   - Supports Free, Pro, and Enterprise tiers
   - Configurable limits for posts, storage, and team members

## Security

- Row Level Security (RLS) is implemented for all tables
- Each table has policies to ensure users can only access their own data
- Subscription management is restricted to admin-level operations

## Performance Optimization

- Indexes are created for frequently queried fields
- Full-text search capabilities via pg_trgm extension
- JSONB for flexible data structures without schema changes
- Array types for efficient tag storage and querying

## Local Development

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Set the following environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
3. Use the migration files in the `migrations` directory to set up your database schema

## Database Migrations

The migrations are numbered and should be applied in sequence:

- `0001_create_base_schema.sql` - Creates all tables and indexes
- `0002_row_level_security.sql` - Implements RLS policies

You can apply these migrations through the Supabase dashboard SQL editor or the Supabase CLI.
