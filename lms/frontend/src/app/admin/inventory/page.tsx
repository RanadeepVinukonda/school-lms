'use client';
import LegacyPage from '@/legacy/pages/admin/AdminInventoryPage';
import { AdminLayout } from '@/legacy/layouts/AdminLayout';
import { PageContentProvider } from 'react-router-dom';
export default function Page() {
  return <PageContentProvider content={<LegacyPage />}><AdminLayout /></PageContentProvider>;
}