import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Plus, User } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * Circular avatar uploader used on the mentor profile onboarding
 * step: opens the native file picker and previews the chosen image.
 */
export function PhotoUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Release the object URL when it's replaced or the component unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function handleRemove() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="flex w-full items-center gap-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={previewUrl ? 'Change profile photo' : 'Upload profile photo'}
        className="relative size-30 shrink-0"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="size-30 rounded-full object-cover" />
        ) : (
          <div className="flex size-30 items-center justify-center rounded-full bg-subtle">
            <User className="size-10 text-ink-muted" />
          </div>
        )}
        <span className="absolute bottom-0 right-0 flex size-9 items-center justify-center rounded-full bg-primary">
          <Plus className="size-4.5 text-ink-inverse" />
        </span>
      </button>

      <div className="flex flex-1 flex-col items-start gap-1.5">
        <p className="font-sans text-base font-semibold text-ink">Profile photo</p>
        <p className="font-sans text-sm text-ink-soft">
          A clear, friendly photo builds trust. Square image, at least 400×400px.
        </p>
        <div className="mt-1 flex items-center gap-4">
          <Button
            type="button"
            variant="outlined"
            size="md"
            onClick={() => inputRef.current?.click()}
          >
            {previewUrl ? 'Change photo' : 'Upload photo'}
          </Button>
          {previewUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="font-sans text-sm font-medium text-tertiary"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
