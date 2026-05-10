import { CalendarDays, Landmark, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FixedDepositRecord } from '../types/domain'
import {
  createFixedDeposit,
  deleteFixedDeposit,
  updateFixedDeposit,
} from '../services/api'
import { formatMoney } from '../utils/currency'

interface FixedDepositSectionProps {
  fixedDeposits: FixedDepositRecord[]
}

type CompoundFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'

interface FixedDepositFormState {
  bankName: string
  amount: string
  interestRate: string
  startDate: string
  maturityDate: string
  accountNumberLast4: string
  compoundFrequency: CompoundFrequency
}

const defaultFormState: FixedDepositFormState = {
  bankName: '',
  amount: '',
  interestRate: '',
  startDate: '',
  maturityDate: '',
  accountNumberLast4: '',
  compoundFrequency: 'quarterly',
}

function getCompoundsPerYear(frequency: CompoundFrequency) {
  switch (frequency) {
    case 'monthly':
      return 12
    case 'quarterly':
      return 4
    case 'half_yearly':
      return 2
    case 'yearly':
      return 1
    default:
      return 4
  }
}

function calculateFdMaturityAmount({
  amount,
  interestRate,
  startDate,
  maturityDate,
  compoundFrequency,
}: {
  amount: number
  interestRate: number
  startDate: string
  maturityDate: string
  compoundFrequency: CompoundFrequency
}) {
  if (!amount || !interestRate || !startDate || !maturityDate) return amount || 0

  const start = new Date(startDate)
  const end = new Date(maturityDate)
  const milliseconds = end.getTime() - start.getTime()

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || milliseconds <= 0) {
    return amount
  }

  const years = milliseconds / (1000 * 60 * 60 * 24 * 365.25)
  const compoundsPerYear = getCompoundsPerYear(compoundFrequency)
  const rate = interestRate / 100

  return amount * Math.pow(1 + rate / compoundsPerYear, compoundsPerYear * years)
}

function mapRecordToForm(fd: FixedDepositRecord): FixedDepositFormState {
  const frequency = fd.compoundFrequency
  const normalizedFrequency: CompoundFrequency =
    frequency === 'monthly' ||
    frequency === 'quarterly' ||
    frequency === 'half_yearly' ||
    frequency === 'yearly'
      ? frequency
      : 'quarterly'

  return {
    bankName: fd.bankName || '',
    amount: String(fd.amount || ''),
    interestRate: String(fd.interestRate ?? ''),
    startDate: fd.startDate || '',
    maturityDate: fd.maturityDate || '',
    accountNumberLast4: fd.accountNumberLast4 || '',
    compoundFrequency: normalizedFrequency,
  }
}

export function FixedDepositSection({ fixedDeposits }: FixedDepositSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<FixedDepositFormState>(defaultFormState)

  const totalFdValue = useMemo(
    () => fixedDeposits.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [fixedDeposits]
  )

  const maturityPreview = useMemo(() => {
    return calculateFdMaturityAmount({
      amount: Number(form.amount || 0),
      interestRate: Number(form.interestRate || 0),
      startDate: form.startDate,
      maturityDate: form.maturityDate,
      compoundFrequency: form.compoundFrequency,
    })
  }, [form])

  function updateField(field: keyof FixedDepositFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function openCreateDrawer() {
    setEditingId(null)
    setForm(defaultFormState)
    setError(null)
    setIsOpen(true)
  }

  function openEditDrawer(fd: FixedDepositRecord) {
    setEditingId(fd.id)
    setForm(mapRecordToForm(fd))
    setError(null)
    setIsOpen(true)
  }

  function closeDrawer() {
    setIsOpen(false)
    setEditingId(null)
    setError(null)
  }

  async function handleSubmit() {
    if (!form.bankName.trim() || !form.amount.trim()) {
      setError('Bank name and principal amount are required.')
      return
    }

    if (!form.startDate || !form.maturityDate) {
      setError('Start date and end date are required.')
      return
    }

    const principal = Number(form.amount || 0)
    const rate = Number(form.interestRate || 0)
    const maturityAmount = calculateFdMaturityAmount({
      amount: principal,
      interestRate: rate,
      startDate: form.startDate,
      maturityDate: form.maturityDate,
      compoundFrequency: form.compoundFrequency,
    })

    const payload = {
      bankName: form.bankName.trim(),
      amount: principal,
      interestRate: form.interestRate ? rate : null,
      startDate: form.startDate,
      maturityDate: form.maturityDate,
      maturityAmount,
      accountNumberLast4: form.accountNumberLast4.trim() || null,
      compoundFrequency: form.compoundFrequency,
      currency: 'INR' as const,
    }

    setSaving(true)
    setError(null)

    try {
      if (editingId) {
        await updateFixedDeposit(editingId, payload)
      } else {
        await createFixedDeposit(payload)
      }

      setForm(defaultFormState)
      closeDrawer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save fixed deposit.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(fdId: string) {
    const confirmed = window.confirm('Delete this fixed deposit?')
    if (!confirmed) return

    setDeletingId(fdId)
    try {
      await deleteFixedDeposit(fdId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fixed deposit.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <section id="section-fd" className="table-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Fixed deposits</p>
            <h3>Manual FD tracker</h3>
          </div>

          <button type="button" className="primary-btn" onClick={openCreateDrawer}>
            <Plus size={16} /> Add FD
          </button>
        </div>

        {fixedDeposits.length > 0 ? (
          <div className="liability-list">
            {fixedDeposits.map((fd) => (
              <article key={fd.id} className="liability-item fd-item">
                <div>
                  <strong>{fd.bankName}</strong>
                  <p>
                    {fd.startDate || '—'} to {fd.maturityDate || '—'}
                    {fd.accountNumberLast4 ? ` • A/C ${fd.accountNumberLast4}` : ''}
                  </p>
                </div>
                <div className="fd-item-side">
                  <strong>{formatMoney(Number(fd.amount || 0), 'INR')}</strong>
                  <p>
                    {fd.interestRate ? `${fd.interestRate}% • ` : ''}
                    {fd.compoundFrequency
                      ? `${fd.compoundFrequency.replace(/_/g, ' ')} compounding`
                      : 'Compounding not added'}
                  </p>
                  <p>Maturity {formatMoney(Number(fd.maturityAmount || fd.amount || 0), 'INR')}</p>
                  <div className="fd-item-actions">
                    <button type="button" className="ghost-btn" onClick={() => openEditDrawer(fd)}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-btn fd-delete-btn"
                      onClick={() => void handleDelete(fd.id)}
                      disabled={deletingId === fd.id}
                    >
                      <Trash2 size={14} /> {deletingId === fd.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No fixed deposits added yet.</p>
            <p className="muted">Track principal, tenure, compounding, and maturity amount from one place.</p>
          </div>
        )}

        <div className="hero-badges fd-badges">
          <span>{fixedDeposits.length} FD entries</span>
          <span>Principal {formatMoney(totalFdValue, 'INR')}</span>
        </div>
      </section>

      {isOpen ? (
        <>
          <div className="drawer-backdrop" onClick={closeDrawer} aria-hidden="true" />

          <div
            className="fd-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fd-drawer-title"
          >
            <div className="fd-drawer-handle" />

            <div className="section-head">
              <div>
                <p className="eyebrow">{editingId ? 'Edit fixed deposit' : 'Add fixed deposit'}</p>
                <h3 id="fd-drawer-title">{editingId ? 'Update FD entry' : 'Create FD entry'}</h3>
              </div>

              <button type="button" className="icon-btn" onClick={closeDrawer}>
                <X size={18} />
              </button>
            </div>

            <div className="fd-form-grid">
              <label className="search-box">
                <Landmark size={16} />
                <input
                  placeholder="Bank name"
                  value={form.bankName}
                  onChange={(e) => updateField('bankName', e.target.value)}
                />
              </label>

              <label className="search-box">
                <span>₹</span>
                <input
                  type="number"
                  placeholder="Principal amount"
                  value={form.amount}
                  onChange={(e) => updateField('amount', e.target.value)}
                />
              </label>

              <label className="search-box">
                <span>%</span>
                <input
                  type="number"
                  placeholder="Interest rate"
                  value={form.interestRate}
                  onChange={(e) => updateField('interestRate', e.target.value)}
                />
              </label>

              <label className="search-box">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                />
              </label>

              <label className="search-box">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={form.maturityDate}
                  onChange={(e) => updateField('maturityDate', e.target.value)}
                />
              </label>

              <label className="search-box">
                <span>#</span>
                <input
                  placeholder="Account last 4"
                  value={form.accountNumberLast4}
                  onChange={(e) => updateField('accountNumberLast4', e.target.value)}
                />
              </label>

              <label className="search-box fd-select-box">
                <span>↻</span>
                <select
                  value={form.compoundFrequency}
                  onChange={(e) => updateField('compoundFrequency', e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>
            </div>

            <div className="hero-panel fd-preview-card">
              <p className="eyebrow">Maturity estimate</p>
              <h3>{formatMoney(maturityPreview, 'INR')}</h3>
              <p className="hero-copy">
                Based on principal, annual rate, tenure between start and end date, and {form.compoundFrequency.replace(/_/g, ' ')} compounding.
              </p>
            </div>

            {error ? <p className="fd-error-text">{error}</p> : null}

            <div className="fd-drawer-actions">
              <button type="button" className="ghost-btn" onClick={closeDrawer} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={() => void handleSubmit()} disabled={saving}>
                {saving ? <><Loader2 size={16} className="spin" /> Saving...</> : editingId ? 'Update FD' : 'Save FD'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}