import { useEditorStore } from '../../stores/editor'
import { Tab } from './Tab'
import './tabs.css'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore()

  if (tabs.length === 0) return null

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <Tab
          key={tab.id}
          tab={tab}
          active={tab.id === activeTabId}
          onSelect={() => setActiveTab(tab.id)}
          onClose={() => closeTab(tab.id)}
        />
      ))}
    </div>
  )
}
