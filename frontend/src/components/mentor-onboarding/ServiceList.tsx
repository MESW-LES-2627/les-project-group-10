import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';

export interface Service {
  id: string;
  title: string;
  description: string;
  /** minutes, kept as the text of a number input (e.g. "60") */
  duration: string;
  /** euros, kept as the text of a number input (e.g. "35" or "12.50") */
  price: string;
}

export interface ServiceListProps {
  services: Service[];
  onChange: (services: Service[]) => void;
}

const EMPTY_DRAFT: Service = { id: '', title: '', description: '', duration: '', price: '' };

function isServiceDraftValid(draft: Service): boolean {
  return Boolean(
    draft.title.trim() && draft.description.trim() && draft.duration.trim() && draft.price.trim(),
  );
}

let nextServiceId = 0;

/**
 * Editable list of a mentor's bookable services (title, duration,
 * fee). Adding or editing a service opens an inline form — there's
 * no point showing a service a mentor can't actually fill in.
 */
export function ServiceList({ services, onChange }: ServiceListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Service>(EMPTY_DRAFT);

  const isAddingNew = editingId !== null && !services.some((service) => service.id === editingId);

  function startEdit(service: Service) {
    setEditingId(service.id);
    setDraft(service);
  }

  function startAdd() {
    nextServiceId += 1;
    const id = `service-${nextServiceId}`;
    setEditingId(id);
    setDraft({ ...EMPTY_DRAFT, id });
  }

  function handleRemove(id: string) {
    onChange(services.filter((service) => service.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function handleCancel() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function handleSave() {
    if (!isServiceDraftValid(draft)) return;
    const exists = services.some((service) => service.id === draft.id);
    onChange(
      exists
        ? services.map((service) => (service.id === draft.id ? draft : service))
        : [...services, draft],
    );
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="font-sans text-base font-semibold text-ink">Services &amp; fees</p>
        <p className="font-sans text-xs font-medium text-ink-muted">
          Add at least one — you can edit this anytime
        </p>
      </div>

      {services.map((service) =>
        editingId === service.id ? (
          <ServiceEditForm
            key={service.id}
            draft={draft}
            onDraftChange={setDraft}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <div
            key={service.id}
            className="flex w-full items-center gap-4 rounded-2xl bg-canvas p-4"
          >
            <div className="flex flex-1 flex-col gap-1">
              <p className="font-sans text-base font-semibold text-ink">{service.title}</p>
              <div className="flex items-center gap-1">
                <Clock className="size-3.5 text-ink-muted" />
                <p className="font-sans text-xs font-medium text-ink-muted">
                  {service.duration} min
                </p>
              </div>
            </div>
            <p className="font-display text-lg font-semibold tracking-tight text-ink">
              €{service.price}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Edit service"
                onClick={() => startEdit(service)}
                className="flex text-ink-muted"
              >
                <Pencil className="size-4.5" />
              </button>
              <button
                type="button"
                aria-label="Remove service"
                onClick={() => handleRemove(service.id)}
                className="flex text-tertiary"
              >
                <Trash2 className="size-4.5" />
              </button>
            </div>
          </div>
        ),
      )}

      {isAddingNew && (
        <ServiceEditForm
          draft={draft}
          onDraftChange={setDraft}
          onSave={handleSave}
          onCancel={handleCancel}
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
  );
}

interface ServiceEditFormProps {
  draft: Service;
  onDraftChange: (draft: Service) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Inline editor for one service. Deliberately not a nested <form> —
 * this renders inside the onboarding step's own page-level form, and
 * HTML doesn't support nested forms.
 */
function ServiceEditForm({ draft, onDraftChange, onSave, onCancel }: ServiceEditFormProps) {
  const isValid = isServiceDraftValid(draft);

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
          disabled={!isValid}
          onClick={onSave}
          icon={<Check className="size-4" />}
        >
          Save service
        </Button>
      </div>
    </div>
  );
}
