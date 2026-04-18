import { useState } from 'react'
import { Download, Loader2, Send } from 'lucide-react'
import { Button } from '../Button'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'
import { downloadResultPdf, sendResultToParent } from '../../services/resultsService'

/**
 * Download PDF + send to parent (email + WhatsApp link).
 */
export function ResultActions({ studentId, examType, compact = false }) {
  const [downloading, setDownloading] = useState(false)
  const [sending, setSending] = useState(false)

  const onPdf = async () => {
    if (!studentId || !examType) return
    setDownloading(true)
    try {
      await downloadResultPdf(studentId, examType)
      notify.success('PDF downloaded.')
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not download PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const onSend = async () => {
    if (!studentId || !examType) return
    setSending(true)
    try {
      const r = await sendResultToParent(studentId, examType)
      if (r.email_sent) {
        notify.success('Report emailed to parent.')
      } else if (r.parent_email) {
        notify.info('Email could not be sent. Check server mail settings.')
      } else {
        notify.info('No parent email on file.')
      }
      if (r.whatsapp_url) {
        window.open(r.whatsapp_url, '_blank', 'noopener,noreferrer')
      } else if (!r.parent_email && !r.whatsapp_url) {
        notify.info('Add parent email or phone for sharing.')
      }
    } catch (e) {
      notify.error(formatApiError(e) || 'Send failed.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'sm:gap-3'}`}>
      <Button type="button" variant="secondary" size="sm" disabled={downloading} onClick={onPdf}>
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}
        PDF
      </Button>
      <Button type="button" variant="primary" size="sm" disabled={sending} onClick={onSend}>
        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
        Send to parent
      </Button>
    </div>
  )
}
