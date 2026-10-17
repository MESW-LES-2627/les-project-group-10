const stats = [
  { value: '1,200+', label: 'students helped' },
  { value: '180+', label: 'active mentors' },
  { value: '4.8★', label: 'average rating' },
  { value: '€28', label: 'average session price' },
];

/**
 * Dark stat strip (students, mentors, rating, price) under the hero.
 */
export function StatsBand() {
  return (
    <div className="flex w-full flex-wrap justify-around gap-6 bg-primary px-6 py-8 lg:justify-between lg:px-30">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col items-center gap-1">
          <p className="font-display text-[32px] font-bold tracking-tight text-ink-inverse">
            {stat.value}
          </p>
          <p className="font-sans text-sm text-primary-soft">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
