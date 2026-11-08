import { useState } from 'preact/hooks';
import type { ScanResult } from '../core/scan';
import { domXml } from '../lib/domXml';

type Props = { mode?: 'convert' | 'export' };

interface Loaded {
  name: string;
  bytes: Uint8Array;
  scan: Extract<ScanResult, { ok: true }>;
}

const ERRORS: Record<string, string> = {
  doc: 'Das ist eine alte .doc-Datei. Speichern Sie sie in Word über „Speichern unter“ als .docx und laden Sie diese Datei.',
  odt: 'Das ist eine .odt-Datei. Speichern Sie sie in LibreOffice als Word-Dokument (.docx) und laden Sie diese Datei.',
  'not-docx': 'Diese Datei ist kein Word-Dokument im .docx-Format.',
  'no-document': 'Diese Datei ist ein Archiv, aber kein Word-Dokument: word/document.xml fehlt.',
};

function download(name: string, data: Uint8Array | string, type: string) {
  const blob = new Blob([data as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const pad = (n: number) => String(n).padStart(3, '0');

function firstAuthor(entries: any[]): { author: string; year: string; title: string; page: string } {
  const e = entries[0];
  const ref = e?.Reference ?? {};
  const a = ref.Authors?.[0] ?? ref.Editors?.[0];
  const org = ref.Organizations?.[0];
  const author = a ? [a.LastName, a.FirstName].filter(Boolean).join(', ') : (org?.Name ?? '');
  const page = e?.PageRange;
  return {
    author: entries.length > 1 ? `${author} u. a.` : author,
    year: String(ref.Year ?? '').slice(0, 4),
    title: [ref.Title, ref.Subtitle].filter(Boolean).join(': '),
    page: typeof page === 'string' ? page : (page?.OriginalString ?? ''),
  };
}

export default function Converter({ mode = 'convert' }: Props) {
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [prefix, setPrefix] = useState('');

  async function onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setError('');
    setState(null);
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { scanDocx } = await import('../core/scan');
      const scan = scanDocx(bytes, domXml, file.name);
      if (!scan.ok) {
        setError(ERRORS[scan.error]);
      } else if (scan.counts.total === 0) {
        setError(
          scan.counts.textPlaceholders > 0
            ? `In dieser Datei stehen ${scan.counts.textPlaceholders} Citavi-Textplatzhalter wie „{Miller 2009 #84}“, aber keine Citavi-Felder. Diese Form wird noch nicht unterstützt.`
            : 'In dieser Datei wurden keine Citavi-Nachweise gefunden. Es werden nur Nachweise erkannt, die mit dem Citavi-Word-Add-in eingefügt wurden.',
        );
      } else {
        setState({ name: file.name, bytes, scan });
      }
    } catch {
      setError('Die Datei konnte nicht gelesen werden. Ist sie beschädigt oder mit Passwort geschützt?');
    }
    setBusy(false);
    input.value = '';
  }

  async function testCopy() {
    if (!state) return;
    const { convertDocx } = await import('../core/convert');
    const r = convertDocx(state.bytes, domXml, { mode: 'test', standardPrefix: prefix.trim() || undefined });
    if (!r.ok) return setError(ERRORS[r.error] ?? 'Umwandlung nicht möglich.');
    download(
      state.name.replace(/\.docx$/i, '') + '_zotero-test.docx',
      r.bytes,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  }

  async function exportRefs(kind: 'ris' | 'json') {
    if (!state) return;
    const { uniqueItems, toRis, toCslJson } = await import('../core/export');
    const items = uniqueItems(state.scan.citations.filter((c) => c.readable).map((c) => c.entries));
    const base = state.name.replace(/\.docx$/i, '');
    if (kind === 'ris') download(base + '_literatur.ris', toRis(items), 'application/x-research-info-systems');
    else download(base + '_literatur.json', toCslJson(items), 'application/json');
  }

  const c = state?.scan.counts;
  const rows = state?.scan.citations.filter((x) => x.readable).slice(0, 10) ?? [];
  const unreadable = state?.scan.citations.filter((x) => !x.readable) ?? [];

  return (
    <div class="converter">
      <label class="dropzone" htmlFor="docx-input">
        <span class="label">Datei hier ablegen</span>
        <span>oder Word-Datei (.docx) auswählen</span>
        <input id="docx-input" type="file" accept=".docx" onChange={onFile} />
      </label>

      <div aria-live="polite">
        {busy && <p>Datei wird gelesen …</p>}
        {error && (
          <div class="notice notice--error" role="alert">
            <span class="label">Fehler</span> {error}
          </div>
        )}
      </div>

      {state && c && (
        <section class="result" aria-label="Ergebnis des Scans">
          <div class="tag tag--swing">
            <svg class="tag__string" viewBox="0 0 40 200" preserveAspectRatio="none" aria-hidden="true">
              <path d="M30 100 C 12 92, 4 70, 10 40 S 22 8, 6 0" fill="none" stroke="#221f1c" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span class="tag__hole" aria-hidden="true"></span>
            <span class="label">Gefunden</span>
            <span class="tag__big num">{c.total}</span>
            <span class="tag__detail">
              Nachweise, davon {c.readable} lesbar und {c.withLocator} mit Seitenzahl
            </span>
          </div>

          <div class="ledger-wrap">
            <table class="ledger">
              <caption>Was in „{state.name}“ steht</caption>
              <tbody>
                <tr><th scope="row">Nachweise im Text</th><td class="num">{c.body}</td></tr>
                <tr><th scope="row">in Fußnoten</th><td class="num">{c.footnotes}</td></tr>
                <tr><th scope="row">in Endnoten</th><td class="num">{c.endnotes}</td></tr>
                <tr><th scope="row">verschiedene Quellen</th><td class="num">{c.uniqueReferences}</td></tr>
                <tr><th scope="row">nicht lesbar</th><td class="num">{c.unreadable}</td></tr>
                <tr><th scope="row">Citavi-Literaturverzeichnis</th><td>{c.bibliography ? 'ja' : 'nein'}</td></tr>
                <tr>
                  <th scope="row">andere Zitierfelder (bleiben unverändert)</th>
                  <td class="num">{c.otherFields.zotero + c.otherFields.endnote + c.otherFields.word}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {c.textPlaceholders > 0 && (
            <div class="notice">
              <span class="label">Hinweis</span> {c.textPlaceholders} Citavi-Textplatzhalter wie „{'{Miller 2009 #84}'}“ werden noch nicht umgewandelt.
            </div>
          )}

          {mode === 'convert' && (
            <div class="actions">
              <label class="field">
                <span class="label">Standard-Präfix (z. B. Vgl.), optional</span>
                <input type="text" value={prefix} onInput={(e) => setPrefix((e.target as HTMLInputElement).value)} />
              </label>
              <button type="button" class="button button--primary" onClick={testCopy} disabled={c.readable === 0}>
                Testkopie herunterladen ({Math.min(10, c.readable)} Nachweise)
              </button>
              <div class="notice">
                <span class="label">Hinweis</span> Die Testkopie wandelt die ersten {Math.min(10, c.readable)} Nachweise um. Die
                vollständige Umwandlung (Umzugspass) ist noch nicht freigeschaltet. Arbeiten Sie immer an einer Kopie und
                behalten Sie Ihr Original.
              </div>
            </div>
          )}

          <div class="actions">
            <p class="label">Literaturliste exportieren (kostenlos)</p>
            <button type="button" class="button" onClick={() => exportRefs('ris')}>RIS herunterladen</button>{' '}
            <button type="button" class="button" onClick={() => exportRefs('json')}>CSL-JSON herunterladen</button>
          </div>

          <div class="ledger-wrap">
            <table class="ledger">
              <caption>Die ersten {rows.length} Nachweise</caption>
              <thead>
                <tr>
                  <th scope="col">Nr.</th><th scope="col">Text im Dokument</th><th scope="col">Autor</th>
                  <th scope="col">Jahr</th><th scope="col">Titel</th><th scope="col">Seite</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const f = firstAuthor(r.entries);
                  return (
                    <tr key={r.index}>
                      <td class="ledger-nr">{pad(i + 1)}</td>
                      <td>{r.visibleText}</td><td>{f.author}</td><td class="num">{f.year}</td><td>{f.title}</td><td>{f.page}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {unreadable.length > 0 && (
            <div class="ledger-wrap">
              <table class="ledger">
                <caption>Nicht lesbare Nachweise (bleiben unverändert)</caption>
                <thead><tr><th scope="col">Nr.</th><th scope="col">Text im Dokument</th><th scope="col">Grund</th></tr></thead>
                <tbody>
                  {unreadable.map((r, i) => (
                    <tr key={r.index}><td class="ledger-nr">{pad(i + 1)}</td><td>{r.visibleText}</td><td>{r.reason}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
