import { useSearchStore } from '../../stores/search'

export function SearchBar() {
  const { query, searchFiles } = useSearchStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchFiles(e.target.value)
  }

  return (
    <div className="search-bar">
      <div className="search-bar-inner">
        <span className="search-bar-icon">⌕</span>
        <input
          className="search-bar-input"
          type="text"
          placeholder="Search files..."
          value={query}
          onChange={handleChange}
        />
        <span className="search-bar-hint">⌘P</span>
      </div>
    </div>
  )
}
