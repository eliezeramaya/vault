import React, { useCallback, useMemo } from 'react'
import { Home, LayoutGrid, Globe2, Settings } from 'lucide-react'
import { useSwipeNavigation, useMobileButton } from '../hooks/useTouchGestures'

/*
  Persistent navigation rail / bottom bar
  - Desktop: left rail
  - Mobile: bottom bar
  Accessibility:
  - role="navigation" with aria-label
  - Each button uses aria-current when selected
*/
function NavButton({ active, label, Icon, onPress, variant='rail' }){
  const mobileButton = useMobileButton({ onPress, hapticFeedback: true, rippleEffect: true });
  const common = {
    ref: mobileButton.ref,
    onClick: mobileButton.handleClick,
    onTouchStart: mobileButton.handleTouchStart,
    onTouchEnd: mobileButton.handleTouchEnd,
    'aria-current': active ? 'page' : undefined,
    title: label,
    className: 'touch-feedback',
  };
  if (variant === 'rail') {
    return (
      <button type="button" {...common}
        style={{
          display:'grid', placeItems:'center',
          width:48, height:48, borderRadius:12, cursor:'pointer',
          border:'1px solid ' + (active ? 'transparent' : 'var(--surface-border)'),
          background: active ? 'var(--primary)' : 'transparent',
          color: active ? 'var(--on-primary)' : 'var(--text)',
          transition: 'all 0.2s ease'
        }}
      >
        <Icon size={20} aria-hidden="true" />
        <span className="sr-only" style={{position:'absolute', left:-9999}}>{label}</span>
      </button>
    );
  }
  // bottom variant
  return (
    <button type="button" {...common}
      aria-label={label}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
        minHeight:56, height:56, borderRadius:12, cursor:'pointer',
        border:'1px solid ' + (active ? 'transparent' : 'var(--surface-border)'),
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? 'var(--on-primary)' : 'var(--text)',
        transition: 'all 0.2s ease',
        fontSize: '10px',
        fontWeight: active ? 600 : 400
      }}
    >
      <Icon size={22} aria-hidden="true" />
      <span style={{
        fontSize: '10px',
        lineHeight: 1,
        textAlign: 'center',
        opacity: active ? 1 : 0.8,
        display: 'block'
      }}>{label}</span>
    </button>
  );
}

export default function NavRail({ value, onChange }){
  const items = useMemo(() => ([
    { key: 'home', label: 'Inicio', icon: Home },
    { key: 'matrix', label: 'Matriz', icon: LayoutGrid },
    { key: 'map', label: 'Globo', icon: Globe2 },
    { key: 'settings', label: 'Ajustes', icon: Settings },
  ]), []);

  // Handle swipe navigation between views
  const handleSwipeNavigation = useCallback((direction) => {
    const currentIndex = items.findIndex(item => item.key === value);
    let newIndex;
    
    if (direction === 'left') {
      // Swipe left: next view
      newIndex = (currentIndex + 1) % items.length;
    } else if (direction === 'right') {
      // Swipe right: previous view
      newIndex = (currentIndex - 1 + items.length) % items.length;
    }
    
    if (newIndex !== undefined && newIndex !== currentIndex) {
      onChange?.(items[newIndex].key);
    }
  }, [value, onChange, items]);

  // Configure swipe navigation for bottom nav
  const swipeRef = useSwipeNavigation({
    onSwipeLeft: () => handleSwipeNavigation('left'),
    onSwipeRight: () => handleSwipeNavigation('right'),
    threshold: 50,
    preventScroll: false
  });
  return (
    <>
      {/* Desktop / large screens: lateral rail */}
      <nav aria-label="Navegación" style={{
        position:'fixed', left:'max(12px, env(safe-area-inset-left))', top:'50%', transform:'translateY(-50%)',
        zIndex: 20, display: 'none',
      }} className="nav-rail">
        <div style={{
          display:'flex', flexDirection:'column', gap:10,
          background:'var(--panel-bg)', border:'1px solid var(--panel-border)', color:'var(--text)',
          padding:10, borderRadius:14, boxShadow:'0 14px 40px rgba(0,0,0,.28)',
          backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)'
        }}>
          {items.map(({ key, label, icon:Icon })=> (
            <NavButton
              key={key}
              active={value === key}
              label={label}
              Icon={Icon}
              onPress={() => onChange?.(key)}
              variant="rail"
            />
          ))}
        </div>
      </nav>

      {/* Mobile: bottom bar */}
      <nav aria-label="Navegación" 
        ref={swipeRef}
        style={{
          position:'fixed', left:'max(8px, env(safe-area-inset-left))', right:'max(8px, env(safe-area-inset-right))',
          bottom:'max(8px, env(safe-area-inset-bottom))', zIndex:20, display:'flex'
        }} className="nav-bottom">
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8,
          background:'var(--panel-bg)', border:'1px solid var(--panel-border)', color:'var(--text)',
          padding:12, borderRadius:16, boxShadow:'0 14px 40px rgba(0,0,0,.28)',
          width:'100%', maxWidth:520, margin:'0 auto',
          backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)'
        }}>
          {items.map(({ key, label, icon:Icon })=> (
            <NavButton
              key={key}
              active={value === key}
              label={label}
              Icon={Icon}
              onPress={() => onChange?.(key)}
              variant="bottom"
            />
          ))}
        </div>
      </nav>

      <style>{`
        /* Show rail on >= 900px, bottom bar below */
        @media (min-width: 900px){
          .nav-rail{ display:block !important; }
          .nav-bottom{ display:none !important; }
        }
        @media (max-width: 899.98px){
          .nav-rail{ display:none !important; }
          .nav-bottom{ display:flex !important; }
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .nav-bottom {
            left: max(4px, env(safe-area-inset-left)) !important;
            right: max(4px, env(safe-area-inset-right)) !important;
            bottom: max(4px, env(safe-area-inset-bottom)) !important;
          }
          
          .nav-bottom > div {
            padding: 8px !important;
            border-radius: 20px !important;
            gap: 4px !important;
          }
          
          .nav-bottom button {
            min-height: 60px !important;
            height: 60px !important;
            border-radius: 16px !important;
            font-size: 9px !important;
          }
          
          .nav-bottom button svg {
            width: 24px !important;
            height: 24px !important;
          }
        }
        
        /* Extra small devices */
        @media (max-width: 480px) {
          .nav-bottom button {
            min-height: 64px !important;
            height: 64px !important;
          }
          
          .nav-bottom button svg {
            width: 26px !important;
            height: 26px !important;
          }
        }
        
        /* Landscape mobile adjustments */
        @media (max-width: 768px) and (orientation: landscape) {
          .nav-bottom > div {
            padding: 6px !important;
          }
          
          .nav-bottom button {
            min-height: 48px !important;
            height: 48px !important;
          }
          
          .nav-bottom button svg {
            width: 20px !important;
            height: 20px !important;
          }
        }
        
        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          .nav-bottom button:hover {
            transform: none !important;
          }
          
          .nav-bottom button:active {
            transform: scale(0.95) !important;
            transition: transform 0.1s ease !important;
          }
          
          .nav-bottom button:focus {
            outline: 3px solid var(--accent) !important;
            outline-offset: 2px !important;
          }
        }
      `}</style>
    </>
  )
}
