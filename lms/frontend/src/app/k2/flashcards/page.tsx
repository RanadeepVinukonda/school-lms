'use client';
import LegacyPage from '@/legacy/pages/student/K2FlashcardsPage';
import K2Layout from '@/legacy/layouts/K2Layout';
import { PageContentProvider } from 'react-router-dom';
export default function Page() {
  return <K2Layout><PageContentProvider><LegacyPage /></PageContentProvider></K2Layout>;
}