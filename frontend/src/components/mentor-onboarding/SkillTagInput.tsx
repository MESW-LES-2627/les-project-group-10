import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Tag } from '@/components/ui';
import type { TagTone } from '@/components/ui';

const TONES: TagTone[] = ['green', 'blue', 'orange', 'yellow'];

export interface SkillTagInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
}

/**
 * Tag-entry field for a mentor's skills: type and press Enter to add,
 * Backspace on an empty field to remove the last one.
 */
export function SkillTagInput({ skills, onChange }: SkillTagInputProps) {
  const [draft, setDraft] = useState('');

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && draft.trim()) {
      event.preventDefault();
      onChange([...skills, draft.trim()]);
      setDraft('');
    } else if (event.key === 'Backspace' && !draft && skills.length > 0) {
      onChange(skills.slice(0, -1));
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="font-sans text-sm font-medium text-ink">Skills</p>
      <div className="flex w-full flex-wrap items-center gap-2 rounded-[10px] border-[1.5px] border-primary bg-surface px-3.5 py-3">
        {skills.map((skill, index) => (
          <Tag key={skill} label={skill} tone={TONES[index % TONES.length]} />
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a skill…"
          className="min-w-30 flex-1 bg-transparent font-sans text-base text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>
    </div>
  );
}
