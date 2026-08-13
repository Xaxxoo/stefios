import { MarketingLayout } from '../components/marketing/marketing-layout';
import { LandingClosing, LandingHero, LandingStory } from '../components/marketing/landing-sections';

export default function HomePage() { return <MarketingLayout><LandingHero /><LandingStory /><LandingClosing /></MarketingLayout>; }
