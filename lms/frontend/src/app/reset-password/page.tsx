'use client';
import { PageContentProvider } from 'react-router-dom';
import { AuthLayout } from '@/legacy/layouts/AuthLayout';
import ResetPasswordContent from '@/features/auth/components/ResetPasswordForm';

export default function Page() {
  return (
    <PageContentProvider content={<ResetPasswordContent />}>
      <AuthLayout />
    </PageContentProvider>
  );
}
