'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#0a0a0a',
            color: '#fafafa',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              fontSize: '28px',
            }}
          >
            ⚠️
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            Critical Error
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#a1a1aa',
              maxWidth: '400px',
              lineHeight: 1.6,
              marginBottom: '8px',
            }}
          >
            A critical error occurred and the application cannot render.
            This may be caused by a layout or configuration issue.
          </p>
          {error?.message && (
            <p
              style={{
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#71717a',
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '8px 16px',
                borderRadius: '8px',
                marginBottom: '8px',
                wordBreak: 'break-all',
                maxWidth: '400px',
              }}
            >
              {error.message}
            </p>
          )}
          {error?.digest && (
            <p style={{ fontSize: '12px', color: '#52525b', marginBottom: '24px' }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: '#a1a1aa',
                border: '1px solid #3f3f46',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
