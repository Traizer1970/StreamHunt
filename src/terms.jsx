// src/terms.jsx
import React from "react";
import { useTheme } from "@/contexts/auth-context";

const cn = (...c) => c.filter(Boolean).join(" ");

export default function Terms() {
  const { isDark } = useTheme();

  return (
    <section className="py-10 md:py-14">
      <div className={cn("max-w-5xl mx-auto px-4", isDark ? "text-white/90" : "text-zinc-800")}>
        {/* ====================== TERMS (significantly reworded & re-ordered) ====================== */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6">
          Terms & Conditions — StreamHunt Studio
        </h1>

        {/* 1 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">1) What this covers & your agreement</h2>
        <p className="mt-2">
          These Terms &amp; Conditions (“Terms”) explain the rules for using StreamHunt Studio, our
          app and any features that come with it. By creating an account or accessing the service,
          you confirm that you have read and accept these Terms.
        </p>
        <p className="mt-2">
          <strong>Important:</strong> StreamHunt Studio is <em>not</em> a gambling or casino
          product—real or simulated. It’s a private toolkit for tracking and visualizing bonus hunt
          stats only.
        </p>

        {/* 2 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">2) Key terms we use</h2>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>
            <strong>“StreamHunt Studio”</strong>: the software, website, and related services we
            operate.
          </li>
          <li>
            <strong>“User”</strong>: any individual or entity that registers for or uses the
            service.
          </li>
          <li>
            <strong>“Content”</strong>: anything a User provides or shares (for example text, data,
            images or graphics).
          </li>
          <li>
            <strong>“Bonus Hunt”</strong>: the feature that lets Users log and follow slot-bonus
            activity.
          </li>
        </ul>

        {/* 3 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">3) Using your account</h2>
        <p className="mt-2">
          When you sign up, provide accurate details and keep your credentials confidential. You’re
          responsible for actions taken through your account.
        </p>

        {/* 4 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">4) Ownership & rights</h2>
        <p className="mt-2">
          We (and our licensors) own all intellectual property in StreamHunt Studio. You may not
          copy, adapt, sell, distribute, or create derivative works from the service without our
          prior written permission.
        </p>

        {/* 5 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">5) Sharing & streaming</h2>
        <p className="mt-2">
          You’re welcome to share outcomes and stats with your community. Our widgets are designed
          for overlays; when you use them, follow the rules of the streaming platform and any
          applicable laws. You are solely responsible for the Content you publish.
        </p>

        {/* 6 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">6) Plans, billing & renewals</h2>
        <p className="mt-2">
          Certain features are offered by subscription and are billed via Stripe according to the
          plan you select. By subscribing you authorize us to charge your chosen payment method on a
          recurring basis until you cancel.
        </p>

        {/* 7 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">7) Cancellations & refunds (summary)</h2>
        <p className="mt-2">
          Requests made after one full week of service use are not eligible for a refund. To be
          considered, you must contact us within the first week of your subscription at{" "}
          <a className="underline" href="mailto:info@hunthub.net">info@hunthub.net</a>. (Detailed
          policy appears below.)
        </p>

        {/* 8 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">8) Account suspension or closure</h2>
        <p className="mt-2">
          We may suspend or terminate access if these Terms are violated. You can request closure of
          your account at any time by contacting support.
        </p>

        {/* 9 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">9) No warranties — limitation of liability</h2>
        <p className="mt-2">
          StreamHunt Studio is provided “as is.” We make no guarantees and are not liable for any
          direct, indirect, incidental, or consequential damages resulting from use of the service.
        </p>

        {/* 10 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">10) Changes to these Terms</h2>
        <p className="mt-2">
          We may revise these Terms from time to time. If changes are significant, we’ll try to
          notify you in-app or by email. Continuing to use the service after changes take effect
          means you accept the updated Terms.
        </p>

        {/* 11 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">11) Governing law & venue</h2>
        <p className="mt-2">
          These Terms are governed by the laws of the jurisdiction where StreamHunt Studio operates.
          Disputes will be handled exclusively by the courts in that jurisdiction.
        </p>

        {/* 12 */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">12) Talk to us</h2>
        <p className="mt-2">
          For questions about these Terms, email{" "}
          <a className="underline" href="mailto:info@hunthub.net">info@hunthub.net</a>.
        </p>

        {/* ====================== REFUND POLICY (reworded & re-ordered) ====================== */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-12 mb-6">
          Refund Policy — StreamHunt Studio
        </h1>

        {/* A */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">1) Who can get a refund (eligibility)</h2>
        <p className="mt-2">
          Refunds are considered only for requests made within <strong>3 days</strong> of your first
          subscription. After day 3, refunds aren’t available.
        </p>

        {/* B */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">2) How to ask</h2>
        <p className="mt-2">
          Email{" "}
          <a className="underline" href="mailto:info@hunthub.net">info@hunthub.net</a> with:
        </p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>the email used on your account;</li>
          <li>a short explanation of why you’re requesting a refund.</li>
        </ul>

        {/* C */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">3) What isn’t refundable</h2>
        <p className="mt-2">
          Stand-alone add-ons, extra services or separate purchases made through StreamHunt Studio
          are non-refundable.
        </p>

        {/* D */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">4) How we process refunds</h2>
        <p className="mt-2">
          If approved, refunds are issued to the original payment method. Processing typically
          completes within <strong>7 business days</strong>.
        </p>

        {/* E */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">5) Changes to this policy</h2>
        <p className="mt-2">
          We may update this Refund Policy. For major changes we’ll try to notify you in-app or by
          email. Continued use after an update means you agree to the new policy.
        </p>

        {/* F */}
        <h2 className="text-xl md:text-2xl font-bold mt-6">6) Contact about refunds</h2>
        <p className="mt-2">
          Questions about refunds? Email{" "}
          <a className="underline" href="mailto:info@hunthub.net">info@hunthub.net</a>.
        </p>
      </div>
    </section>
  );
}
