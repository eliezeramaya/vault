import React from 'react'

type Props = { path: string[]; onBack: () => void }

export default function ZoomBreadcrumbs({ path, onBack }: Props) {
  return (
    <div className="glass-1 px-3 py-2 rounded-2xl flex items-center gap-2 text-sm">
      <button
        className="px-2 py-1 rounded-lg border border-white/10"
        onClick={onBack}
        aria-label="Volver a vista global"
      >
        ←
      </button>
      <div aria-label="Ruta de zoom" className="opacity-90">
        {['Eisenhower', ...path].join(' / ')}
      </div>
    </div>
  )
}
