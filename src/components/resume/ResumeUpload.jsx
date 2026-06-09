import { useCallback, useState } from 'react'
import { FileText, Loader2, Upload } from 'lucide-react'
import Card from '../ui/Card'
import Alert from '../ui/Alert'
import ResumeTextPreview from './ResumeTextPreview'
import { useProfile } from '../../context/ProfileContext'
import { extractTextFromPdf } from '../../utils/resumeParser'
import { importLinkedInProfile } from '../../modules/profile/linkedinImport'

export default function ResumeUpload() {
  const { profile, updateProfile, applyResumeExtraction } = useProfile()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [importMode, setImportMode] = useState('resume')

  const processFile = useCallback(async (file, mode = importMode) => {
    setError(null)
    setLoading(true)
    try {
      const rawText = await extractTextFromPdf(file)
      if (mode === 'linkedin') {
        const mapped = await importLinkedInProfile(rawText)
        updateProfile((prev) => ({
          ...prev,
          basicProfile: { ...prev.basicProfile, ...mapped.basicProfile },
          resume: {
            ...prev.resume,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            rawText: mapped.rawText || rawText,
            parsedData: { ...prev.resume.parsedData, ...mapped.parsedData },
            importSource: 'linkedin_pdf',
          },
        }))
        if (!mapped.isLinkedInExport) {
          applyResumeExtraction(rawText)
        }
      } else {
        updateProfile((prev) => ({
          ...prev,
          resume: {
            ...prev.resume,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            rawText,
            importSource: 'resume_pdf',
          },
        }))
        applyResumeExtraction(rawText)
      }
    } catch (err) {
      setError(err.message || 'Failed to parse PDF.')
    } finally {
      setLoading(false)
    }
  }, [updateProfile, applyResumeExtraction, importMode])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <Card
      title="Upload your resume"
      description="PDF only, up to 10 MB. Supports standard resumes and LinkedIn profile PDF exports."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setImportMode('resume')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${importMode === 'resume' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}`}
        >
          Resume PDF
        </button>
        <button
          type="button"
          onClick={() => setImportMode('linkedin')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${importMode === 'linkedin' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}`}
        >
          LinkedIn PDF export
        </button>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${dragOver ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/10' : 'border-stone-300 dark:border-stone-700'}`}
      >
        {loading ? (
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        ) : (
          <Upload className="h-10 w-10 text-stone-400" />
        )}
        <p className="mt-4 text-sm font-medium text-stone-700 dark:text-stone-300">
          {loading ? 'Extracting text from PDF...' : `Drag & drop your ${importMode === 'linkedin' ? 'LinkedIn profile' : 'resume'} PDF here`}
        </p>
        <p className="mt-1 text-xs text-stone-500">or</p>
        <label className="mt-3 cursor-pointer">
          <span className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">Browse files</span>
          <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={onFileChange} disabled={loading} />
        </label>
      </div>

      {error && <div className="mt-4"><Alert variant="error" title="Upload failed">{error}</Alert></div>}

      {profile.resume?.fileName && !error && (
        <div className="mt-4">
          <Alert variant="success" title="Resume uploaded">
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {profile.resume.fileName} — {profile.resume.rawText?.length?.toLocaleString()} characters extracted
            </span>
          </Alert>
          <ResumeTextPreview text={profile.resume.rawText} />
        </div>
      )}
    </Card>
  )
}