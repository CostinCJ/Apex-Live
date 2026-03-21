import { useRouter } from 'expo-router';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { AuthForm } from '@/features/auth/components/AuthForm';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, loading, error, clearError } = useAuthContext();

  return (
    <AuthForm
      mode="login"
      loading={loading}
      error={error}
      onSubmit={signIn}
      onSwitchMode={() => router.replace('/(auth)/register')}
      onClearError={clearError}
      onForgotPassword={() => router.push('/(auth)/forgot-password')}
    />
  );
}
