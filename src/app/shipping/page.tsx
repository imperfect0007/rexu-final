import { Metadata } from 'next';
import PolicyLayout from '@/components/PolicyLayout';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy – REXU',
  description: 'Digital delivery policy for REXU QR code activation service.',
};

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout title="Shipping & Delivery Policy" lastUpdated="10 March 2026">
      <p>
        REXU is a <strong>100% digital service</strong>. There are no physical goods shipped. This
        policy explains how our digital product is delivered after payment.
      </p>

      <h2>1. Digital Delivery</h2>
      <p>
        Upon successful payment for QR code activation, the following are delivered
        <strong> instantly</strong> and <strong>digitally</strong>:
      </p>
      <ul>
        <li>
          <strong>QR Code Token:</strong> A unique, cryptographically secure QR token is generated
          and linked to your emergency profile.
        </li>
        <li>
          <strong>QR Code Image:</strong> A downloadable QR code image (PNG format) is generated
          and made available in your dashboard.
        </li>
        <li>
          <strong>Emergency Page:</strong> Your public emergency page at{' '}
          <code>rexu.app/e/[your-token]</code> goes live immediately.
        </li>
      </ul>

      <h2>2. Delivery Timeline</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Delivery Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>QR code activation</td>
            <td>Instant (within 5 seconds of payment)</td>
          </tr>
          <tr>
            <td>QR code image download</td>
            <td>Available immediately in dashboard</td>
          </tr>
          <tr>
            <td>Emergency page going live</td>
            <td>Instant</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Fleet / Bulk Activations (B2B)</h2>
      <p>
        For commercial fleet accounts, all vehicle QR codes are generated and delivered digitally
        in the same manner as personal QR codes. Fleet owners can generate QR codes in bulk from
        the dashboard. Each vehicle&apos;s QR image is available for individual download.
        No physical goods are shipped for fleet activations.
      </p>

      <h2>4. No Physical Shipping</h2>
      <p>
        REXU does not ship any physical products. The QR code image you receive is designed to
        be:
      </p>
      <ul>
        <li>Printed by you on a sticker for your vehicle or helmet</li>
        <li>Saved to your phone for digital sharing</li>
        <li>Printed by any local print shop using the downloadable PNG</li>
      </ul>
      <p>
        We may offer optional physical QR stickers in the future, at which point this policy will
        be updated with shipping details.
      </p>

      <h2>5. Delivery Failure</h2>
      <p>
        If your payment was successful but you do not see your QR code in your dashboard within 5
        minutes:
      </p>
      <ol>
        <li>Refresh your dashboard page</li>
        <li>Log out and log back in</li>
        <li>
          If the issue persists, contact us at{' '}
          <a href="mailto:support@rexu.app">support@rexu.app</a> with your payment transaction ID
        </li>
      </ol>
      <p>
        We will investigate and either complete the activation or process a full refund within 48
        hours.
      </p>

      <h2>6. Contact</h2>
      <p>
        For delivery-related queries:
      </p>
      <ul>
        <li>
          Email: <a href="mailto:support@rexu.app">support@rexu.app</a>
        </li>
      </ul>
    </PolicyLayout>
  );
}
