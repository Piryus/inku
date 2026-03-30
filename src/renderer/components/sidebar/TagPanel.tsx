import { useTagsStore } from '../../stores/tags'

export function TagPanel() {
  const tags = useTagsStore(s => s.tags)
  const activeTag = useTagsStore(s => s.activeTag)
  const filterByTag = useTagsStore(s => s.filterByTag)

  if (tags.length === 0) {
    return null
  }

  const handleTagClick = (tagName: string) => {
    filterByTag(activeTag === tagName ? null : tagName)
  }

  return (
    <div className="tag-panel">
      <div className="tag-panel-label">Tags</div>
      <div className="tag-panel-pills">
        {tags.map(tag => (
          <button
            key={tag.name}
            className={`tag-pill${activeTag === tag.name ? ' active' : ''}`}
            onClick={() => handleTagClick(tag.name)}
            title={`${tag.count} file${tag.count !== 1 ? 's' : ''}`}
          >
            <span>{tag.name}</span>
            <span className="tag-pill-count">{tag.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
