import { Metadata } from 'next';
import PolicyLayout from '@/components/PolicyLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy – REXU',
  description: 'How REXU collects, uses, and protects your personal and emergency data.',
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="10 March 2026">
      <p>
        REXU (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website{' '}
        <strong>rexu.app</strong> and the QRgency emergency QR code platform. This Privacy Policy
        explains how we collect, use, disclose, and safeguard your information when you use our
        Service.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Account Information</h3>
      <p>
        When you register, we collect your <strong>name</strong>, <strong>email address</strong>,
        and <strong>mobile number</strong>. If you sign in with Google, we receive your name and
        email from your Google account.
      </p>

      <h3>1.2 Emergency Profile Data</h3>
      <p>
        You voluntarily provide emergency information including: blood group, age, allergies,
        medical conditions, medications, emergency contact numbers, language preference, organ
        donor status, and emergency instructions. This data is stored solely to be displayed on
        your public emergency page when your QR code is scanned.
      </p>

      <h3>1.3 Fleet / Commercial Data (B2B)</h3>
      <p>
        If you register a commercial account, we additionally collect: vehicle registration numbers,
        vehicle labels/make/model, driver names, driver phone numbers, and driver blood groups. This
        data is used to display vehicle- and driver-specific emergency information when a fleet QR
        code is scanned. Fleet owners are responsible for obtaining consent from their drivers before
        providing their personal information.
      </p>

      <h3>1.4 Payment Information</h3>
      <p>
        Payments are processed through <strong>Razorpay</strong> and/or <strong>Stripe</strong>.
        We do not store your credit/debit card numbers, UPI IDs, or bank account details on our
        servers. Payment processors handle all financial data under their own privacy policies and
        PCI-DSS compliance.
      </p>

      <h3>1.5 Scan Logs</h3>
      <p>
        When someone scans your QR code, we log the <strong>timestamp</strong>,{' '}
        <strong>IP address</strong>, and <strong>user agent</strong> of the scanner for analytics
        and abuse prevention. We do not collect the scanner&apos;s personal identity.
      </p>

      <h3>1.6 Automatically Collected Data</h3>
      <p>
        We collect standard web analytics data: browser type, device type, operating system, pages
        visited, and referring URL. This is collected via Vercel Analytics and contains no
        personally identifiable information.
      </p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To create and display your emergency profile when your QR code is scanned</li>
        <li>To send emergency alerts to your designated contacts</li>
        <li>To process payments for QR activation</li>
        <li>To verify your mobile number via OTP</li>
        <li>To communicate service updates, security alerts, and support messages</li>
        <li>To prevent fraud, abuse, and unauthorized access</li>
        <li>To improve our Service through aggregated, anonymized analytics</li>
      </ul>

      <h2>3. Data Sharing & Disclosure</h2>
      <p>We do <strong>not</strong> sell, rent, or trade your personal data. We share data only in these cases:</p>
      <ul>
        <li>
          <strong>Emergency page viewers:</strong> When your QR code is scanned, limited emergency
          information (name, blood group, medical info, emergency contacts) is displayed to help
          the person assist you. Phone numbers are partially masked.
        </li>
        <li>
          <strong>Payment processors:</strong> Razorpay and Stripe receive necessary transaction
          data to process your payment.
        </li>
        <li>
          <strong>Legal requirements:</strong> We may disclose data if required by Indian law,
          court order, or government authority.
        </li>
      </ul>

      <h2>4. Data Storage & Security</h2>
      <p>
        Your data is stored on <strong>Supabase</strong> (PostgreSQL) with Row-Level Security
        enabled. Data is encrypted in transit (TLS 1.3) and at rest (AES-256). Our infrastructure
        is hosted on Vercel and Supabase cloud with servers in India and Singapore.
      </p>
      <p>
        QR tokens are cryptographically random and do not contain any personal information. Even
        if a QR code is photographed, it only contains a random token URL — not your data.
      </p>

      <h2>5. Data Retention</h2>
      <ul>
        <li>Account and profile data is retained as long as your account is active.</li>
        <li>Scan logs are retained for 12 months, then automatically deleted.</li>
        <li>Payment records are retained for 8 years as required by Indian tax law.</li>
        <li>
          You can request deletion of your account and all associated data by emailing us at{' '}
          <a href="mailto:privacy@rexu.app">privacy@rexu.app</a>.
        </li>
      </ul>

      <h2>6. Your Rights</h2>
      <p>Under applicable Indian data protection laws, you have the right to:</p>
      <ul>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Delete your account and data</li>
        <li>Withdraw consent for data processing</li>
        <li>Port your data in a machine-readable format</li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{' '}
        <a href="mailto:privacy@rexu.app">privacy@rexu.app</a>.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use essential cookies only: authentication session cookies and admin session tokens.
        We do not use advertising or third-party tracking cookies.
      </p>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        Our Service is not directed to children under 13. We do not knowingly collect personal
        information from children. If you believe a child has provided us data, please contact us
        to have it removed.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material
        changes by posting the new policy on this page and updating the &quot;Last updated&quot;
        date. Continued use of the Service after changes constitutes acceptance.
      </p>

      <h2>10. Contact Us</h2>
      <p>
        For privacy-related questions or concerns:
      </p>
      <ul>
        <li>
          Email: <a href="mailto:privacy@rexu.app">privacy@rexu.app</a>
        </li>
        <li>
          Address: REXU, India
        </li>
      </ul>
    </PolicyLayout>
  );
}
