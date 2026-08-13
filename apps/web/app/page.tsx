import { MarketingLayout } from '../components/marketing/marketing-layout';
import { FragmentationSection } from '../components/marketing/fragmentation-section';
import {
  LandingClosing,
  LandingHero,
  LandingStory,
} from '../components/marketing/landing-sections';
import { ProductOverview } from '../components/marketing/product-overview';
import { RwaSection } from '../components/marketing/rwa-section';
import { CapitalGraph } from '../components/marketing/capital-graph';

export default function HomePage() {
  return (
    <MarketingLayout>
      <LandingHero />
      <FragmentationSection />
      <RwaSection />
      <CapitalGraph />
      <ProductOverview />
      <LandingStory />
      <LandingClosing />
    </MarketingLayout>
  );
}
