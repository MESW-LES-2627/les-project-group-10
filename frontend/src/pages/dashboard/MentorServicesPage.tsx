import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Check, Clock, Pencil, Plus } from 'lucide-react';
import { ApiError } from '@/api/client';
import {
  createMentorService,
  getMentorServices,
  setMentorServiceActive,
  updateMentorService,
} from '@/api/mentorServices';
import type { MentorServiceRecord } from '@/api/mentorServices';
import { useAuth } from '@/auth/useAuth';
import { Button, Input, Textarea } from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import {
  EMPTY_SERVICE_DRAFT,
  toMentorServiceInput,
  validateMentorServiceDraft,
} from '@/lib/mentorServices';
import type { MentorServiceDraft } from '@/lib/mentorServices';

function sortedServices(services: MentorServiceRecord[]) {
  return [...services].sort((a, b) => a.title.localeCompare(b.title));
}

function toDraft(service: MentorServiceRecord): MentorServiceDraft {
  return {
    title: service.title,
    description: service.description,
    price: (service.priceCents / 100).toString(),
    duration: service.durationMinutes.toString(),
  };
}

export default function MentorServicesPage() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Loading…</p>;
  if (!user) return <Navigate to="/login?next=%2Fdashboard%2Fservices" replace />;
  if (!user.isMentor)
    return (
      <DashboardLayout title="Services & fees">
        <p role="alert">Only mentors can manage services.</p>
      </DashboardLayout>
    );
  if (!user.onboardingFinished) return <Navigate to="/mentor-onboarding/profile" replace />;
  return (
    <DashboardLayout title="Services & fees">
      <ServicesManager key={user.id} />
    </DashboardLayout>
  );
}

function ServicesManager() {
  const [services, setServices] = useState<MentorServiceRecord[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MentorServiceDraft>(EMPTY_SERVICE_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
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
    getMentorServices()
      .then((result) => {
        if (cancelled) return;
        setServices(sortedServices(result.services));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError ? error.message : 'Could not load your services. Try again.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (formMessage) errorSummary.current?.focus();
  }, [formMessage, fieldErrors]);

  const isAddingNew = editingId === 'new';

  function startAdd() {
    setEditingId('new');
    setDraft(EMPTY_SERVICE_DRAFT);
    setFieldErrors({});
    setFormMessage('');
  }

  function startEdit(service: MentorServiceRecord) {
    setEditingId(service.id);
    setDraft(toDraft(service));
    setFieldErrors({});
    setFormMessage('');
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_SERVICE_DRAFT);
    setFieldErrors({});
    setFormMessage('');
  }

  async function handleSave() {
    if (submitting.current) return;
    const validation = validateMentorServiceDraft(draft);
    setFieldErrors(validation);
    setFormMessage('');
    if (Object.keys(validation).length) {
      setFormMessage('Check the highlighted fields.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const input = toMentorServiceInput(draft);
      const result = isAddingNew
        ? await createMentorService(input)
        : await updateMentorService(editingId!, input);
      if (!mounted.current) return;
      setServices((current) => {
        const existing = current ?? [];
        return sortedServices(
          isAddingNew
            ? [...existing, result.service]
            : existing.map((service) =>
                service.id === result.service.id ? result.service : service,
              ),
        );
      });
      setEditingId(null);
      setDraft(EMPTY_SERVICE_DRAFT);
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

  async function handleToggleActive(service: MentorServiceRecord) {
    setListMessage('');
    setTogglingId(service.id);
    try {
      const result = await setMentorServiceActive(service.id, !service.isActive);
      if (!mounted.current) return;
      setServices((current) =>
        sortedServices(
          (current ?? []).map((item) => (item.id === result.service.id ? result.service : item)),
        ),
      );
    } catch (error) {
      if (!mounted.current) return;
      setListMessage(
        error instanceof ApiError ? error.message : 'Could not update this service. Try again.',
      );
    } finally {
      if (mounted.current) setTogglingId(null);
    }
  }

  if (!services) {
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
          <p role="status">Loading your services…</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Services &amp; fees</h1>
        <p className="text-ink-soft">
          Add, edit or deactivate what you offer. Changing a service never changes bookings already
          made for it — those keep the details and price agreed at the time.
        </p>
      </div>
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
        {services.length === 0 && !isAddingNew && (
          <p className="text-ink-soft">You have no services yet.</p>
        )}
        {services.map((service) =>
          editingId === service.id ? (
            <ServiceEditForm
              key={service.id}
              draft={draft}
              errors={fieldErrors}
              saving={saving}
              onDraftChange={setDraft}
              onSave={handleSave}
              onCancel={cancelEdit}
            />
          ) : (
            <ServiceRow
              key={service.id}
              service={service}
              disabled={editingId !== null || togglingId !== null}
              toggling={togglingId === service.id}
              onEdit={() => startEdit(service)}
              onToggleActive={() => handleToggleActive(service)}
            />
          ),
        )}
        {isAddingNew && (
          <ServiceEditForm
            draft={draft}
            errors={fieldErrors}
            saving={saving}
            onDraftChange={setDraft}
            onSave={handleSave}
            onCancel={cancelEdit}
          />
        )}
        {editingId === null && (
          <button
            type="button"
            onClick={startAdd}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-primary p-4"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft">
              <Plus className="size-4 text-primary" />
            </span>
            <span className="font-sans text-base font-semibold text-primary">
              {services.length === 0 ? 'Add a service' : 'Add another service'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

interface ServiceRowProps {
  service: MentorServiceRecord;
  disabled: boolean;
  toggling: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}

function ServiceRow({ service, disabled, toggling, onEdit, onToggleActive }: ServiceRowProps) {
  return (
    <div className="flex w-full items-center gap-4 rounded-2xl bg-canvas p-4">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="font-sans text-base font-semibold text-ink">{service.title}</p>
          <span
            className={
              service.isActive
                ? 'rounded-full bg-primary-soft px-2.5 py-0.5 font-sans text-xs font-medium text-primary'
                : 'rounded-full bg-canvas px-2.5 py-0.5 font-sans text-xs font-medium text-ink-muted ring-1 ring-inset ring-line'
            }
          >
            {service.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="size-3.5 text-ink-muted" />
          <p className="font-sans text-xs font-medium text-ink-muted">
            {service.durationMinutes} min
          </p>
        </div>
      </div>
      <p className="font-display text-lg font-semibold tracking-tight text-ink">
        €{(service.priceCents / 100).toFixed(2)}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Edit ${service.title}`}
          disabled={disabled}
          onClick={onEdit}
          className="flex text-ink-muted disabled:opacity-40"
        >
          <Pencil className="size-4.5" />
        </button>
        <Button
          type="button"
          size="md"
          variant="outlined"
          disabled={disabled || toggling}
          onClick={onToggleActive}
        >
          {toggling ? 'Saving…' : service.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </div>
  );
}

interface ServiceEditFormProps {
  draft: MentorServiceDraft;
  errors: Record<string, string>;
  saving: boolean;
  onDraftChange: (draft: MentorServiceDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ServiceEditForm({
  draft,
  errors,
  saving,
  onDraftChange,
  onSave,
  onCancel,
}: ServiceEditFormProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSave();
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border-[1.5px] border-primary bg-canvas p-4">
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
          <Input
            type="text"
            label="Service name"
            placeholder="1:1 Mentoring call"
            value={draft.title}
            error={errors.title}
            onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <div className="w-32 shrink-0">
          <Input
            type="number"
            min={5}
            step={1}
            label="Duration (min)"
            placeholder="60"
            value={draft.duration}
            error={errors.durationMinutes}
            onChange={(event) => onDraftChange({ ...draft, duration: event.target.value })}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="w-24 shrink-0">
          <Input
            type="number"
            min={0.5}
            step={0.01}
            label="Fee (€)"
            placeholder="35"
            value={draft.price}
            error={errors.priceCents}
            onChange={(event) => onDraftChange({ ...draft, price: event.target.value })}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      <Textarea
        label="Description"
        placeholder="What will you cover in this session?"
        maxLength={500}
        value={draft.description}
        error={errors.description}
        onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
      />
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
          {saving ? 'Saving…' : 'Save service'}
        </Button>
      </div>
    </div>
  );
}
