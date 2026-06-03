import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
}

const SITE_NAME = 'School LMS';
const DEFAULT_OG_IMAGE = 'https://school-ca94b.firebasestorage.app/og-image.png';
const BASE_URL = 'https://school-ca94b.web.app';

export function SEOHead({ title, description, ogTitle, ogDescription, ogImage = DEFAULT_OG_IMAGE, canonical }: SEOHeadProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const path = canonical || '/';
  const url = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      <meta name="twitter:description" content={ogDescription || description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
