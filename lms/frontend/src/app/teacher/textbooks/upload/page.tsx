'use client';
import LegacyPage from '@/legacy/pages/teacher/TeacherTextbookUploadPage';
import TeacherLayout from '@/legacy/layouts/TeacherLayout';
import { PageContentProvider } from 'react-router-dom';
export default function Page() {
  return <TeacherLayout><PageContentProvider><LegacyPage /></PageContentProvider></TeacherLayout>;
}