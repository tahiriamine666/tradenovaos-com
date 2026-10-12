import React from "react";
import { useParams, useLocation, Navigate } from "react-router-dom";
import MarketingPageShell from "./MarketingPageShell";
import SeoHead from "@/components/SeoHead";

type Entry = { title: string; description: string; eyebrow?: string };

const PRODUCT: Record<string, Entry> = {
  "trade-journal": {
    title: "Trade Journal",
    description: "Log every trade with context, bias, notes and before/after charts.",
  },
  "edge-analytics": {
    title: "Analytics",
    description: "Win rate, profit factor, R:R and cumulative P&L from your own trades.",
  },
  "mind-journal": {
    title: "Psychology Tracking",
    description: "Emotions, mistakes, discipline and a daily Psychology Score.",
  },
  "playbook-lab": {
    title: "Trade Plan",
    description: "Weekly Outlook, Daily Plan, rules and reusable pre-trade checklists.",
  },
  "ai-insights": { title: "NOVA AI", description: "An AI assistant that answers from your own trading data." },
};

const SOLUTION: Record<string, Entry> = {
  forex: {
    title: "TradeNova for Forex Traders",
    description: "Pip-perfect journaling, session analytics and pair performance — built for serious FX traders.",
  },
  futures: {
    title: "TradeNova for Futures Traders",
    description: "Tick-based P&L, contract tracking and execution analytics tuned for futures markets.",
  },
  "prop-firms": {
    title: "TradeNova for Prop Firm Traders",
    description: "Pass evaluations and stay funded with rule tracking, drawdown alerts and consistency reports.",
  },
  "funded-challenges": {
    title: "TradeNova for Funded Challenges",
    description: "Track challenge rules, daily loss limits and progress toward your payout — across every firm.",
  },
  "day-traders": {
    title: "TradeNova for Day Traders",
    description: "Intraday dashboards, time-of-day analytics and execution reviews for high-frequency traders.",
  },
  "swing-traders": {
    title: "TradeNova for Swing Traders",
    description: "Multi-day position tracking, risk monitoring and trade thesis journaling for swing traders.",
  },
};

const RESOURCE: Record<string, Entry> = {
  psychology: {
    title: "Trading Psychology",
    description: "Articles, frameworks and tools to master the mental game of trading.",
  },
  "risk-management": {
    title: "Risk Management",
    description: "Protect your capital with proven position sizing, drawdown control and risk frameworks.",
  },
};

const COMPARE: Record<string, Entry> = {
  tradezella: {
    title: "TradeNova vs. TradeZella",
    description: "See how TradeNova compares — features, pricing, AI insights and more.",
  },
  tradersync: {
    title: "TradeNova vs. TraderSync",
    description: "A side-by-side comparison so you can pick the right tool for your trading.",
  },
  edgewonk: {
    title: "TradeNova vs. Edgewonk",
    description: "Modern UX, AI insights and a Trading OS approach — see the differences.",
  },
  tradervue: {
    title: "TradeNova vs. Tradervue",
    description: "Why traders are upgrading to TradeNova for a faster, smarter journal.",
  },
  tradesviz: { title: "TradeNova vs. TradesViz", description: "Compare analytics, journaling and overall workflow." },
};

const STATIC: Record<string, Entry> = {
  blog: {
    title: "TradeNova Blog",
    description: "Insights, frameworks and case studies from professional traders.",
    eyebrow: "Blog",
  },
  contact: {
    title: "Contact Support",
    description: "Reach out — we typically respond within a few hours during business days.",
    eyebrow: "Support",
  },
  careers: {
    title: "Careers at TradeNova",
    description:
      "Help us build the world’s best Trading Operating System. Roles open across product, engineering and design.",
    eyebrow: "Careers",
  },
  privacy: {
    title: "Privacy Policy",
    description: "How we collect, use and protect your data at TradeNova.",
    eyebrow: "Legal",
  },
  terms: { title: "Terms & Conditions", description: "The terms governing your use of TradeNova.", eyebrow: "Legal" },
  help: {
    title: "Help Center",
    description: "Guides, tutorials and answers to the most common questions.",
    eyebrow: "Help",
  },
};

interface Props {
  group: "product" | "solution" | "resource" | "compare" | "static";
  staticKey?: string;
}

export default function MarketingPlaceholder({ group, staticKey }: Props) {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const key = staticKey ?? slug ?? "";
  const map =
    group === "product"
      ? PRODUCT
      : group === "solution"
        ? SOLUTION
        : group === "resource"
          ? RESOURCE
          : group === "compare"
            ? COMPARE
            : STATIC;
  const entry = map[key];
  if (!entry) return <Navigate to="/" replace />;
  if (group === "static" && key === "privacy") return <PrivacyPolicy />;
  return (
    <>
      <SeoHead path={pathname} title={`${entry.title} — TradeNova OS`} description={entry.description} noindex />
      <MarketingPageShell
        eyebrow={entry.eyebrow ?? "Coming soon"}
        title={entry.title}
        description={entry.description}
      />
    </>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <SeoHead
        path="/privacy"
        title="Privacy Policy — TradeNovaOS"
        description="How TradeNovaOS collects, uses, stores and shares account and trading data, and how to request access or deletion."
      />
      <MarketingPageShell
        eyebrow="Privacy"
        title="Privacy Policy"
        description="TradeNovaOS · Last updated 12 October 2026"
      >
        <article className="space-y-8 text-left text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4 [&_li]:mt-2">
          <section>
            <h2>1. Who operates TradeNovaOS</h2>
            <p>
              TradeNovaOS is an independently operated trading journal, planning and analytics project operated by AMINE
              TAHIRI, based in Morocco. This policy covers tradenovaos.com, www.tradenovaos.com and the TradeNovaOS
              application.
            </p>
            <p>
              For privacy questions, access, correction or data-deletion requests, contact{" "}
              <a href="mailto:tradenova111@gmail.com">tradenova111@gmail.com</a>. This is our public privacy contact.
            </p>
          </section>
          <section>
            <h2>2. Information we collect and why</h2>
            <ul className="list-disc pl-5">
              <li>
                <strong>Account and profile:</strong> email address, account identifier, sign-in information, and
                profile details you provide, such as name, display name, avatar, biography, timezone and trading
                preferences. We use these to authenticate you, maintain your account and personalize your workspace.
                Email/password sign-in is handled by our authentication service.
              </li>
              <li>
                <strong>Trading records:</strong> trades, instruments, dates, prices, position sizes, results, profit
                and loss, risk/reward, setups, sessions, tags, imported records, account balances and equity. We use
                these to provide your journal, reports and performance calculations.
              </li>
              <li>
                <strong>Plans and personal notes:</strong> daily plans, weekly outlooks, checklists, reviews, goals,
                journal entries and optional psychology information such as emotions, stress, confidence and discipline.
                We use these for the planning and review features you choose. Avoid entering medical information or
                other sensitive information that is not needed for trading review.
              </li>
              <li>
                <strong>Uploaded content:</strong> trade and calendar screenshots, chart images and profile pictures.
                These are stored to display them in the relevant features. Images can contain additional personal
                information; check them before uploading.
              </li>
              <li>
                <strong>Broker connections:</strong> when you choose a supported connection, we process your
                broker/server, account number or login, account details and investor password. The current connection
                flow stores credentials in the backend and passes them to MetaApi to retrieve account and trading data.
                Use a read-only investor password, never your trading/master password.
              </li>
              <li>
                <strong>Billing:</strong> selected plan, customer and subscription identifiers, payment/subscription
                status and billing events. Checkout can send your email, name, country, postal code, account identifier
                and selected plan to Dodo Payments. Payment details are entered into the provider's checkout;
                TradeNovaOS does not collect full card numbers through its own forms.
              </li>
              <li>
                <strong>Support and service records:</strong> messages and contact details you send us, email-delivery
                status, subscription-event identifiers and administrative audit records. We use these to respond,
                deliver account messages, prevent duplicate processing and investigate problems.
              </li>
              <li>
                <strong>Technical information:</strong> our hosting and authentication providers process connection and
                request information, such as IP addresses, browser information, timestamps and error/security logs, to
                deliver and protect the service. Browser storage remembers sign-in sessions, consent choices and
                workspace preferences.
              </li>
            </ul>
          </section>
          <section>
            <h2>3. Google sign-in data</h2>
            <p>
              If you choose Continue with Google, Google and our authentication provider process the sign-in and provide
              account identity information, including a Google account identifier, email address and available basic
              profile information such as name and picture. We use this to create or identify your TradeNovaOS account,
              maintain your session and show your profile. TradeNovaOS does not receive your Google password.
            </p>
            <p>
              The sign-in integration is for basic identity. It does not request access to Gmail messages, Google Drive
              files, contacts or your Google Calendar. Identity information is stored with your account in the Lovable
              Cloud/Supabase authentication and database services. Your email and profile name may also be used for
              account emails and checkout as described below; your profile name can be included in a NOVA request to
              personalize the answer.
            </p>
            <p>
              You can remove the app's access in your{" "}
              <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">
                Google Account connections
              </a>
              . Revoking Google access or signing out does not delete the TradeNovaOS records already stored. To request
              deletion of those records, use the contact process in section 7.
            </p>
          </section>
          <section>
            <h2>4. AI features and service providers</h2>
            <p>
              We use the following services for the corresponding functions. Data is shared according to the feature you
              use, rather than with every provider for every visit.
            </p>
            <ul className="list-disc pl-5">
              <li>
                <strong>Lovable Cloud and Supabase technology:</strong> application hosting, authentication, database,
                file storage and backend processing.
              </li>
              <li>
                <strong>Google:</strong> optional Google sign-in. Google also supplies models used by some AI features
                through Lovable's AI gateway.
              </li>
              <li>
                <strong>Lovable AI gateway and model providers, including OpenAI and Google:</strong> when you use NOVA,
                AI trade review or plan analysis, relevant prompts, conversation history and trading context are sent
                for AI processing. NOVA can include your profile name, account balances, recent trades,
                journal/psychology notes, plans, checklists and preferences. Conversations, responses and related
                preferences can remain in your TradeNovaOS account. Do not submit passwords or unnecessary sensitive
                information in AI prompts. Avoid these optional AI features if you do not want this context sent for AI
                processing. Provider-side logging and retention are governed by the applicable provider arrangements; we
                do not promise that every AI request has zero retention.
              </li>
              <li>
                <strong>Dodo Payments:</strong> checkout, subscriptions and the customer billing portal. Dodo processes
                payment and billing information under its own terms and privacy policy.
              </li>
              <li>
                <strong>Resend:</strong> transactional welcome emails, using your recipient email, first name or
                greeting and plan-specific template, together with delivery and deduplication information.
              </li>
              <li>
                <strong>MetaApi:</strong> supported MetaTrader connections, using the connection credentials you supply
                and returning trading/account information.
              </li>
            </ul>
            <p>
              The economic calendar retrieves event information from external calendar feeds; it does not connect to
              your personal Google Calendar. If you follow an external link or contact us using your email service, that
              service also processes the interaction under its own policy.
            </p>
            <p>
              Authorized operators may access relevant data for support, account administration, security or responding
              to your request. Information may also be disclosed where required by applicable law or necessary to
              investigate misuse and protect the service. The application does not contain advertising-sale or
              targeted-advertising integrations.
            </p>
          </section>
          <section>
            <h2>5. Storage, visibility and security</h2>
            <p>
              Account and application records are stored in the production Lovable Cloud backend using Supabase
              database, authentication and storage services. The application uses authenticated access and user-scoped
              data access controls. Trade screenshots are loaded using time-limited signed URLs. Avatar images use
              public URLs: do not upload a confidential image as your avatar. Anyone you give an exported report or
              image link to may be able to view that content.
            </p>
            <p>
              Service providers may process information outside Morocco. This policy does not promise that all data
              stays in one country. We use access controls and secure service connections, but no system can guarantee
              absolute security. Protect your account and only connect accounts you are authorized to use.
            </p>
          </section>
          <section>
            <h2>6. Retention</h2>
            <p>
              Saved trading records, notes, plans, uploads, AI history and preferences remain in your account for
              ongoing use unless removed through an available feature or a deletion request is completed. There is
              currently no general automatic expiry schedule for all saved account content.
            </p>
            <p>
              Removing a record from a screen may not remove related uploaded files, provider-side records, backups or
              logs. Billing, security, audit and email-deduplication records can require separate review, including any
              applicable legal retention requirement. We have not established a single fixed deletion period for
              provider backups and logs, and do not promise immediate removal from every system. When handling a
              deletion request, we will explain any information that must be retained and why.
            </p>
            <p>
              Local preferences and consent choices remain in your browser until changed or cleared. Temporary session
              storage follows the browser session. See our <a href="/cookies">Cookie Policy</a> for details.
            </p>
          </section>
          <section>
            <h2>7. Access, correction and deletion requests</h2>
            <p>
              Email{" "}
              <a href="mailto:tradenova111@gmail.com?subject=TradeNovaOS%20privacy%20request">tradenova111@gmail.com</a>{" "}
              with the subject “TradeNovaOS privacy request” or “TradeNovaOS data deletion”. Identify the email used for
              your account and whether you want a copy of your data, a correction, deletion of particular records, or
              deletion of the entire account and associated data. Send the request from your account email where
              possible. Do not include passwords, payment-card details or broker credentials.
            </p>
            <p>
              We may ask for proportionate proof that you control the account before disclosing or deleting data. The
              current application does not provide a complete self-service account-deletion process; requests are
              handled manually. You can edit available profile fields and use individual record deletion controls where
              offered. For an account-wide request, associated screenshots, AI history, broker connections and relevant
              service-provider records need separate review.
            </p>
            <p>
              Deleting a trading-account row does not by itself confirm removal of the connection at MetaApi or your
              broker. Ask us to disconnect and remove provider-side connection data as part of your request; you can
              also revoke investor access with your broker. Deleting data or revoking Google access is not the same as
              cancelling a paid subscription: use Manage billing for cancellation or explicitly include cancellation in
              your request.
            </p>
            <p>
              We will respond to requests subject to applicable law and explain any identity-check requirement,
              retention exception or other limit. Depending on the law that applies to you, you may also request
              restriction of processing, object to processing or raise a complaint with the relevant data-protection
              authority.
            </p>
          </section>
          <section>
            <h2>8. Cookies and optional tracking</h2>
            <p>
              Essential browser storage supports authentication, security, your cookie choices and application
              preferences. The current application contains no optional analytics scripts or marketing pixels. The
              consent panel remembers category choices; you can change them through Cookie Settings. See the{" "}
              <a href="/cookies">Cookie Policy</a>. Clearing browser storage does not delete records saved in your
              TradeNovaOS account.
            </p>
          </section>
          <section>
            <h2>9. Updates and contact</h2>
            <p>
              We will update this page when our data practices change and update the date above. For questions about
              this policy or your information, contact AMINE TAHIRI, TradeNovaOS, Morocco, at{" "}
              <a href="mailto:tradenova111@gmail.com">tradenova111@gmail.com</a>.
            </p>
          </section>
        </article>
      </MarketingPageShell>
    </>
  );
}
