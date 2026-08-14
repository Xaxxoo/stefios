import { MarketingLayout } from '../components/marketing/marketing-layout';
import { FragmentationSection } from '../components/marketing/fragmentation-section';
import { LandingHero, LandingStory } from '../components/marketing/landing-sections';
import { ProductOverview } from '../components/marketing/product-overview';
import { RwaSection } from '../components/marketing/rwa-section';
import { CapitalGraph } from '../components/marketing/capital-graph';
import {
  EcosystemSection,
  FinalCta,
  InstitutionalSection,
  SecuritySection,
} from '../components/marketing/institutional-section';

export default function HomePage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Stellar Financial OS',
    description: 'A non-custodial financial command center for Stellar.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stellarfinancialos.com',
  };

  return (
    <MarketingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <LandingHero />
      <FragmentationSection />
      <RwaSection />
      <CapitalGraph />
      <ProductOverview />
      <LandingStory />
      <InstitutionalSection />
      <SecuritySection />
      <EcosystemSection />
      <FinalCta />
    </MarketingLayout>
  );
}
