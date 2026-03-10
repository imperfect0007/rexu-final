import { Metadata } from 'next';
import PolicyLayout from '@/components/PolicyLayout';

export const metadata: Metadata = {
  title: 'Terms & Conditions – REXU',
  description: 'Terms governing the use of REXU QRgency emergency QR code platform.',
};

export default function TermsPage() {
  return (
    <PolicyLayout title="Terms & Conditions" lastUpdated="10 March 2026">
      <p>
        These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of the REXU platform
        (&quot;Service&quot;) operated by REXU (&quot;we&quot;, &quot;us&quot;). By accessing or
        using the Service, you agree to these Terms.
      </p>

      <h2>1. Service Description</h2>
      <p>
        REXU provides a QR code-based emergency information system for both <strong>personal
        use (B2C)</strong> and <strong>commercial / fleet use (B2B)</strong>.
      </p>
      <ul>
        <li>
          <strong>Personal (B2C):</strong> Individual users create an emergency profile containing
          medical and contact information. A unique QR code is generated that, when scanned,
          displays this emergency information to help bystanders assist in an emergency.
        </li>
        <li>
          <strong>Commercial / Fleet (B2B):</strong> Businesses register vehicles and drivers under
          a single company account. Each vehicle gets its own QR code linked to driver details,
          company contact information, and emergency instructions. Fleet owners can manage vehicles,
          assign drivers, and generate QR codes in bulk from their admin dashboard.
        </li>
      </ul>

      <h2>2. Eligibility</h2>
      <ul>
        <li>You must be at least 13 years old to create an account.</li>
        <li>If you are under 18, you must have parental or guardian consent.</li>
        <li>You must provide accurate and complete information during registration.</li>
      </ul>

      <h2>3. Account Responsibilities</h2>
      <ul>
        <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
        <li>You are responsible for the accuracy of your emergency profile information.</li>
        <li>You must not create accounts for fraudulent purposes or impersonate others.</li>
        <li>You must notify us immediately of any unauthorized use of your account.</li>
      </ul>

      <h2>4. QR Code Activation & Payment</h2>
      <ul>
        <li>
          QR code activation is a <strong>one-time digital purchase</strong>. Once activated, your
          QR code is permanently linked to your emergency profile.
        </li>
        <li>
          Early users may receive free activation as part of promotional offers. Pricing is
          determined at the time of activation and displayed before payment.
        </li>
        <li>
          Payments are processed securely through Razorpay and/or Stripe. We do not store your
          payment card details.
        </li>
      </ul>

      <h2>5. Commercial / Fleet Accounts (B2B)</h2>
      <ul>
        <li>
          Commercial accounts are intended for businesses, fleet operators, logistics companies,
          and organisations that manage multiple vehicles or drivers.
        </li>
        <li>
          The account holder (company) is responsible for the accuracy of vehicle details, driver
          information, and emergency contacts provided for each fleet vehicle.
        </li>
        <li>
          Driver assignments can be updated at any time. When a driver is reassigned, the QR
          code&apos;s emergency page automatically reflects the current driver.
        </li>
        <li>
          Bulk QR generation and fleet management features are available only to commercial
          accounts.
        </li>
        <li>
          Commercial pricing may differ from personal pricing and is displayed at the time of
          activation.
        </li>
      </ul>

      <h2>6. Emergency Information Disclaimer</h2>
      <p>
        <strong>REXU is an information display tool, not a medical or emergency response service.</strong>
      </p>
      <ul>
        <li>We do not guarantee that scanning a QR code will result in emergency assistance.</li>
        <li>We do not dispatch ambulances, police, or any emergency services.</li>
        <li>
          The accuracy of emergency information depends entirely on what you provide. We are not
          liable for incorrect, outdated, or incomplete information in your profile.
        </li>
        <li>
          In a real emergency, always call <strong>112</strong> (India) or your local emergency
          number first.
        </li>
      </ul>

      <h2>7. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any illegal or unauthorized purpose</li>
        <li>Provide false emergency information that could mislead rescuers</li>
        <li>Attempt to access other users&apos; accounts or data</li>
        <li>Reverse-engineer, decompile, or attempt to extract source code</li>
        <li>Use automated tools to scrape or abuse the Service</li>
        <li>Interfere with or disrupt the Service&apos;s infrastructure</li>
      </ul>

      <h2>8. Intellectual Property</h2>
      <p>
        All content, branding, design, and technology of the REXU platform are owned by us and
        protected by applicable intellectual property laws. You may not copy, reproduce, or
        distribute any part of the Service without written permission.
      </p>

      <h2>9. Account Termination</h2>
      <ul>
        <li>
          You may delete your account at any time by contacting us at{' '}
          <a href="mailto:support@rexu.app">support@rexu.app</a>.
        </li>
        <li>
          We may suspend or terminate your account if you violate these Terms, provide false
          information, or engage in abusive behaviour.
        </li>
        <li>
          Upon termination, your QR code will be deactivated and your emergency page will no
          longer be accessible.
        </li>
      </ul>

      <h2>10. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by Indian law:
      </p>
      <ul>
        <li>
          REXU is provided &quot;as is&quot; without warranties of any kind, express or implied.
        </li>
        <li>
          We are not liable for any direct, indirect, incidental, or consequential damages arising
          from your use of the Service.
        </li>
        <li>
          Our total liability shall not exceed the amount you paid for QR activation.
        </li>
      </ul>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by the laws of India. Any disputes shall be subject to the
        exclusive jurisdiction of the courts in India.
      </p>

      <h2>12. Changes to Terms</h2>
      <p>
        We reserve the right to modify these Terms at any time. Material changes will be notified
        via email or a prominent notice on the Service. Continued use after changes constitutes
        acceptance.
      </p>

      <h2>13. Contact</h2>
      <p>
        For questions about these Terms, contact us at{' '}
        <a href="mailto:support@rexu.app">support@rexu.app</a>.
      </p>
    </PolicyLayout>
  );
}
