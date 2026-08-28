import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSend } from '@intenteffect/react'
import { addText, textAdded, TEXT_KINDS } from '@interlinear/shared'
import { getAdminToken, setAdminToken } from '../admin.js'
import { site } from '../site.js'

/** Per-site example text in the form's placeholders and defaults. */
const EXAMPLES =
  site.id === 'sutta'
    ? {
        title: 'The Discourse on Mindfulness',
        origTitle: 'Satipaṭṭhāna Sutta',
        source: 'Majjhima Nikāya 10',
        lang: 'Pali',
        kind: 'sutta',
        text: 'Karaṇīyamatthakusalena,\nyantaṃ santaṃ padaṃ abhisamecca…',
      }
    : {
        title: 'Sweet Porridge',
        origTitle: 'Der süße Brei',
        source: 'Brüder Grimm — KHM 103',
        lang: 'German',
        kind: 'prose',
        text: 'Es war einmal ein armes frommes Mädchen…',
      }

export function AddTextForm() {
  const send = useSend()
  const navigate = useNavigate()
  const [passphrase, setPassphrase] = useState(getAdminToken() ?? '')
  const [title, setTitle] = useState('')
  const [origTitle, setOrigTitle] = useState('')
  const [source, setSource] = useState('')
  const [lang, setLang] = useState(site.id === 'sutta' ? 'Pali' : '')
  const [kind, setKind] = useState(EXAMPLES.kind)
  const [original, setOriginal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setAdminToken(passphrase.trim())
    const result = await send(addText, {
      title,
      origTitle: origTitle || undefined,
      source: source || undefined,
      lang,
      kind,
      original,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    const added = result.value.events.find((evt) => evt.type === textAdded.type)
    const parsed = added ? textAdded.data.safeParse(added.data) : null
    if (parsed?.success) {
      navigate(`/text/${parsed.data.slug}`)
    }
  }

  return (
    <form className="add-form" onSubmit={(e) => void onSubmit(e)}>
      <h2 className="add-form__heading">
        {site.id === 'sutta' ? 'Add a sutta' : 'Add a text'}
      </h2>

      <div className="add-form__row">
        <label>
          Title
          <input
            type="text"
            required
            value={title}
            placeholder={EXAMPLES.title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Original title
          <input
            type="text"
            value={origTitle}
            placeholder={EXAMPLES.origTitle}
            onChange={(e) => setOrigTitle(e.target.value)}
          />
        </label>
      </div>

      <div className="add-form__row">
        <label>
          Source
          <input
            type="text"
            value={source}
            placeholder={EXAMPLES.source}
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        <label>
          Language
          <input
            type="text"
            required
            value={lang}
            placeholder={EXAMPLES.lang}
            onChange={(e) => setLang(e.target.value)}
          />
        </label>
        <label>
          Type of text
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {TEXT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Owner passphrase
          <input
            type="password"
            autoComplete="off"
            value={passphrase}
            placeholder="required to add texts"
            onChange={(e) => setPassphrase(e.target.value)}
          />
        </label>
      </div>

      <label>
        Text (blank lines separate stanzas/paragraphs)
        <textarea
          required
          rows={8}
          value={original}
          placeholder={EXAMPLES.text}
          onChange={(e) => setOriginal(e.target.value)}
        />
      </label>

      {error && (
        <p className="add-form__error" role="alert">
          ⚠ {error}
        </p>
      )}

      <button className="btn btn_transparent" type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add & gloss'}
      </button>
    </form>
  )
}
