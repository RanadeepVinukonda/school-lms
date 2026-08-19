'use client';
import LegacyPage from '@/legacy/pages/student/StudentMindMapPage';
import StudentLayout from '@/legacy/layouts/StudentLayout';
import { PageContentProvider } from 'react-router-dom';
export default function Page() {
  return <PageContentProvider content={<LegacyPage />}><StudentLayout /></PageContentProvider>;
}