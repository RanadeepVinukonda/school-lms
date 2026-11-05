'use client';
import { PageContentProvider } from 'react-router-dom';
import { AuthLayout } from '@/legacy/layouts/AuthLayout';
import LoginPageContent from '@/legacy/pages/auth/LoginPage';

export default function Page() {
  return (
    <PageContentProvider content={<LoginPageContent />}>
      <AuthLayout />
    </PageContentProvider>
  );
}
