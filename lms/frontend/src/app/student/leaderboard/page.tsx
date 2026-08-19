'use client';
import LegacyPage from '@/legacy/pages/student/StudentLeaderboardPage';
import StudentLayout from '@/legacy/layouts/StudentLayout';
import { PageContentProvider } from 'react-router-dom';
export default function Page() {
  return <StudentLayout><PageContentProvider><LegacyPage /></PageContentProvider></StudentLayout>;
}