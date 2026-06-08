import Badge from './Badge'
import { useProfile } from '../../context/ProfileContext'

const LABELS = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' }

export default function ConfidenceTag({ fieldKey, confidence }) {
  const { profile } = useProfile()
  if (profile._editedFields?.[fieldKey]) return null
  if (!confidence || confidence === 'low' && !profile.basicProfile?.[fieldKey]) return null
  return <Badge variant={confidence}>{LABELS[confidence] || confidence}</Badge>
}