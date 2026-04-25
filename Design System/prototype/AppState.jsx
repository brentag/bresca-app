// Global shared state and design tokens for Bresca prototype
// Exports: useAppState, AppColors, AppFonts, Icon, Badge, Avatar, Pill, Card, ScreenWrapper

const AppColors = {
  green: '#00C87A', greenLight: 'rgba(0,200,122,0.10)', greenBorder: 'rgba(0,200,122,0.20)',
  blue: '#4B6EF5', blueLight: 'rgba(75,110,245,0.10)', blueBorder: 'rgba(75,110,245,0.20)',
  teal: '#00B8D4',
  grad: 'linear-gradient(135deg,#00C87A 0%,#00B8D4 50%,#4B6EF5 100%)',
  white: '#FFFFFF', bg: '#F7F9FC', surface: '#FFFFFF',
  border: '#E8EDF5', borderLight: '#F1F5F9',
  text1: '#0F172A', text2: '#4A5568', text3: '#94A3B8',
  warn: '#F59E0B', error: '#EF4444', errorLight: 'rgba(239,68,68,0.1)',
  success: '#00C87A', successLight: 'rgba(0,200,122,0.1)',
};

// Minimal SVG icons as React components
function Icon({ name, size=20, color='currentColor', strokeWidth=1.8 }) {
  const paths = {
    home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
    folder: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
    zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
    menu: 'M3 12h18 M3 6h18 M3 18h18',
    upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
    share: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8 M16 6l-4-4-4 4 M12 2v13',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
    bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0',
    chevronRight: 'M9 18l6-6-6-6',
    chevronLeft: 'M15 18l-6-6 6-6',
    chevronDown: 'M6 9l6 6 6-6',
    check: 'M20 6L9 17l-5-5',
    x: 'M18 6L6 18 M6 6l12 12',
    plus: 'M12 5v14 M5 12h14',
    camera: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z',
    file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6',
    heart: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
    activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
    lock: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4',
    info: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01',
    send: 'M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z',
    qr: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h.01 M18 14h.01 M14 18h.01 M18 18h.01 M14 21h7 M21 14v4',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    arrowRight: 'M5 12h14 M12 5l7 7-7 7',
    flasklg: 'M6 2v6l-4 10a2 2 0 001.8 2.8h12.4A2 2 0 0018 18L14 8V2 M6 2h8 M15 13H9',
    dna: 'M2 15c6.667-6 13.333 0 20-6 M2 9c6.667 6 13.333 0 20 6 M5.5 12H5 M19.5 12H19 M2 15v-1 M2 10v-1 M22 15v-1 M22 10v-1',
    database: 'M12 2c5.523 0 10 2.239 10 5s-4.477 5-10 5S2 10.761 2 7s4.477-5 10-5z M2 7v5c0 2.761 4.477 5 10 5s10-2.239 10-5V7 M2 12v5c0 2.761 4.477 5 10 5s10-2.239 10-5v-5',
    filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    barChart: 'M12 20V10 M18 20V4 M6 20v-4',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12a3 3 0 100-6 3 3 0 000 6z',
    trash: 'M3 6h18 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6 M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2',
    settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  };
  const d = paths[name] || '';
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' },
    ...d.split(' M ').filter(Boolean).map((seg, i) =>
      React.createElement('path', { key: i, d: (i === 0 ? '' : 'M ') + seg })
    )
  );
}

function Pill({ children, color = AppColors.green, bg, style = {} }) {
  return React.createElement('span', {
    style: { display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase', color: color, background: bg || color + '18', borderRadius:100, padding:'3px 10px', ...style }
  }, children);
}

function Card({ children, style = {}, onClick }) {
  return React.createElement('div', {
    onClick,
    style: { background:'#fff', borderRadius:16, padding:'16px', boxShadow:'0 1px 8px rgba(0,0,0,0.06)', border:'1px solid #F0F4FA', cursor: onClick ? 'pointer' : 'default', ...style }
  }, children);
}

function Avatar({ name, size = 36, color = AppColors.green, img }) {
  const initials = name ? name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '?';
  return React.createElement('div', {
    style: { width:size, height:size, borderRadius:'50%', background: img ? `url(${img}) center/cover` : color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:700, color:'#fff', flexShrink:0 }
  }, img ? null : initials);
}

// App-level state — singleton stored on window
function createAppState() {
  const listeners = [];
  let state = {
    mode: 'onboard', // 'onboard' | 'app' | 'cro'
    onboardStep: 0,
    tab: 'home',
    screen: 'home',
    uploadStep: 0,
    selectedDoc: null,
    chatInput: '',
    showQR: false,
    activeFamily: 'me',
    studyInvite: null,
    croTab: 'dashboard',
  };
  return {
    get() { return state; },
    set(patch) {
      state = { ...state, ...patch };
      listeners.forEach(fn => fn(state));
    },
    subscribe(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i>=0) listeners.splice(i,1); }; },
  };
}

window.AppStore = createAppState();

function useAppState() {
  const [s, setS] = React.useState(window.AppStore.get());
  React.useEffect(() => window.AppStore.subscribe(setS), []);
  const dispatch = React.useCallback((patch) => window.AppStore.set(patch), []);
  return [s, dispatch];
}

function ScreenWrapper({ children, bg = AppColors.bg, style = {} }) {
  return React.createElement('div', {
    style: { width:'100%', height:'100%', background: bg, display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:"'Space Grotesk',sans-serif", ...style }
  }, children);
}

function TopBar({ title, onBack, action, subtitle }) {
  const [s, d] = useAppState();
  return React.createElement('div', { style:{ padding:'12px 16px 8px', background:'#fff', borderBottom:'1px solid #F0F4FA', flexShrink:0 } },
    onBack && React.createElement('button', { onClick: onBack, style:{ background:'none', border:'none', padding:'0 0 4px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:AppColors.text2, fontSize:13 } },
      React.createElement(Icon, { name:'chevronLeft', size:16, color:AppColors.green }), 'Atrás'
    ),
    React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center' } },
      React.createElement('div', null,
        React.createElement('div', { style:{ fontSize:18, fontWeight:700, color:AppColors.text1 } }, title),
        subtitle && React.createElement('div', { style:{ fontSize:12, color:AppColors.text3, marginTop:1 } }, subtitle)
      ),
      action
    )
  );
}

Object.assign(window, { useAppState, AppColors, Icon, Pill, Card, Avatar, ScreenWrapper, TopBar });
