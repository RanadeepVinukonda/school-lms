'use client';
import LegacyPage from '@/legacy/pages/parent/ParentChildrenPage';
import ParentLayout from '@/legacy/layouts/ParentLayout';
import { PageContentProvider } from 'react-router-dom';
export default function Page() {
  return <PageContentProvider content={<LegacyPage />}><ParentLayout /></PageContentProvider>;
}