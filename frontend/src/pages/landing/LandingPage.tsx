import { NavBar } from '@/components/layout/NavBar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from './sections/Hero';
import { StatsBand } from './sections/StatsBand';
import { HowItWorks } from './sections/HowItWorks';
import { FeaturedMentors } from './sections/FeaturedMentors';
import { MentorCta } from './sections/MentorCta';
import { FreeResources } from './sections/FreeResources';
import { Faq } from './sections/Faq';
import { FinalCta } from './sections/FinalCta';

/**
 * `/` screen: composes the public header, every landing section in
 * order, and the footer.
 */
export default function LandingPage() {
  return (
    <div className="flex w-full flex-col items-center bg-canvas">
      <NavBar />
      <Hero />
      <StatsBand />
      <HowItWorks />
      <FeaturedMentors />
      <MentorCta />
      <FreeResources />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
