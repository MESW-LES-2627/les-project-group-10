import { useEffect, useId, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import clsx from 'clsx';
import { Check, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '@/api/client';
import { getMentorById } from '@/api/mentors';
import type { MentorService } from '@/api/mentors';
import {
  createMentorSlot,
  deleteMentorSlot,
  getMentorSlots,
  updateMentorSlot,
} from '@/api/mentorSlots';
import type { MentorSlot, MentorSlotInput } from '@/api/mentorSlots';
import { useAuth } from '@/auth/useAuth';
import { Button, Input } from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { validateMentorSlotDraft } from '@/lib/mentorSlots';

const EMPTY_DRAFT: MentorSlotInput = { serviceId: '', date: '', startTime: '', endTime: '' };

function sortedSlots(slots: MentorSlot[]) {
  return [...slots].sort((a, b) =>
    `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
  );
}

export default function MentorSlotsPage() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Loading…</p>;
  if (!user) return <Navigate to="/login?next=%2Fdashboard%2Fslots" replace />;
  if (!user.isMentor)
    return (
      <DashboardLayout title="Availability slots">
        <p role="alert">Only mentors can manage availability slots.</p>
      </DashboardLayout>
    );
  if (!user.onboardingFinished) return <Navigate to="/mentor-onboarding/profile" replace />;
  return (
    <DashboardLayout title="Availability slots">
      <SlotsManager key={user.id} userId={user.id} />
    </DashboardLayout>
  );
}

function SlotsManager({ userId }: { userId: string }) {
  const [slots, setSlots] = useState<MentorSlot[] | null>(null);
  const [services, setServices] = useState<MentorService[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MentorSlotInput>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState('');
  const mounted = useRef(false);
  const submitting = useRef(false);
  const errorSummary = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMentorSlots(), getMentorById(userId)])
      .then(([slotsResult, mentor]) => {
        if (cancelled) return;
        setSlots(sortedSlots(slotsResult.slots));
        setServices(mentor?.services ?? []);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError ? error.message : 'Could not load your slots. Try again.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  useEffect(() => {
    if (formMessage) errorSummary.current?.focus();
  }, [formMessage, fieldErrors]);

  const isAddingNew = editingId === 'new';

  function startAdd() {
    setEditingId('new');
    setDraft(EMPTY_DRAFT);
    setFieldErrors({});
    setFormMessage('');
    setConfirmingDeleteId(null);
  }

  function startEdit(slot: MentorSlot) {
    setEditingId(slot.id);
    setDraft({
      serviceId: slot.serviceId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
    setFieldErrors({});
    setFormMessage('');
    setConfirmingDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFieldErrors({});
    setFormMessage('');
  }

  async function handleSave() {
    if (submitting.current) return;
    const validation = validateMentorSlotDraft(draft);
    setFieldErrors(validation);
    setFormMessage('');
    if (Object.keys(validation).length) {
      setFormMessage('Check the highlighted fields.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const result = isAddingNew
        ? await createMentorSlot(draft)
        : await updateMentorSlot(editingId!, draft);
      if (!mounted.current) return;
      setSlots((current) => {
        const existing = current ?? [];
        return sortedSlots(
          isAddingNew
            ? [...existing, result.slot]
            : existing.map((slot) => (slot.id === result.slot.id ? result.slot : slot)),
        );
      });
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof ApiError) {
        setFieldErrors(error.fields);
        setFormMessage(error.message);
      } else {
        setFormMessage('Could not confirm the save. Try again.');
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setConfirmingDeleteId(null);
    setListMessage('');
    setSaving(true);
    try {
      await deleteMentorSlot(id);
      if (!mounted.current) return;
      setSlots((current) => (current ?? []).filter((slot) => slot.id !== id));
    } catch (error) {
      if (!mounted.current) return;
      setListMessage(
        error instanceof ApiError ? error.message : 'Could not remove this slot. Try again.',
      );
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  if (!slots || !services) {
    return (
      <div className="p-8">
        {loadError ? (
          <>
            <p role="alert">{loadError}</p>
            <Button
              onClick={() => {
                setLoadError('');
                setAttempt((value) => value + 1);
              }}
            >
              Retry loading
            </Button>
          </>
        ) : (
          <p role="status">Loading your availability…</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Availability slots</h1>
        <p className="text-ink-soft">
          Times are shown and saved in Europe/Lisbon — the same timezone students see on your public
          profile.
        </p>
      </div>
      {services.length === 0 && (
        <p role="alert">Add a service to your profile before creating availability slots.</p>
      )}
      {listMessage && (
        <p role="alert" className="text-danger">
          {listMessage}
        </p>
      )}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
        {formMessage && (
          <p ref={errorSummary} tabIndex={-1} role="alert" className="text-danger">
            {formMessage}
          </p>
        )}
        {slots.length === 0 && !isAddingNew && (
          <p className="text-ink-soft">You have no availability slots yet.</p>
        )}
        {slots.map((slot) =>
          editingId === slot.id ? (
            <SlotEditForm
              key={slot.id}
              draft={draft}
              services={services}
              errors={fieldErrors}
              saving={saving}
              onDraftChange={setDraft}
              onSave={handleSave}
              onCancel={cancelEdit}
            />
          ) : (
            <SlotRow
              key={slot.id}
              slot={slot}
              confirmingDelete={confirmingDeleteId === slot.id}
              disabled={saving || editingId !== null}
              onEdit={() => startEdit(slot)}
              onDelete={() => handleDelete(slot.id)}
              onCancelDelete={() => setConfirmingDeleteId(null)}
            />
          ),
        )}
        {isAddingNew && (
          <SlotEditForm
            draft={draft}
            services={services}
            errors={fieldErrors}
            saving={saving}
            onDraftChange={setDraft}
            onSave={handleSave}
            onCancel={cancelEdit}
          />
        )}
        {editingId === null && services.length > 0 && (
          <button
            type="button"
            onClick={startAdd}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-primary p-4"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft">
              <Plus className="size-4 text-primary" />
            </span>
            <span className="font-sans text-base font-semibold text-primary">
              Add an availability slot
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

interface SlotRowProps {
  slot: MentorSlot;
  confirmingDelete: boolean;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
}

function SlotRow({
  slot,
  confirmingDelete,
  disabled,
  onEdit,
  onDelete,
  onCancelDelete,
}: SlotRowProps) {
  return (
    <div className="flex w-full items-center gap-4 rounded-2xl bg-canvas p-4">
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-sans text-base font-semibold text-ink">{slot.serviceTitle}</p>
        <div className="flex items-center gap-1">
          <Clock className="size-3.5 text-ink-muted" />
          <p className="font-sans text-xs font-medium text-ink-muted">
            {slot.date} · {slot.startTime}–{slot.endTime}
          </p>
        </div>
      </div>
      {slot.booked && (
        <span className="rounded-full bg-primary-soft px-2.5 py-1 font-sans text-xs font-medium text-primary">
          Booked
        </span>
      )}
      {confirmingDelete ? (
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs font-medium text-ink-soft">Delete this slot?</span>
          <Button type="button" size="md" variant="outlined" disabled={disabled} onClick={onDelete}>
            Confirm
          </Button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="font-sans text-sm font-medium text-ink-soft"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Edit slot on ${slot.date} at ${slot.startTime}`}
            disabled={disabled || slot.booked}
            onClick={onEdit}
            className="flex text-ink-muted disabled:opacity-40"
          >
            <Pencil className="size-4.5" />
          </button>
          <button
            type="button"
            aria-label={`Remove slot on ${slot.date} at ${slot.startTime}`}
            disabled={disabled || slot.booked}
            onClick={onDelete}
            className="flex text-tertiary disabled:opacity-40"
          >
            <Trash2 className="size-4.5" />
          </button>
        </div>
      )}
    </div>
  );
}

interface SlotEditFormProps {
  draft: MentorSlotInput;
  services: MentorService[];
  errors: Record<string, string>;
  saving: boolean;
  onDraftChange: (draft: MentorSlotInput) => void;
  onSave: () => void;
  onCancel: () => void;
}

function SlotEditForm({
  draft,
  services,
  errors,
  saving,
  onDraftChange,
  onSave,
  onCancel,
}: SlotEditFormProps) {
  const serviceFieldId = useId();
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border-[1.5px] border-primary bg-canvas p-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={serviceFieldId} className="font-sans text-sm font-medium text-ink">
          Service
        </label>
        <div
          className={clsx(
            'mt-2 flex h-13 w-full items-center gap-3 rounded-[10px] border bg-surface px-4',
            errors.serviceId ? 'border-danger' : 'border-line focus-within:border-line-strong',
          )}
        >
          <select
            id={serviceFieldId}
            value={draft.serviceId}
            onChange={(event) => onDraftChange({ ...draft, serviceId: event.target.value })}
            aria-invalid={errors.serviceId ? true : undefined}
            className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink focus:outline-none"
          >
            <option value="" disabled>
              Choose a service
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title} ({service.duration})
              </option>
            ))}
          </select>
        </div>
        {errors.serviceId && (
          <p role="alert" className="mt-2 font-sans text-sm text-danger">
            {errors.serviceId}
          </p>
        )}
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
          <Input
            type="date"
            label="Date"
            value={draft.date}
            error={errors.date}
            onChange={(event) => onDraftChange({ ...draft, date: event.target.value })}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            type="time"
            label="Start time"
            value={draft.startTime}
            error={errors.startTime}
            onChange={(event) => onDraftChange({ ...draft, startTime: event.target.value })}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            type="time"
            label="End time"
            value={draft.endTime}
            error={errors.endTime}
            onChange={(event) => onDraftChange({ ...draft, endTime: event.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="font-sans text-sm font-medium text-ink-soft"
        >
          Cancel
        </button>
        <Button
          type="button"
          size="md"
          disabled={saving}
          onClick={onSave}
          icon={<Check className="size-4" />}
        >
          {saving ? 'Saving…' : 'Save slot'}
        </Button>
      </div>
    </div>
  );
}
