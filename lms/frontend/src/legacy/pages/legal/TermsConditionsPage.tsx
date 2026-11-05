import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/common/SEOHead';

export default function TermsConditionsPage() {
  return (
    <>
      <SEOHead title="Terms &amp; Conditions" description="Genesis terms and conditions" canonical="/terms" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-4">
            <Link to="/login" className="text-label-sm text-primary hover:underline">&larr; Back to Sign In</Link>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-10">
            <div className="mb-8 text-center">
              <img src="/genesis_icon.png" alt="Genesis" className="mx-auto mb-4 h-12 w-auto object-contain" />
              <h1 className="text-headline-sm font-bold">Terms &amp; Conditions</h1>
              <p className="mt-1 text-label-sm text-muted-foreground">Last updated: July 15, 2026</p>
            </div>

            <div className="space-y-6 text-body-md leading-relaxed text-foreground/90">
              <section>
                <h2 className="mb-2 text-title-md font-semibold">1. Introduction</h2>
                <p>Welcome to Genesis. These Terms &amp; Conditions govern your use of the Genesis school management and learning platform, including its website, mobile application, and all associated services. By accessing or using Genesis, you agree to be bound by these terms. If you do not agree, you may not use the platform.</p>
                <p className="mt-2">These terms constitute a legally binding agreement between you (the user) and the educational institution operating the Genesis instance, in conjunction with the platform development team.</p>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">2. User Responsibilities</h2>
                <p>As a user of Genesis, you agree to:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li>Provide accurate, current, and complete information during registration.</li>
                  <li>Maintain the confidentiality of your account credentials.</li>
                  <li>Accept responsibility for all activities that occur under your account.</li>
                  <li>Notify school administration immediately of any unauthorized use of your account.</li>
                  <li>Use the platform in compliance with all applicable laws and school policies.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">3. Account Usage</h2>
                <p>Each account is intended for use by a single individual. Account sharing is prohibited. Users may not create accounts through unauthorized means, including automated scripts or bots. The school administration reserves the right to suspend or terminate accounts that violate these terms or that remain inactive for extended periods.</p>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">4. Acceptable Use Policy</h2>
                <p>You agree not to use Genesis for any unlawful purpose or in violation of these terms. Prohibited activities include:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li>Attempting to access another user's account without authorization.</li>
                  <li>Uploading malicious code, viruses, or harmful content.</li>
                  <li>Interfering with the platform's security, performance, or availability.</li>
                  <li>Using the platform to distribute spam, advertisements, or unsolicited communications.</li>
                  <li>Engaging in harassment, bullying, or any form of harmful behavior toward other users.</li>
                  <li>Reverse engineering, decompiling, or attempting to extract source code.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">5. School Management Rules</h2>
                <p>School administrators have full authority to manage institutional settings, user roles, content moderation, and access permissions within their school's instance of Genesis. Administrators may modify, suspend, or remove user accounts and content as necessary to maintain a safe and effective learning environment. School-level policies may supplement these terms.</p>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">6. Student Conduct</h2>
                <p>Students using Genesis are expected to:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li>Complete assignments, assessments, and tasks with academic integrity.</li>
                  <li>Refrain from plagiarism, cheating, or any form of academic dishonesty.</li>
                  <li>Interact respectfully with teachers and fellow students.</li>
                  <li>Follow school guidelines regarding online behavior and digital citizenship.</li>
                  <li>Report any technical issues or inappropriate content to a teacher or administrator.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">7. Teacher Responsibilities</h2>
                <p>Teachers using Genesis agree to:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li>Ensure the accuracy and appropriateness of educational content they publish.</li>
                  <li>Conduct assessments fairly and provide timely feedback to students.</li>
                  <li>Maintain professional conduct in all communications within the platform.</li>
                  <li>Respect student privacy and use student data only for educational purposes.</li>
                  <li>Report any security concerns or policy violations to administration.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">8. Parent Responsibilities</h2>
                <p>Parents and guardians using Genesis agree to:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li>Monitor their child's academic progress and platform usage.</li>
                  <li>Communicate constructively with teachers and school staff.</li>
                  <li>Ensure timely payment of fees and completion of administrative requirements.</li>
                  <li>Supervise their child's online activities in accordance with school guidelines.</li>
                  <li>Keep emergency contact information up to date.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">9. Privacy &amp; Security</h2>
                <p>We are committed to protecting your privacy. Our data handling practices are detailed in our Privacy Policy, which is incorporated into these terms by reference. While we implement robust security measures, we cannot guarantee absolute security. Users are responsible for maintaining the security of their own devices and accounts. In the event of a data breach, affected users and school administration will be notified promptly.</p>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">10. Limitation of Liability</h2>
                <p>Genesis is provided on an "as is" and "as available" basis. The platform team and school administration make no warranties regarding uninterrupted or error-free operation. To the maximum extent permitted by law, we disclaim all liability for any damages arising from the use or inability to use the platform, including but not limited to direct, indirect, incidental, or consequential damages. We reserve the right to modify, suspend, or discontinue any aspect of the platform at any time without prior notice.</p>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">11. Contact Information</h2>
                <p>For questions about these Terms &amp; Conditions, please contact your school's administration office. General inquiries may be directed to the designated school administrator responsible for the Genesis platform. We will respond to inquiries as promptly as possible.</p>
              </section>
            </div>
          </div>
          <p className="mt-6 text-center text-label-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </>
  );
}
