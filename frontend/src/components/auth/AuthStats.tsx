const stats = [
  { value: '1,200+', label: 'students' },
  { value: '180', label: 'mentors' },
  { value: '4.8★', label: 'avg. rating' },
];

/**
 * The students/mentors/rating stat row shown at the base of the auth
 * brand panel.
 */
export function AuthStats() {
  return (
    <div className="flex gap-10">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-0.5">
          <p className="font-display text-[22px] font-semibold tracking-tight text-ink-inverse">{stat.value}</p>
          <p className="font-sans text-sm text-primary-soft">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
