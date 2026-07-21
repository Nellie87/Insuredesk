import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import {
  downloadClientImportTemplate,
  parseClientSpreadsheet,
} from '../utils/clientImport'
import { toast } from '../store/toastStore'

export default function ImportClientsPage() {
  const navigate = useNavigate()
  const { importClientsBatch } = useClients()
  const fileInputRef = useRef(null)

  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const handleFileChange = async event => {
    const file = event.target.files?.[0]
    setParseError(null)
    setImportResult(null)
    setPreview(null)

    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
      setParseError('Choose an Excel file (.xlsx, .xls) or CSV.')
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseClientSpreadsheet(buffer)
      setFileName(file.name)
      setPreview(parsed)
    } catch (err) {
      setParseError(err.message || 'Could not read that file.')
    } finally {
      event.target.value = ''
    }
  }

  const handleImport = async () => {
    if (!preview) return

    const validRows = preview.rows.filter(row => row.valid).map(row => row.data)
    if (validRows.length === 0) {
      setParseError('Fix the highlighted rows before importing.')
      return
    }

    setImporting(true)
    setParseError(null)

    try {
      const result = await importClientsBatch(validRows)
      setImportResult(result)

      if (result.failures.length === 0) {
        toast(
          `Imported ${result.imported.length} client${result.imported.length === 1 ? '' : 's'}.`,
        )
        navigate('/clients', { replace: true })
      } else {
        toast(
          `Imported ${result.imported.length}, ${result.failures.length} failed.`,
          'error',
        )
      }
    } catch (err) {
      const message = err.message || 'Import failed. Try again.'
      setParseError(message)
      toast(message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4 p-4 pb-8">
      <div>
        <Link
          to="/clients"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-primary-700 shadow-sm"
        >
          ← Back to portfolio
        </Link>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-700">
          Bulk upload
        </p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">
          Import from Excel
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload the agent&apos;s Preliminary renewals sheet. Each row becomes
          one client. Vehicle plate / make / insurer can be filled in later if
          the sheet does not include them.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-primary-800 px-4 py-2 text-sm font-bold text-white"
          >
            Choose file
          </button>
          <button
            type="button"
            onClick={downloadClientImportTemplate}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Download template
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {fileName && (
          <p className="text-xs text-slate-500">
            Selected:{' '}
            <span className="font-semibold text-slate-700">{fileName}</span>
          </p>
        )}
      </div>

      {parseError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {parseError}
        </div>
      )}

      {importResult?.failures?.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p>
            Imported {importResult.imported.length} client
            {importResult.imported.length === 1 ? '' : 's'}.{' '}
            {importResult.failures.length} row
            {importResult.failures.length === 1 ? '' : 's'} failed.
          </p>
          {importResult.failures.slice(0, 5).map((item, index) => (
            <p key={index} className="text-xs">
              {item.name}: {item.message}
            </p>
          ))}
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900">
                {preview.validCount}
              </span>{' '}
              ready,{' '}
              <span className="font-bold text-slate-900">
                {preview.invalidCount}
              </span>{' '}
              need fixes
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || preview.validCount === 0}
              className="rounded-xl bg-primary-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${preview.validCount}`}
            </button>
          </div>

          <div className="space-y-2.5">
            {preview.rows.map(row => (
              <div
                key={row.rowNumber}
                className={`rounded-2xl border p-3.5 text-sm shadow-card ${
                  row.valid
                    ? 'border-slate-200 bg-white'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words font-bold text-slate-900">
                      Row {row.rowNumber}:{' '}
                      {row.data.client.name || 'Unnamed client'}
                    </div>
                    <div className="mt-0.5 break-words text-xs text-slate-500">
                      {row.data.client.phone || 'No phone'} ·{' '}
                      {row.data.vehicle.registration || 'No plate'}
                      {row.data.vehicle.premium != null &&
                      row.data.vehicle.premium !== ''
                        ? ` · KSh ${Number(row.data.vehicle.premium).toLocaleString()}`
                        : ''}
                      {row.data.schedule?.installment_count
                        ? ` · ${row.data.schedule.installment_count} payments`
                        : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs font-semibold text-slate-500">
                    {row.valid ? 'Ready' : 'Needs fixes'}
                  </div>
                </div>
                {!row.valid && (
                  <ul className="mt-2 list-inside list-disc text-xs text-red-700">
                    {row.errors.map(error => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
