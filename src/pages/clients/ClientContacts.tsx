import { useState, type FormEvent } from 'react';
import { useProfile } from '../../app/auth/authContext';
import { useContactMutations } from '../../shared/api/clientContacts';
import type { ClientContact } from '../../shared/api/types';
import { useConfirm } from '../../shared/ui/confirmContext';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Field } from '../../shared/ui/Field';
import { useToast } from '../../shared/ui/toastContext';

type ContactValues = {
  name: string;
  role: string;
  phone: string;
  email: string;
  telegram: string;
  notes: string;
  is_primary: boolean;
};

const EMPTY: ContactValues = {
  name: '',
  role: '',
  phone: '',
  email: '',
  telegram: '',
  notes: '',
  is_primary: false,
};

function toValues(c: ClientContact): ContactValues {
  return {
    name: c.name,
    role: c.role ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    telegram: c.telegram ?? '',
    notes: c.notes ?? '',
    is_primary: c.is_primary,
  };
}

function ContactForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: ContactValues;
  busy: boolean;
  onSubmit: (values: ContactValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);
  const set = <K extends keyof ContactValues>(key: K, value: ContactValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) return;
    onSubmit({
      ...values,
      name: values.name.trim(),
      role: values.role.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      telegram: values.telegram.trim().replace(/^@/, ''),
      notes: values.notes.trim(),
    });
  };
  return (
    <form className="card form" onSubmit={submit}>
      <div className="form-row">
        <Field label="Имя">
          <input
            className="input"
            required
            autoFocus
            maxLength={120}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field label="Роль" hint="Например: директор, техподдержка, бухгалтер.">
          <input
            className="input"
            maxLength={80}
            value={values.role}
            onChange={(e) => set('role', e.target.value)}
          />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Телефон">
          <input
            className="input"
            type="tel"
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            className="input"
            type="email"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
        <Field label="Telegram" hint="без @">
          <input
            className="input"
            value={values.telegram}
            onChange={(e) => set('telegram', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Заметка">
        <input
          className="input"
          maxLength={300}
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </Field>
      <label className="switch">
        <input
          type="checkbox"
          checked={values.is_primary}
          onChange={(e) => set('is_primary', e.target.checked)}
        />
        <span className="switch-track" />
        Основной контакт
      </label>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Сохранить
        </button>
      </div>
    </form>
  );
}

/** Контакты клиента: основной первым, правка на месте, «основной» ровно один. */
export function ClientContacts({
  clientId,
  contacts,
}: {
  clientId: string;
  contacts: ClientContact[];
}) {
  const me = useProfile();
  const toast = useToast();
  const confirm = useConfirm();
  const { add, update, remove } = useContactMutations();
  const [editing, setEditing] = useState<'new' | string | null>(null);

  const sorted = [...contacts].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.created_at.localeCompare(b.created_at),
  );
  const busy = add.isPending || update.isPending || remove.isPending;

  // Основной один: перед тем как назначить нового, снимаем флаг со старого.
  const demoteOthers = async (exceptId: string | null) => {
    for (const c of contacts) {
      if (c.is_primary && c.id !== exceptId)
        await update.mutateAsync({ id: c.id, patch: { is_primary: false } });
    }
  };

  const toPatch = (v: ContactValues) => ({
    name: v.name,
    role: v.role || null,
    phone: v.phone || null,
    email: v.email || null,
    telegram: v.telegram || null,
    notes: v.notes || null,
    is_primary: v.is_primary,
  });

  const create = async (v: ContactValues) => {
    try {
      if (v.is_primary) await demoteOthers(null);
      await add.mutateAsync({ ...toPatch(v), client_id: clientId, created_by: me.id });
      setEditing(null);
    } catch (err) {
      toast.error(err);
    }
  };

  const save = async (id: string, v: ContactValues) => {
    try {
      if (v.is_primary) await demoteOthers(id);
      await update.mutateAsync({ id, patch: toPatch(v) });
      setEditing(null);
    } catch (err) {
      toast.error(err);
    }
  };

  const del = async (c: ClientContact) => {
    const ok = await confirm({ title: `Удалить контакт «${c.name}»?` });
    if (!ok) return;
    remove.mutate(c.id, { onError: (err) => toast.error(err) });
  };

  return (
    <section className="stack">
      <div className="row">
        <h2>Контакты ({sorted.length})</h2>
        {editing === null ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setEditing('new')}
          >
            Добавить контакт
          </button>
        ) : null}
      </div>
      {sorted.length === 0 && editing !== 'new' ? (
        <EmptyState inline>Контактов пока нет: с кем говорить по этому клиенту?</EmptyState>
      ) : null}
      {sorted.map((c) =>
        editing === c.id ? (
          <ContactForm
            key={c.id}
            initial={toValues(c)}
            busy={busy}
            onSubmit={(v) => void save(c.id, v)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={c.id} className="card stack contact">
            <div className="row">
              <strong>{c.name}</strong>
              {c.is_primary ? <span className="badge badge-accent">основной</span> : null}
              {c.role ? <span className="muted">{c.role}</span> : null}
              <span className="row" style={{ marginLeft: 'auto', gap: 0 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditing(c.id)}
                >
                  Изменить
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void del(c)}
                  disabled={busy}
                >
                  Удалить
                </button>
              </span>
            </div>
            {c.phone || c.email || c.telegram ? (
              <div className="row small">
                {c.phone ? (
                  <a className="link" href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}>
                    {c.phone}
                  </a>
                ) : null}
                {c.email ? (
                  <a className="link" href={`mailto:${c.email}`}>
                    {c.email}
                  </a>
                ) : null}
                {c.telegram ? (
                  <a
                    className="link"
                    href={`https://t.me/${c.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @{c.telegram}
                  </a>
                ) : null}
              </div>
            ) : null}
            {c.notes ? <p className="small muted">{c.notes}</p> : null}
          </div>
        ),
      )}
      {editing === 'new' ? (
        <ContactForm
          initial={{ ...EMPTY, is_primary: contacts.length === 0 }}
          busy={busy}
          onSubmit={(v) => void create(v)}
          onCancel={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}
