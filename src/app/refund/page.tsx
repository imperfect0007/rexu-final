import { Metadata } from 'next';
import PolicyLayout from '@/components/PolicyLayout';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy – REXU',
  description: 'Refund and cancellation policy for REXU QR code activation payments.',
};

export default function RefundPolicyPage() {
  return (
    <PolicyLayout title="Refund & Cancellation Policy" lastUpdated="10 March 2026">
      <p>
        This Refund &amp; Cancellation Policy applies to all payments made on the REXU platform
        for QR code activation and related services.
      </p>

      <h2>1. Nature of Service</h2>
      <p>
        REXU QR code activation is a <strong>one-time digital service</strong>. Once your QR code
        is activated:
      </p>
      <ul>
        <li>A unique emergency QR token is generated and permanently linked to your profile</li>
        <li>A QR code image is generated and stored for your use</li>
        <li>Your public emergency page becomes live and accessible</li>
      </ul>
      <p>
        Since this is a digital service that is delivered instantly upon payment, the activation
        cannot be &quot;returned&quot; in the traditional sense.
      </p>

      <h2>2. Refund Eligibility</h2>

      <h3>2.1 Eligible for Refund</h3>
      <ul>
        <li>
          <strong>Payment charged but activation failed:</strong> If your payment was successfully
          processed but the QR code was not activated due to a technical error on our end, you are
          entitled to a full refund.
        </li>
        <li>
          <strong>Duplicate payment:</strong> If you were charged more than once for the same
          activation, the duplicate amount will be refunded in full.
        </li>
        <li>
          <strong>Incorrect amount charged:</strong> If you were charged an amount different from
          what was displayed at the time of payment, the difference (or full amount) will be
          refunded.
        </li>
      </ul>

      <h3>2.2 Not Eligible for Refund</h3>
      <ul>
        <li>
          <strong>Successful activation:</strong> Once a QR code is successfully generated and
          your emergency page is live, the activation fee is non-refundable.
        </li>
        <li>
          <strong>Change of mind:</strong> We do not offer refunds for change of mind after
          successful activation.
        </li>
        <li>
          <strong>Incorrect profile data:</strong> You can update your emergency profile at any
          time. Providing incorrect data does not qualify for a refund.
        </li>
      </ul>

      <h2>3. Commercial / Fleet Accounts (B2B)</h2>
      <p>
        For commercial accounts that activate multiple vehicle QR codes, the same refund rules
        apply per activation. Bulk activations are treated as individual transactions — each
        vehicle QR activation is subject to its own refund eligibility. If a fleet owner
        deactivates a vehicle, the QR is disabled but the activation fee is non-refundable.
      </p>

      <h2>4. Free Activations</h2>
      <p>
        If you received a free activation (promotional offer), no payment was made and therefore
        no refund applies. Your QR code remains functional regardless.
      </p>

      <h2>5. How to Request a Refund</h2>
      <ol>
        <li>
          Email us at <a href="mailto:support@rexu.app">support@rexu.app</a> with the subject
          line <strong>&quot;Refund Request&quot;</strong>.
        </li>
        <li>
          Include your registered email address, mobile number, and a description of the issue.
        </li>
        <li>
          If available, attach a screenshot of the payment confirmation or transaction ID.
        </li>
      </ol>

      <h2>6. Refund Processing</h2>
      <ul>
        <li>Refund requests are reviewed within <strong>2 business days</strong>.</li>
        <li>
          Approved refunds are processed to the original payment method (bank account, UPI, or
          card) within <strong>5–7 business days</strong>.
        </li>
        <li>
          Razorpay/Stripe processing times may add 2–3 additional business days depending on your
          bank.
        </li>
      </ul>

      <h2>7. Cancellation</h2>
      <ul>
        <li>
          <strong>Before activation:</strong> If you have not yet activated your QR code, there is
          nothing to cancel — no payment is taken until activation.
        </li>
        <li>
          <strong>Account deletion:</strong> You may request account deletion at any time. This
          will deactivate your QR code and remove your emergency profile. Account deletion after
          activation does not qualify for a refund.
        </li>
      </ul>

      <h2>8. Contact</h2>
      <p>
        For refund or cancellation queries:
      </p>
      <ul>
        <li>
          Email: <a href="mailto:support@rexu.app">support@rexu.app</a>
        </li>
        <li>Response time: Within 48 hours on business days</li>
      </ul>
    </PolicyLayout>
  );
}
