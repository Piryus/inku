export function App() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--color-bg-primary)',
    }}>
      <div style={{
        width: 260,
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)',
        padding: 12,
      }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Inku
        </div>
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
      }}>
        Open a folder to get started
      </div>
    </div>
  )
}
