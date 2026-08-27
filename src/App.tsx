import Hero from "@/components/Hero";
import MoodExplorer from "@/components/MoodExplorer";
import PlannerOverlay from "@/components/planner/PlannerOverlay";
import AuthDialog from "@/components/AuthDialog";
import ProfileDialog from "@/components/ProfileDialog";
import {
  ContactSection,
  DeparturesTicker,
  FaqSection,
  FeatureStrip,
  FlightPathDivider,
  Footer,
  HowItWorks,
} from "@/components/Sections";
import { ScrollProgressBar, SectionRail } from "@/components/ScrollChrome";

export default function App() {
  return (
    <div className="bg-wandor-night">
      {/* cinematic hero with destination picker */}
      <Hero />

      {/* everything below the fold */}
      <div className="relative bg-wandor-night text-white">
        <DeparturesTicker />
        <FeatureStrip />
        <FlightPathDivider />
        <HowItWorks />
        <MoodExplorer />
        <FlightPathDivider />
        <FaqSection />
        <ContactSection />
        <Footer />
      </div>

      {/* overlays + chrome */}
      <PlannerOverlay />
      <AuthDialog />
      <ProfileDialog />
      <ScrollProgressBar />
      <SectionRail />
    </div>
  );
}
