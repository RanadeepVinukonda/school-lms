'use client';
import LegacyPage from '@/legacy/pages/teacher/TeacherRubricPage';
import TeacherLayout from '@/legacy/layouts/TeacherLayout';
import { PageContentProvider } from 'react-router-dom';
export default function Page() {
  return <PageContentProvider content={<LegacyPage />}><TeacherLayout /></PageContentProvider>;
}