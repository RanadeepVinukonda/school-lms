import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import ReportFeedbackForm from '@/components/common/ReportFeedbackForm';

export default function StudentReportPage() {
  const { _ } = useTranslation();
  return (
    <>
      <SEOHead title={_('Report & Suggestions')} description={_('Submit feedback, suggestions, or issues')} />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-headline-md font-bold">{_('Report & Suggestions')}</h1>
        <p className="text-body-md text-muted-foreground">{_('Share your feedback, suggestions, or report issues to help us improve')}</p>
        <ReportFeedbackForm className={''} />
      </div>
    </>
  );
}
