import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Profile {
  id?: string;
  user_id?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
  telegram_code?: number;
  telegram_user_id?: number;
  courses?: number[];
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Ошибка загрузки профиля');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const updateProfile = (newProfile: Profile) => {
    setProfile(newProfile);
  };

  // Get display name with fallback logic
  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Пользователь';
  };

  // Get avatar URL with fallback
  const getAvatarUrl = () => {
    return profile?.avatar_url || null;
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    getDisplayName,
    getAvatarUrl,
  };
};