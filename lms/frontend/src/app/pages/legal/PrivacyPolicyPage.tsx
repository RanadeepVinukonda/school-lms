import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/common/SEOHead';

export default function PrivacyPolicyPage() {
  return (
    <>
      <SEOHead title="Privacy Policy" description="Genesis privacy policy" canonical="/privacy" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-4">
            <Link to="/login" className="text-label-sm text-primary hover:underline">&larr; Back to Sign In</Link>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-10">
            <div className="mb-8 text-center">
              <img src="/genesis_icon.png" alt="Genesis" className="mx-auto mb-4 h-12 w-auto object-contain" />
              <h1 className="text-headline-sm font-bold">Privacy Policy</h1>
              <p className="mt-1 text-label-sm text-muted-foreground">Last updated: July 15, 2026</p>
            </div>

            <div className="space-y-6 text-body-md leading-relaxed text-foreground/90">
              <section>
                <h2 className="mb-2 text-title-md font-semibold">1. Introduction</h2>
                <p>Genesis is a comprehensive school management and learning platform designed to connect students, teachers, parents, and school administrators. We are committed to protecting the privacy of all users who interact with the platform, whether through our web application or mobile app. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.</p>
                <p className="mt-2">By creating an account or using the Genesis platform, you agree to the practices described in this policy. If you do not agree, please do not use the platform.</p>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">2. Data Collection</h2>
                <p>We collect information that you provide directly to us during account registration and platform usage. This includes:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li><strong>Account Information:</strong> Full name, email address, role (student, teacher, parent, admin), and profile photo.</li>
                  <li><strong>Authentication Data:</strong> Securely hashed password credentials managed through Supabase authentication.</li>
                  <li><strong>Usage Data:</strong> Pages visited, features accessed, time spent on the platform, and interaction logs.</li>
                  <li><strong>Device Information:</strong> Browser type, operating system, device type, and IP address for analytics and security.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">3. User Information</h2>
                <p>Different user roles have different information collected based on their needs:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li><strong>Students:</strong> Enrollment details, class and section assignments, academic records, and learning progress data.</li>
                  <li><strong>Teachers:</strong> Professional qualifications, subject assignments, class rosters, and teaching materials.</li>
                  <li><strong>Parents:</strong> Contact details and linkage to their children's student records.</li>
                  <li><strong>Administrators:</strong> School management credentials and access to institutional configuration data.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">4. Student Information</h2>
                <p>Student data is collected and processed strictly for educational and administrative purposes. This includes academic performance, attendance records, assessment results, assignment submissions, and behavioral records. Student information is accessible only to authorized teachers, parents, and school administrators. We do not sell or share student data with third parties for marketing or advertising purposes.</p>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">5. Teacher Information</h2>
                <p>Teacher profiles include professional information such as qualifications, subjects taught, class assignments, and contact details. This information is used for school administration, scheduling, parent communication, and internal analytics. Teachers retain ownership of the educational content they create on the platform.</p>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">6. Parent Information</h2>
                <p>Parent accounts are linked to student profiles to enable monitoring of academic progress, attendance, fee status, and school communications. Parent contact information is used exclusively for school-related notifications and emergency communications.</p>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">7. Data Security</h2>
                <p>We implement industry-standard security measures to protect your data:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li>All data transmitted between your device and our servers is encrypted using TLS (Transport Layer Security).</li>
                  <li>Passwords are hashed and salted using bcrypt before storage.</li>
                  <li>Access controls ensure that users can only view data appropriate to their role.</li>
                  <li>Regular security audits and vulnerability assessments are conducted.</li>
                  <li>Database access is restricted to authenticated and authorized services only.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">8. Data Usage</h2>
                <p>We use collected data for the following purposes:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li>Operating and maintaining the Genesis platform.</li>
                  <li>Personalizing learning experiences and recommendations.</li>
                  <li>Generating analytics and reports for school administration.</li>
                  <li>Communicating important updates, alerts, and notifications.</li>
                  <li>Improving platform features and user experience.</li>
                  <li>Ensuring compliance with school policies and academic standards.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">9. Third-Party Services</h2>
                <p>Genesis integrates with the following third-party services to deliver core functionality:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li><strong>Supabase:</strong> Authentication, database, and real-time subscriptions.</li>
                  <li><strong>Cloudinary:</strong> Image and media file storage and optimization.</li>
                  <li><strong>Firebase:</strong> Push notifications and cloud messaging.</li>
                  <li><strong>Vercel:</strong> Frontend hosting and deployment.</li>
                  <li><strong>Render:</strong> Backend API hosting.</li>
                </ul>
                <p className="mt-2">Each third-party service has its own privacy policy governing data handling. We encourage you to review their policies. We do not sell your personal information to any third party.</p>
              </section>

              <section>
                <h2 className="mb-2 text-title-md font-semibold">10. Contact Information</h2>
                <p>If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact your school administration directly. For technical inquiries, reach out to the Genesis support team through your school's designated administrator.</p>
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
