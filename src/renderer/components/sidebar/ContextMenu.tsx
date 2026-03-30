import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  action: () => void
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  return (
    <>
      <div className="context-menu-overlay" onMouseDown={onClose} />
      <div
        ref={menuRef}
        className="context-menu"
        style={{ top: y, left: x }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            className={`context-menu-item${item.danger ? ' danger' : ''}`}
            onClick={() => {
              item.action()
              onClose()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}
