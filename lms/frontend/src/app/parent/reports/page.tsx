'use client';
import LegacyPage from '@/legacy/pages/parent/ParentReportsPage';
import ParentLayout from '@/legacy/layouts/ParentLayout';
import { PageContentProvider } from 'react-router-dom';
export default function Page() {
  return <ParentLayout><PageContentProvider><LegacyPage /></PageContentProvider></ParentLayout>;
}