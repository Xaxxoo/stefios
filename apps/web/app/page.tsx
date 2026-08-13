import { MarketingLayout } from '../components/marketing/marketing-layout';
import { FragmentationSection } from '../components/marketing/fragmentation-section';
import { LandingClosing, LandingHero, LandingStory } from '../components/marketing/landing-sections';
import { ProductOverview } from '../components/marketing/product-overview';

export default function HomePage() { return <MarketingLayout><LandingHero /><FragmentationSection /><ProductOverview /><LandingStory /><LandingClosing /></MarketingLayout>; }
