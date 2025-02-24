import { z } from "astro/zod";

// https://qiita.com/api/v2/docs#%E3%82%B0%E3%83%AB%E3%83%BC%E3%83%97
export const GroupSchema = z.object({
  created_at: z.coerce.date(),
  description: z.string(),
  name: z.string(),
  private: z.boolean(),
  updated_at: z.coerce.date(),
  url_name: z.string(),
});

// https://qiita.com/api/v2/docs#%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC
export const UserSchema = z.object({
  description: z.string().nullable(),
  facebook_id: z.string().nullable(),
  followees_count: z.number(),
  followers_count: z.number(),
  github_login_name: z.string().nullable(),
  id: z.string(),
  items_count: z.number(),
  linkedin_id: z.string().nullable(),
  location: z.string().nullable(),
  name: z.string().nullable(),
  organization: z.string().nullable(),
  permanent_id: z.number(),
  profile_image_url: z.string(),
  team_only: z.boolean(),
  twitter_screen_name: z.string().nullable(),
  website_url: z.string().nullable(),
});

// https://qiita.com/api/v2/docs#%E3%82%BF%E3%82%AE%E3%83%B3%E3%82%B0
export const TaggingSchema = z.object({
  name: z.string(),
  versions: z.array(z.string()),
});

// https://qiita.com/api/v2/docs#%E3%83%81%E3%83%BC%E3%83%A0%E3%83%A1%E3%83%B3%E3%83%90%E3%83%BC
export const TeamMembershipSchema = z.object({
  description: z.string(),
  email: z.string(),
  id: z.string(),
  last_accessed_at: z.string(),
  name: z.string(),
});

// https://qiita.com/api/v2/docs#%E6%8A%95%E7%A8%BF
export const ItemSchema = z.object({
  rendered_body: z.string(),
  body: z.string(),
  coediting: z.boolean(),
  comments_count: z.number(),
  created_at: z.coerce.date(),
  group: GroupSchema.nullable(),
  id: z.string(),
  likes_count: z.number(),
  private: z.boolean(),
  reactions_count: z.number(),
  stocks_count: z.number(),
  tags: z.array(TaggingSchema),
  title: z.string(),
  updated_at: z.coerce.date(),
  url: z.string(),
  user: UserSchema,
  page_views_count: z.number().nullable(),
  team_membership: TeamMembershipSchema.nullable(),
  organization_url_name: z.string().nullable(),
  slide: z.boolean(),
});

export type Group = z.infer<typeof GroupSchema>;
export type User = z.infer<typeof UserSchema>;
export type Tagging = z.infer<typeof TaggingSchema>;
export type TeamMembership = z.infer<typeof TeamMembershipSchema>;
export type Item = z.infer<typeof ItemSchema>;
