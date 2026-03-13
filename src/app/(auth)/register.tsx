import { useRouter } from 'expo-router';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { AuthForm } from '@/features/auth/components/AuthForm';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, loading, error, clearError } = useAuthContext();

  return (
    <AuthForm
      mode="register"
      loading={loading}
      error={error}
      onSubmit={signUp}
      onSwitchMode={() => router.replace('/(auth)/login')}
      onClearError={clearError}
    />
  );
}
