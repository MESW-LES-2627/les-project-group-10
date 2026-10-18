import { NavBar } from '@/components/layout/NavBar';
import { MentorDirectory } from '@/components/mentors/MentorDirectory';

/**
 * `/mentors`: public mentor list. Anyone can search and filter.
 * Opening a profile or paying requires a signed-in student.
 */
export default function FindMentorsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-canvas">
      <NavBar />

      <div className="flex w-full flex-col gap-8 px-6 pb-24 pt-14 lg:px-30">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-2.5">
            <span className="h-4.5 w-1.5 rounded-[1px] bg-primary" />
            <p className="font-sans text-base font-semibold text-ink">
              Tutors, mentors and industry pros — hand-picked for FEUP.
            </p>
          </div>
          <h1 className="font-display text-6xl font-extrabold leading-[0.98] tracking-tight text-ink">
            Find the mentor who gets you.
          </h1>
          <p className="max-w-180 font-sans text-lg text-ink-soft">
            Compare expertise, fees and availability. Book a paid session in minutes.
          </p>
        </div>

        <MentorDirectory />
      </div>
    </div>
  );
}
