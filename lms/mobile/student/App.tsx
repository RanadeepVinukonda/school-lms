import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore, authService, LoginScreen, API_BASE_URL, registerForPushNotifications } from '@genesis-lms/shared';
import AppNavigator from './src/navigation/AppNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  const { isAuthenticated, isLoading, setUser, setToken, setLoading } = useAuthStore();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setUser(user);
        }
      } catch {
        // No session
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const pushToken = await registerForPushNotifications();
        if (!pushToken) return;
        const token = useAuthStore.getState().token;
        await fetch(`${API_BASE_URL}/api/device-tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
        });
      } catch { /* notification registration non-critical */ }
    })();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login">
            {() => <LoginScreen role="student" />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
});
