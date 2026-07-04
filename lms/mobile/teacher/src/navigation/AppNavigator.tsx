import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import DashboardScreen from '../screens/DashboardScreen';
import ClassesScreen from '../screens/ClassesScreen';
import ClassAttendanceScreen from '../screens/ClassAttendanceScreen';
import AssessmentCreateScreen from '../screens/AssessmentCreateScreen';
import ExamCorrectionScreen from '../screens/ExamCorrectionScreen';
import OCRScreen from '../screens/OCRScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import TextbooksScreen from '../screens/TextbooksScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ClassStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="ClassesHome" component={ClassesScreen} options={{ title: 'My Classes' }} />
      <Stack.Screen name="ClassAttendance" component={ClassAttendanceScreen} options={{ title: 'Mark Attendance' }} />
      <Stack.Screen name="AssessmentCreate" component={AssessmentCreateScreen} options={{ title: 'New Assessment' }} />
      <Stack.Screen name="ExamCorrection" component={ExamCorrectionScreen} options={{ title: 'Exam Grading Correction' }} />
      <Stack.Screen name="OCR" component={OCRScreen} options={{ title: 'Question paper OCR' }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="Textbooks" component={TextbooksScreen} options={{ title: 'Textbooks' }} />
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
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Classes"
        component={ClassStack}
        options={{
          headerShown: false,
          tabBarLabel: 'My Classes',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="school" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}
