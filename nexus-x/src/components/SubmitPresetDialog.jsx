import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  buildSubmittablePreset,
  buildMailtoUrl,
  estimateMailtoSize,
  MAILTO_SAFE_LIMIT,
} from '../utils/submittablePreset';

export default function SubmitPresetDialog({ node, isOpen, onClose }) {
  const [submitterName, setSubmitterName] = useState('');
  const [note, setNote] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubmitterName('');
      setNote('');
      setShowJson(false);
      setCopied(false);
    }
  }, [isOpen]);

  const preset = useMemo(() => (node ? buildSubmittablePreset(node) : null), [node]);
  const json = useMemo(() => (preset ? JSON.stringify(preset, null, 2) : ''), [preset]);
  const mailtoSize = useMemo(
    () => (preset ? estimateMailtoSize({ preset, submitterName, note }) : 0),
    [preset, submitterName, note]
  );
  const willLikelyTruncate = mailtoSize > MAILTO_SAFE_LIMIT;

  if (!isOpen || !preset) return null;

  const handleEmail = () => {
    const url = buildMailtoUrl({ preset, submitterName, note });
    window.location.href = url;
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback: select the textarea so the user can Cmd+C manually
      const ta = document.getElementById('submit-preset-json');
      if (ta) {
        ta.focus();
        ta.select();
      }
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111', border: '1px solid #2e2e2a', borderRadius: 6,
          width: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          fontFamily: "'Space Grotesk', sans-serif",
          color: '#e0e0e0',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid #2e2e2a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: 1 }}>
              Submit Preset for Review
            </div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
              {preset.label}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: '#888',
              fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 4,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

          <Field label="Your name (optional)">
            <input
              type="text"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="anonymous"
              style={inputStyle}
            />
          </Field>

          <Field label="Note (why is this useful?)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Used for ___ rigs, common in ___ events..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
            />
          </Field>

          {/* JSON preview (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowJson(s => !s)}
              style={{
                background: 'transparent', border: 'none',
                color: '#888', fontSize: 10, letterSpacing: 1,
                textTransform: 'uppercase', cursor: 'pointer', padding: 0,
              }}
            >
              {showJson ? '▾' : '▸'} preset JSON ({json.length} chars)
            </button>
            {showJson && (
              <textarea
                id="submit-preset-json"
                readOnly
                value={json}
                rows={10}
                style={{
                  ...inputStyle,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  marginTop: 6,
                  resize: 'vertical',
                  minHeight: 160,
                  whiteSpace: 'pre',
                }}
                onClick={(e) => e.target.select()}
              />
            )}
          </div>

          {/* Truncation warning */}
          {willLikelyTruncate && (
            <div style={{
              padding: '8px 10px',
              background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.30)',
              borderRadius: 4,
              fontSize: 10, color: '#fbbf24',
              lineHeight: 1.5,
            }}>
              <strong>Heads up:</strong> the JSON is {mailtoSize} characters,
              which some email clients truncate around {MAILTO_SAFE_LIMIT}.
              If your draft looks short, click <em>Copy JSON</em> below and paste
              it into the email body manually before sending.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: 14, borderTop: '1px solid #2e2e2a',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button onClick={handleCopyJson} style={btnSecondary}>
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={handleEmail} style={btnPrimary}>Open Email</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontSize: 9, color: '#888',
        textTransform: 'uppercase', letterSpacing: 1,
      }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  background: '#0a0a0a',
  border: '1px solid #2e2e2a',
  color: '#e0e0e0',
  padding: '6px 8px',
  fontSize: 12,
  fontFamily: "'Space Grotesk', sans-serif",
  outline: 'none',
  borderRadius: 3,
  width: '100%',
  boxSizing: 'border-box',
};

const btnPrimary = {
  background: '#22d3ee',
  color: '#0a0a0a',
  border: 'none',
  padding: '6px 14px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1,
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: "'Space Grotesk', sans-serif",
  borderRadius: 3,
};

const btnSecondary = {
  background: 'transparent',
  color: '#bbb',
  border: '1px solid #2e2e2a',
  padding: '6px 14px',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: 1,
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: "'Space Grotesk', sans-serif",
  borderRadius: 3,
};
