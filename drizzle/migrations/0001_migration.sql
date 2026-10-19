revoke insert, update on public.profiles from authenticated;
grant insert (id, display_name, avatar_url) on public.profiles to authenticated;
grant update (id, display_name, avatar_url) on public.profiles to authenticated;