import { Logo } from '@/components/ui';

const footerColumns = [
  {
    title: 'Platform',
    links: ['Find a mentor', 'How it works', 'Free resources', 'Pricing'],
  },
  {
    title: 'For mentors',
    links: ['Become a mentor', 'Mentor resources', 'Payouts'],
  },
  {
    title: 'Company',
    links: ['About us', 'Careers', 'Contact'],
  },
  {
    title: 'Legal',
    links: ['Terms of Service', 'Privacy Policy', 'Cookie Policy'],
  },
];

const socialLinks = ['Instagram', 'LinkedIn', 'Email'];

/**
 * Site-wide footer: brand blurb, link columns and the bottom legal bar.
 */
export function Footer() {
  return (
    <footer className="flex w-full flex-col gap-12 bg-primary-strong px-6 pb-8 pt-16 lg:px-30">
      <div className="flex flex-col flex-wrap gap-12 lg:flex-row lg:justify-between">
        <div className="flex w-full max-w-80 flex-col gap-4">
          <Logo variant="onDark" />
          <p className="font-sans text-sm text-primary-soft">
            Connecting FEUP students with tutors, mentors and industry professionals.
          </p>
        </div>
        {footerColumns.map((column) => (
          <div key={column.title} className="flex flex-col gap-3.5">
            <p className="font-sans text-base font-semibold text-ink-inverse">{column.title}</p>
            {column.links.map((link) => (
              <p key={link} className="font-sans text-sm text-primary-soft">
                {link}
              </p>
            ))}
          </div>
        ))}
      </div>
      <div className="h-px w-full bg-primary" />
      <div className="flex flex-col items-start gap-4 font-sans text-xs font-medium text-primary-soft sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 FEUP Connect. Built by students, for students.</p>
        <div className="flex gap-4">
          {socialLinks.map((link) => (
            <p key={link}>{link}</p>
          ))}
        </div>
      </div>
    </footer>
  );
}
