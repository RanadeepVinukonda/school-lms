'use client';
import { PageContentProvider } from 'react-router-dom';
import { AuthLayout } from '@/legacy/layouts/AuthLayout';
import ForgotPasswordContent from '@/features/auth/components/ForgotPasswordForm';

export default function Page() {
  return (
    <PageContentProvider content={<ForgotPasswordContent />}>
      <AuthLayout />
    </PageContentProvider>
  );
}
