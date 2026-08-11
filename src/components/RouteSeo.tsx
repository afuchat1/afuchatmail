import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://email.afuchat.com";
const SITE_NAME = "AfuChat Mail";

const FAQS = [
  {
    q: "How do I reset my password?",
    a: "Open the sign-in page and choose Forgot password. AfuChat Mail sends a reset link to the recovery address on your account.",
  },
  {
    q: "How do I create an alias?",
    a: "Open Settings, go to Addresses and use the alias form. Aliases deliver into your main inbox.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Professional and Business plans can add a custom domain, publish the DNS records we generate, and create addresses on it.",
  },
  {
    q: "Is there a file size limit for attachments?",
    a: "Individual attachments are limited to 10MB, and you can attach several files to one message.",
  },
];

const PLANS = [
  { name: "Starter", price: "0", desc: "One @afuchat.com address, one alias and 500 MB of storage." },
  { name: "Professional", price: "15000", desc: "Three addresses, five aliases, custom domains and 5 GB of storage." },
  { name: "Business", price: "50000", desc: "Unlimited addresses, 25 aliases and 25 GB of storage." },
];

type SeoEntry = {
  title: string;
  description: string;
  jsonLd?: Record<string, unknown>;
  noIndex?: boolean;
};

const ROUTES: Record<string, SeoEntry> = {
  "/": {
    title: "AfuChat Mail — Professional Email for Teams",
    description:
      "Get a professional @afuchat.com email address with a clean inbox, smart aliases, custom domains and zero ads. Built for teams and individuals.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      publisher: {
        "@type": "Organization",
        name: "AfuChat",
        url: "https://afuchat.com",
        logo: `${SITE_URL}/logo.svg`,
      },
    },
  },
  "/features": {
    title: "Features — AfuChat Mail",
    description:
      "Smart aliases, threaded conversations, snooze, scheduled send, offline access, push notifications and AI writing help in one email client.",
  },
  "/pricing": {
    title: "Pricing — AfuChat Mail Plans",
    description:
      "Compare AfuChat Mail plans: free Starter, Professional at UGX 15,000 and Business at UGX 50,000 with custom domains and 25 GB of storage.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${SITE_NAME} subscription`,
      description: "Hosted professional email with aliases, custom domains and storage tiers.",
      brand: { "@type": "Brand", name: SITE_NAME },
      offers: PLANS.map((p) => ({
        "@type": "Offer",
        name: p.name,
        description: p.desc,
        price: p.price,
        priceCurrency: "UGX",
        url: `${SITE_URL}/pricing`,
        availability: "https://schema.org/InStock",
      })),
    },
  },
  "/solutions": {
    title: "Solutions — AfuChat Mail for Every Team",
    description:
      "See how founders, small teams, agencies and developers use AfuChat Mail for branded addresses, shared domains and API access.",
  },
  "/about": {
    title: "About AfuChat Mail",
    description:
      "AfuChat Mail is an independent email platform built for people who want a fast, private, ad-free inbox on their own terms.",
  },
  "/contact": {
    title: "Contact Support — AfuChat Mail",
    description:
      "Reach AfuChat Mail for support, billing or partnership questions. Average response time is under 24 hours, seven days a week.",
  },
  "/help": {
    title: "Help Center — AfuChat Mail",
    description:
      "Guides and answers for AfuChat Mail: addresses and aliases, custom domains, recovery email, notifications and attachment limits.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  },
  "/docs": {
    title: "API Documentation — AfuChat Mail",
    description:
      "AfuChat Mail REST API reference: OAuth 2.0 authorization, tokens, scopes, and endpoints for reading, searching and sending mail.",
  },
  "/developers": {
    title: "Developers — AfuChat Mail OAuth Apps",
    description:
      "Register an OAuth 2.0 application, pick scopes and use AfuChat as an identity and mail provider for your own app.",
  },
  "/security": {
    title: "Security — AfuChat Mail",
    description:
      "How AfuChat Mail protects your mailbox: encrypted transport, row-level data isolation, audited admin access and recovery-email resets.",
  },
  "/privacy": {
    title: "Privacy Policy — AfuChat Mail",
    description:
      "What AfuChat Mail collects, how your mail is stored, and why we never scan your inbox for advertising.",
  },
  "/terms": {
    title: "Terms of Service — AfuChat Mail",
    description: "The terms that govern your use of AfuChat Mail accounts, addresses, domains and API access.",
  },
  "/status": {
    title: "System Status — AfuChat Mail",
    description: "Live availability and response times for AfuChat Mail delivery, inbound mail, authentication and the API.",
  },
  "/changelog": {
    title: "Changelog — AfuChat Mail",
    description: "New features, improvements and fixes shipped to AfuChat Mail, newest first.",
  },
};

// Private, transactional and OAuth surfaces should never be indexed.
const NO_INDEX_PREFIXES = [
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
  "/settings",
  "/admin",
  "/telegram",
  "/oauth",
  "/authorize",
  "/o/oauth2",
];

const FALLBACK: SeoEntry = {
  title: "AfuChat Mail — Professional Email for Teams",
  description:
    "Get a professional @afuchat.com email address with a clean inbox, smart aliases, custom domains and zero ads.",
  noIndex: true,
};

export const RouteSeo = () => {
  const { pathname } = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  const entry = ROUTES[path] ?? FALLBACK;
  const noIndex = entry.noIndex || NO_INDEX_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const url = `${SITE_URL}${path === "/" ? "/" : path}`;

  return (
    <Helmet prioritizeSeoTags>
      <title>{entry.title}</title>
      <meta name="description" content={entry.description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={entry.title} />
      <meta property="og:description" content={entry.description} />
      <meta property="og:url" content={url} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={entry.title} />
      <meta name="twitter:description" content={entry.description} />

      {entry.jsonLd && (
        <script type="application/ld+json">{JSON.stringify(entry.jsonLd)}</script>
      )}
    </Helmet>
  );
};
