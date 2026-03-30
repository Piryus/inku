import type { OpenTab } from '../../stores/editor'

interface Props {
  tab: OpenTab
  active: boolean
  onSelect: () => void
  onClose: () => void
}

export function Tab({ tab, active, onSelect, onClose }: Props) {
  return (
    <div
      className={`tab ${active ? 'active' : ''}`}
      onClick={onSelect}
    >
      {tab.dirty && <span className="tab-dirty" />}
      <span>{tab.fileName}</span>
      <span
        className="tab-close"
        onClick={e => {
          e.stopPropagation()
          onClose()
        }}
      >
        &#x2715;
      </span>
    </div>
  )
}
