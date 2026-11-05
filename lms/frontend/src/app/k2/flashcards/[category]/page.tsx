'use client';
import LegacyPage from '@/legacy/pages/student/K2FlashcardsPage';
import K2Layout from '@/legacy/layouts/K2Layout';
import { PageContentProvider } from 'react-router-dom';
export default function Page() {
  return <PageContentProvider content={<LegacyPage />}><K2Layout /></PageContentProvider>;
}
