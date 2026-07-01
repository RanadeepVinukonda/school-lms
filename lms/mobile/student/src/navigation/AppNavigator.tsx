import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

// Screen Imports
import DashboardScreen from '../screens/DashboardScreen';
import SubjectsScreen from '../screens/SubjectsScreen';
import SubjectDetailScreen from '../screens/SubjectDetailScreen';
import AITutorScreen from '../screens/AITutorScreen';
import GamificationScreen from '../screens/GamificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import QuizScreen from '../screens/QuizScreen';
import LabsScreen from '../screens/LabsScreen';
import CodingScreen from '../screens/CodingScreen';
import PrePrimaryScreen from '../screens/PrePrimaryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SubjectStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="SubjectsHome" component={SubjectsScreen} options={{ title: 'My Subjects' }} />
      <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} options={{ title: 'Subject Chapters' }} />
      <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: 'Adaptive Quiz' }} />
      <Stack.Screen name="Labs" component={LabsScreen} options={{ title: 'Virtual Lab' }} />
      <Stack.Screen name="Coding" component={CodingScreen} options={{ title: 'Coding Playground' }} />
      <Stack.Screen name="PrePrimary" component={PrePrimaryScreen} options={{ title: 'Pre-Primary Hub' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: { height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>
        }}
      />
      <Tab.Screen
        name="Subjects"
        component={SubjectStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Learning',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📚</Text>
        }}
      />
      <Tab.Screen
        name="AITutor"
        component={AITutorScreen}
        options={{
          tabBarLabel: 'AI Tutor',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🤖</Text>
        }}
      />
      <Tab.Screen
        name="Gamification"
        component={GamificationScreen}
        options={{
          tabBarLabel: 'Milestones',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏆</Text>
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>
        }}
      />
    </Tab.Navigator>
  );
}
