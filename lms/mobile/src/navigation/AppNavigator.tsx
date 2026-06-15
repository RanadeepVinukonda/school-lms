import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import LoginScreen from '../screens/auth/LoginScreen';
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentTasksScreen from '../screens/student/StudentTasksScreen';
import StudentExamsScreen from '../screens/student/StudentExamsScreen';
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import NotFoundScreen from '../screens/shared/NotFoundScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function StudentStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#4F46E5' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="StudentTasks" component={StudentTasksScreen} options={{ title: 'Tasks' }} />
      <Stack.Screen name="StudentExams" component={StudentExamsScreen} options={{ title: 'Exams' }} />
    </Stack.Navigator>
  );
}

function TeacherStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#4F46E5' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} options={{ title: 'Dashboard' }} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#4F46E5' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
    </Stack.Navigator>
  );
}

function getRootScreen(role: string | undefined): keyof RootStackParamList {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return 'Admin';
    case 'teacher':
      return 'Teacher';
    case 'student':
      return 'Student';
    default:
      return 'Auth';
  }
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            <Stack.Screen name="Student" component={StudentStack} />
            <Stack.Screen name="Teacher" component={TeacherStack} />
            <Stack.Screen name="Admin" component={AdminStack} />
          </>
        )}
        <Stack.Screen name="NotFound" component={NotFoundScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
