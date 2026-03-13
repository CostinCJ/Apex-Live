import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/services/supabase/client';
import { useAuthContext } from '@/features/auth/context/AuthContext';

export function useAccountDeletion() {
  const { user, signOut } = useAuthContext();
  const [deleting, setDeleting] = useState(false);

  const requestDeletion = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void performDeletion(),
        },
      ],
    );
  }, []);

  const performDeletion = async () => {
    if (!user) return;

    setDeleting(true);

    try {
      // Call the export_user_data function first for a final backup opportunity
      // Then delete all user data (cascade deletes handle related tables)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (deleteError) {
        console.error('Account deletion error:', deleteError);
        Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
        setDeleting(false);
        return;
      }

      // Sign out after deletion
      await signOut();
    } catch (error) {
      console.error('Account deletion error:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  return {
    requestDeletion,
    deleting,
  };
}
