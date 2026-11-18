import clsx from 'clsx';

const THUMB_CLASSES =
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-[0px_2px_6px_0px_rgba(13,43,36,0.3)] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-surface';

export interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChange: (next: { min: number; max: number }) => void;
  formatValue?: (value: number) => string;
  /** Text color class for the selected range shown on the right. Defaults to the blue accent. */
  valueClassName?: string;
}

/**
 * Dual-handle range slider (e.g. a price-per-session budget),
 * built from two overlapping native range inputs.
 */
export function RangeSlider({
  label,
  min,
  max,
  step = 1,
  valueMin,
  valueMax,
  onChange,
  formatValue = String,
  valueClassName = 'text-secondary',
}: RangeSliderProps) {
  const minPercent = ((valueMin - min) / (max - min)) * 100;
  const maxPercent = ((valueMax - min) / (max - min)) * 100;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full items-center justify-between">
        <p className="font-sans text-base font-semibold text-ink">{label}</p>
        <p className={clsx('font-sans text-sm font-medium', valueClassName)}>
          {formatValue(valueMin)} – {formatValue(valueMax)}
        </p>
      </div>

      <div className="relative h-5 w-full">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          type="range"
          aria-label={`${label} minimum`}
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(event) =>
            onChange({ min: Math.min(Number(event.target.value), valueMax - step), max: valueMax })
          }
          className={clsx(
            'pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent',
            THUMB_CLASSES,
          )}
        />
        <input
          type="range"
          aria-label={`${label} maximum`}
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(event) =>
            onChange({ min: valueMin, max: Math.max(Number(event.target.value), valueMin + step) })
          }
          className={clsx(
            'pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent',
            THUMB_CLASSES,
          )}
        />
      </div>

      <div className="flex w-full items-center justify-between font-sans text-xs font-medium text-ink-muted">
        <p>{formatValue(min)}</p>
        <p>{formatValue(max)}+</p>
      </div>
    </div>
  );
}
