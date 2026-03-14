import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { api } from '@/services/api/client';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- performDeletion is defined in same scope and stable
  }, []);

  const performDeletion = async () => {
    if (!user) return;

    setDeleting(true);

    try {
      const { error: deleteError } = await api.delete('/api/users/me');

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
