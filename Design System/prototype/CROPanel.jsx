// CRO Panel — full web dashboard (B2B interface)
// Screens: dashboard, cohorts, study-create, matching, analytics

function CROPanel() {
  const [s, d] = useAppState();
  const [tab, setTab] = React.useState('dashboard');
  const [studyStep, setStudyStep] = React.useState(0);

  const tabs = [
    { id:'dashboard', icon:'home', label:'Dashboard' },
    { id:'cohorts', icon:'users', label:'Cohortes' },
    { id:'study', icon:'flasklg', label:'Nuevo Estudio' },
    { id:'matching', icon:'filter', label:'Matching' },
    { id:'analytics', icon:'barChart', label:'Analytics' },
  ];

  const screens = { dashboard: CRODashboard, cohorts: CROCohorts, study: CROStudyCreate, matching: CROMatching, analytics: CROAnalytics };
  const Screen = screens[tab] || CRODashboard;

  return React.createElement('div', { style:{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'#080809', fontFamily:"'Space Grotesk',sans-serif", color:'#F0F4FF', fontSize:14 } },
    // Top nav
    React.createElement('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', height:52, background:'#0F1320', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 } },
      React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:20 } },
        React.createElement('img', { src:'assets/logo-horizontal-bicolor.png', style:{ height:24 } }),
        React.createElement('span', { style:{ fontSize:11, fontWeight:600, color:'#00C87A', letterSpacing:'0.12em', textTransform:'uppercase', background:'rgba(0,200,122,0.1)', padding:'3px 10px', borderRadius:100, border:'1px solid rgba(0,200,122,0.2)' } }, 'CRO Portal'),
      ),
      React.createElement('div', { style:{ display:'flex', gap:4 } },
        tabs.map(t => React.createElement('button', { key:t.id, onClick:()=>setTab(t.id), style:{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, background:tab===t.id ? 'rgba(0,200,122,0.1)' : 'transparent', border:tab===t.id ? '1px solid rgba(0,200,122,0.2)' : '1px solid transparent', color:tab===t.id ? '#00C87A' : '#8899BB', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif" } },
          React.createElement(Icon, { name:t.icon, size:14, color:tab===t.id ? '#00C87A' : '#8899BB' }), t.label
        ))
      ),
      React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:10 } },
        React.createElement(Avatar, { name:'Syneos Research', size:30, color:'#4B6EF5' }),
        React.createElement('span', { style:{ fontSize:12, color:'#8899BB' } }, 'Syneos Health LATAM'),
        React.createElement('button', { onClick:()=>d({mode:'app', tab:'home', screen:'home'}), style:{ marginLeft:8, padding:'5px 12px', borderRadius:100, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'#8899BB', fontSize:11, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, '← App Paciente')
      )
    ),
    React.createElement('div', { style:{ flex:1, overflow:'auto' } },
      React.createElement(Screen, { onTabChange: setTab, studyStep, setStudyStep })
    )
  );
}

function CRODashboard({ onTabChange }) {
  const stats = [
    { label:'Pacientes en plataforma', value:'2,400+', delta:'+340 este mes', color:'#00C87A' },
    { label:'Consentidos para investigación', value:'680', delta:'28% del total', color:'#00B8D4' },
    { label:'Cohortes activas', value:'3', delta:'Diabetes, Cardio, Oncología', color:'#4B6EF5' },
    { label:'Invitaciones enviadas', value:'142', delta:'Tasa respuesta: 34%', color:'#F59E0B' },
  ];
  const recentStudies = [
    { name:'DIAB-LATAM-01', area:'Diabetes tipo 2', status:'Reclutando', match:47, goal:100 },
    { name:'CARDIO-AR-02', area:'Cardiología', status:'Pre-screening', match:12, goal:30 },
  ];

  return React.createElement('div', { style:{ padding:'20px 24px' } },
    React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 } },
      React.createElement('div', null,
        React.createElement('h1', { style:{ fontSize:22, fontWeight:700 } }, 'Dashboard'),
        React.createElement('p', { style:{ fontSize:13, color:'#8899BB', marginTop:2 } }, 'Syneos Health LATAM · Abril 2026')
      ),
      React.createElement('button', { onClick:()=>onTabChange('study'), style:{ padding:'9px 18px', borderRadius:100, background:'linear-gradient(135deg,#00C87A,#4B6EF5)', border:'none', color:'#fff', fontSize:13, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer', display:'flex', alignItems:'center', gap:6 } },
        React.createElement(Icon, { name:'plus', size:14, color:'#fff' }), 'Nuevo estudio'
      )
    ),
    React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 } },
      stats.map((st, i) =>
        React.createElement('div', { key:i, style:{ background:'#151C2E', borderRadius:12, padding:'16px 18px', border:'1px solid rgba(255,255,255,0.07)' } },
          React.createElement('p', { style:{ fontSize:11, color:'#8899BB', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 } }, st.label),
          React.createElement('p', { style:{ fontSize:28, fontWeight:700, color:st.color, lineHeight:1 } }, st.value),
          React.createElement('p', { style:{ fontSize:11, color:'#4A5578', marginTop:4 } }, st.delta)
        )
      )
    ),
    React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 } },
      React.createElement('div', { style:{ background:'#151C2E', borderRadius:12, padding:'16px', border:'1px solid rgba(255,255,255,0.07)' } },
        React.createElement('h3', { style:{ fontSize:14, fontWeight:700, marginBottom:14 } }, 'Estudios activos'),
        recentStudies.map((st, i) =>
          React.createElement('div', { key:i, style:{ marginBottom:14, paddingBottom:14, borderBottom: i < recentStudies.length-1 ? '1px solid rgba(255,255,255,0.06)' : 'none' } },
            React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', marginBottom:6 } },
              React.createElement('span', { style:{ fontSize:13, fontWeight:600 } }, st.name),
              React.createElement('span', { style:{ fontSize:11, padding:'2px 8px', borderRadius:100, background:'rgba(0,200,122,0.1)', color:'#00C87A', border:'1px solid rgba(0,200,122,0.2)' } }, st.status)
            ),
            React.createElement('p', { style:{ fontSize:11, color:'#8899BB', marginBottom:8 } }, st.area),
            React.createElement('div', { style:{ background:'rgba(255,255,255,0.06)', borderRadius:100, height:6, overflow:'hidden' } },
              React.createElement('div', { style:{ width:`${(st.match/st.goal)*100}%`, height:'100%', background:'linear-gradient(90deg,#00C87A,#4B6EF5)', borderRadius:100 } })
            ),
            React.createElement('p', { style:{ fontSize:11, color:'#4A5578', marginTop:4 } }, `${st.match} / ${st.goal} pacientes`)
          )
        )
      ),
      React.createElement('div', { style:{ background:'#151C2E', borderRadius:12, padding:'16px', border:'1px solid rgba(255,255,255,0.07)' } },
        React.createElement('h3', { style:{ fontSize:14, fontWeight:700, marginBottom:14 } }, 'Distribución terapéutica'),
        [['Diabetes tipo 2','#00C87A',52],['Cardiología','#4B6EF5',28],['Oncología','#00B8D4',15],['Otros','#4A5578',5]].map(([l,c,pct]) =>
          React.createElement('div', { key:l, style:{ display:'flex', alignItems:'center', gap:10, marginBottom:10 } },
            React.createElement('div', { style:{ width:10, height:10, borderRadius:'50%', background:c, flexShrink:0 } }),
            React.createElement('span', { style:{ fontSize:12, color:'#8899BB', flex:1 } }, l),
            React.createElement('div', { style:{ width:80, background:'rgba(255,255,255,0.06)', borderRadius:100, height:5, overflow:'hidden' } },
              React.createElement('div', { style:{ width:`${pct}%`, height:'100%', background:c, borderRadius:100 } })
            ),
            React.createElement('span', { style:{ fontSize:11, color:'#4A5578', width:28, textAlign:'right' } }, pct+'%')
          )
        )
      )
    )
  );
}

function CROCohorts() {
  const [area, setArea] = React.useState('Todos');
  const areas = ['Todos','Diabetes','Cardiología','Oncología','Enf. raras'];
  const cohorts = [
    { name:'Diabetes tipo 2 — Argentina', n:420, density:'Alta', geo:'CABA + GBA', match:94 },
    { name:'Hipertensión — Arg + Chile', n:280, density:'Media', geo:'Multisitio', match:71 },
    { name:'Oncología mamaria', n:98, density:'Alta', geo:'CABA', match:88 },
    { name:'Enfermedad renal crónica', n:145, density:'Media', geo:'Córdoba + Rosario', match:62 },
  ];
  return React.createElement('div', { style:{ padding:'20px 24px' } },
    React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 } },
      React.createElement('h1', { style:{ fontSize:22, fontWeight:700 } }, 'Cohortes disponibles'),
      React.createElement('div', { style:{ display:'flex', gap:6 } },
        areas.map(a => React.createElement('button', { key:a, onClick:()=>setArea(a), style:{ padding:'5px 12px', borderRadius:100, background:area===a ? 'rgba(0,200,122,0.1)' : 'transparent', border:`1px solid ${area===a ? 'rgba(0,200,122,0.3)' : 'rgba(255,255,255,0.1)'}`, color:area===a ? '#00C87A' : '#8899BB', fontSize:11, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, a))
      )
    ),
    React.createElement('div', { style:{ background:'rgba(255,255,255,0.03)', borderRadius:4, padding:'0', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' } },
      React.createElement('table', { style:{ width:'100%', borderCollapse:'collapse', fontSize:13 } },
        React.createElement('thead', null,
          React.createElement('tr', { style:{ background:'rgba(255,255,255,0.04)' } },
            ['Cohorte','Pacientes','Densidad de datos','Geografía','Match %',''].map((h, i) =>
              React.createElement('th', { key:i, style:{ padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#4A5578', letterSpacing:'0.06em', textTransform:'uppercase', borderBottom:'1px solid rgba(255,255,255,0.07)' } }, h)
            )
          )
        ),
        React.createElement('tbody', null,
          cohorts.map((c, i) =>
            React.createElement('tr', { key:i, style:{ borderBottom:'1px solid rgba(255,255,255,0.05)' } },
              React.createElement('td', { style:{ padding:'13px 14px', fontWeight:600, color:'#F0F4FF' } }, c.name),
              React.createElement('td', { style:{ padding:'13px 14px', color:'#00C87A', fontWeight:700 } }, c.n.toLocaleString()),
              React.createElement('td', { style:{ padding:'13px 14px' } },
                React.createElement('span', { style:{ fontSize:11, padding:'2px 8px', borderRadius:100, background: c.density==='Alta'?'rgba(0,200,122,0.1)':'rgba(245,158,11,0.1)', color:c.density==='Alta'?'#00C87A':'#F59E0B' } }, c.density)
              ),
              React.createElement('td', { style:{ padding:'13px 14px', color:'#8899BB' } }, c.geo),
              React.createElement('td', { style:{ padding:'13px 14px' } },
                React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
                  React.createElement('div', { style:{ width:50, background:'rgba(255,255,255,0.06)', borderRadius:100, height:5, overflow:'hidden' } },
                    React.createElement('div', { style:{ width:`${c.match}%`, height:'100%', background:'linear-gradient(90deg,#00C87A,#4B6EF5)', borderRadius:100 } })
                  ),
                  React.createElement('span', { style:{ fontSize:12, fontWeight:700, color:c.match>80?'#00C87A':'#F59E0B' } }, c.match+'%')
                )
              ),
              React.createElement('td', { style:{ padding:'13px 14px' } },
                React.createElement('button', { style:{ padding:'5px 12px', borderRadius:100, background:'rgba(0,200,122,0.1)', border:'1px solid rgba(0,200,122,0.2)', color:'#00C87A', fontSize:11, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Ver detalle')
              )
            )
          )
        )
      )
    )
  );
}

function CROStudyCreate({ studyStep, setStudyStep }) {
  const steps = ['Área terapéutica','Criterios','Geografía','Objetivo','Revisión'];
  const [area, setArea] = React.useState('');
  const [gender, setGender] = React.useState(['Todos']);
  const [geo, setGeo] = React.useState(['Argentina']);
  const [goal, setGoal] = React.useState(100);

  return React.createElement('div', { style:{ padding:'20px 24px', maxWidth:720 } },
    React.createElement('h1', { style:{ fontSize:22, fontWeight:700, marginBottom:4 } }, 'Crear nuevo estudio'),
    React.createElement('div', { style:{ display:'flex', gap:0, marginBottom:24, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:4, width:'fit-content' } },
      steps.map((st, i) => React.createElement('div', { key:i, style:{ padding:'6px 14px', borderRadius:6, background: i===studyStep ? 'rgba(0,200,122,0.15)' : 'transparent', color: i===studyStep ? '#00C87A' : i<studyStep ? '#4A5578' : '#4A5578', fontSize:12, fontWeight: i===studyStep ? 700 : 500 } }, `${i+1}. ${st}`))
    ),

    studyStep === 0 && React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
      React.createElement('p', { style:{ fontSize:13, color:'#8899BB', marginBottom:4 } }, 'Seleccioná el área terapéutica principal del estudio.'),
      ['Diabetes tipo 2','Cardiología','Oncología mamaria','Hipertensión','Salud mental','Enfermedad renal','Otro'].map(a =>
        React.createElement('button', { key:a, onClick:()=>setArea(a), style:{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 16px', borderRadius:10, background:area===a ? 'rgba(0,200,122,0.08)' : '#151C2E', border:`1px solid ${area===a ? 'rgba(0,200,122,0.3)' : 'rgba(255,255,255,0.07)'}`, color:area===a ? '#00C87A' : '#F0F4FF', fontSize:13, fontWeight:area===a?700:400, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer', textAlign:'left' } },
          a, area===a && React.createElement(Icon, { name:'check', size:14, color:'#00C87A' })
        )
      )
    ),

    studyStep === 1 && React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:14 } },
      React.createElement('p', { style:{ fontSize:13, color:'#8899BB' } }, 'Definí los criterios de inclusión.'),
      [['Rango de edad','18–70 años'],['HbA1c mínima','6.5%'],['Tratamiento actual','Metformina']].map(([k,v]) =>
        React.createElement('div', { key:k },
          React.createElement('label', { style:{ fontSize:11, fontWeight:600, color:'#8899BB', display:'block', marginBottom:5, letterSpacing:'0.04em' } }, k.toUpperCase()),
          React.createElement('input', { defaultValue:v, style:{ width:'100%', padding:'10px 12px', borderRadius:8, background:'#0F1320', border:'1px solid rgba(255,255,255,0.1)', color:'#F0F4FF', fontSize:13, fontFamily:"'Space Grotesk',sans-serif", outline:'none', boxSizing:'border-box' } })
        )
      )
    ),

    studyStep === 2 && React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
      React.createElement('p', { style:{ fontSize:13, color:'#8899BB', marginBottom:4 } }, 'Seleccioná los países/regiones.'),
      ['Argentina','México','Colombia','Brasil','Chile'].map(g =>
        React.createElement('button', { key:g, onClick:()=>setGeo(prev=>prev.includes(g)?prev.filter(x=>x!==g):[...prev,g]), style:{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderRadius:10, background:geo.includes(g) ? 'rgba(75,110,245,0.08)' : '#151C2E', border:`1px solid ${geo.includes(g) ? 'rgba(75,110,245,0.3)' : 'rgba(255,255,255,0.07)'}`, color:geo.includes(g) ? '#7090F7' : '#F0F4FF', fontSize:13, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } },
          g, geo.includes(g) && React.createElement(Icon, { name:'check', size:14, color:'#7090F7' })
        )
      )
    ),

    studyStep === 3 && React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:16 } },
      React.createElement('p', { style:{ fontSize:13, color:'#8899BB' } }, 'Definí cuántos pacientes necesitás recrutar.'),
      React.createElement('label', { style:{ fontSize:28, fontWeight:700, color:'#00C87A' } }, `${goal} pacientes`),
      React.createElement('input', { type:'range', min:10, max:500, value:goal, onChange:e=>setGoal(+e.target.value), style:{ width:'100%', accentColor:'#00C87A' } }),
      React.createElement('div', { style:{ background:'rgba(0,200,122,0.08)', borderRadius:10, padding:'12px 16px', border:'1px solid rgba(0,200,122,0.2)' } },
        React.createElement('p', { style:{ fontSize:13, color:'#00C87A' } }, `Cohorte disponible estimada: ~340 pacientes compatibles en LATAM`)
      )
    ),

    studyStep === 4 && React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:14 } },
      React.createElement('p', { style:{ fontSize:13, color:'#8899BB' } }, 'Revisá antes de lanzar.'),
      [['Área terapéutica', area || 'Diabetes tipo 2'],['Países', geo.join(', ')],['Objetivo', `${goal} pacientes`],['Criterios','HbA1c ≥6.5% · 18-70 años · Metformina']].map(([k,v]) =>
        React.createElement('div', { key:k, style:{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' } },
          React.createElement('span', { style:{ fontSize:12, color:'#8899BB' } }, k),
          React.createElement('span', { style:{ fontSize:13, fontWeight:600 } }, v)
        )
      )
    ),

    React.createElement('div', { style:{ display:'flex', gap:10, marginTop:24 } },
      studyStep > 0 && React.createElement('button', { onClick:()=>setStudyStep(s=>s-1), style:{ padding:'10px 20px', borderRadius:100, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'#8899BB', fontSize:13, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, '← Atrás'),
      React.createElement('button', { onClick:()=>setStudyStep(s=>Math.min(s+1,4)), style:{ padding:'10px 24px', borderRadius:100, background:'linear-gradient(135deg,#00C87A,#4B6EF5)', border:'none', color:'#fff', fontSize:13, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, studyStep===4 ? 'Lanzar estudio →' : 'Continuar →')
    )
  );
}

function CROMatching() {
  const pts = [
    { id:'PAC-2841', score:96, age:'47', conds:'Diabetes T2 · HTA', data:'14 documentos · 18 meses', geo:'CABA' },
    { id:'PAC-1092', score:88, age:'55', conds:'Diabetes T2', data:'9 documentos · 12 meses', geo:'Rosario' },
    { id:'PAC-3317', score:81, age:'62', conds:'Diabetes T2 · Cardiopatía', data:'22 documentos · 24 meses', geo:'Córdoba' },
    { id:'PAC-4451', score:74, age:'39', conds:'Diabetes T2', data:'6 documentos · 8 meses', geo:'Mendoza' },
  ];
  return React.createElement('div', { style:{ padding:'20px 24px' } },
    React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 } },
      React.createElement('div', null,
        React.createElement('h1', { style:{ fontSize:22, fontWeight:700 } }, 'Patient Matching'),
        React.createElement('p', { style:{ fontSize:13, color:'#8899BB', marginTop:2 } }, 'DIAB-LATAM-01 · 4 pacientes con alto match')
      ),
    ),
    React.createElement('div', { style:{ background:'rgba(0,200,122,0.06)', borderRadius:10, padding:'10px 14px', border:'1px solid rgba(0,200,122,0.15)', marginBottom:16, display:'flex', gap:10, alignItems:'center' } },
      React.createElement(Icon, { name:'shield', size:14, color:'#00C87A' }),
      React.createElement('p', { style:{ fontSize:12, color:'#8899BB' } }, 'Los datos son completamente anonimizados. Nunca ves información identificable del paciente.')
    ),
    React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
      pts.map((p, i) =>
        React.createElement('div', { key:i, style:{ background:'#151C2E', borderRadius:12, padding:'14px 16px', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:14 } },
          React.createElement('div', { style:{ width:52, height:52, borderRadius:12, background:p.score>90?'rgba(0,200,122,0.15)':p.score>80?'rgba(0,184,212,0.15)':'rgba(75,110,245,0.15)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 } },
            React.createElement('span', { style:{ fontSize:18, fontWeight:700, color:p.score>90?'#00C87A':p.score>80?'#00B8D4':'#4B6EF5', lineHeight:1 } }, p.score),
            React.createElement('span', { style:{ fontSize:9, color:'#4A5578', marginTop:2 } }, 'score')
          ),
          React.createElement('div', { style:{ flex:1 } },
            React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', marginBottom:3 } },
              React.createElement('span', { style:{ fontSize:13, fontWeight:600, color:'#F0F4FF' } }, p.id + ' · ' + p.age + 'a'),
              React.createElement('span', { style:{ fontSize:11, color:'#4A5578' } }, p.geo)
            ),
            React.createElement('p', { style:{ fontSize:12, color:'#8899BB', marginBottom:2 } }, p.conds),
            React.createElement('p', { style:{ fontSize:11, color:'#4A5578' } }, p.data)
          ),
          React.createElement('button', { style:{ padding:'7px 14px', borderRadius:100, background:'rgba(0,200,122,0.1)', border:'1px solid rgba(0,200,122,0.2)', color:'#00C87A', fontSize:12, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Invitar')
        )
      )
    )
  );
}

function CROAnalytics() {
  const funnel = [
    { label:'Pacientes identificados', n:340, pct:100, color:'#8899BB' },
    { label:'Invitaciones enviadas', n:142, pct:42, color:'#00B8D4' },
    { label:'Respondieron', n:87, pct:26, color:'#4B6EF5' },
    { label:'Interesados', n:54, pct:16, color:'#00C87A' },
    { label:'Enrolados', n:31, pct:9, color:'#00C87A' },
  ];
  return React.createElement('div', { style:{ padding:'20px 24px' } },
    React.createElement('h1', { style:{ fontSize:22, fontWeight:700, marginBottom:20 } }, 'Analytics de Reclutamiento'),
    React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 } },
      React.createElement('div', { style:{ background:'#151C2E', borderRadius:12, padding:'18px', border:'1px solid rgba(255,255,255,0.07)' } },
        React.createElement('h3', { style:{ fontSize:14, fontWeight:700, marginBottom:16 } }, 'Funnel DIAB-LATAM-01'),
        React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:8 } },
          funnel.map((f, i) =>
            React.createElement('div', { key:i },
              React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', marginBottom:4 } },
                React.createElement('span', { style:{ fontSize:12, color:'#8899BB' } }, f.label),
                React.createElement('span', { style:{ fontSize:13, fontWeight:700, color:f.color } }, f.n)
              ),
              React.createElement('div', { style:{ background:'rgba(255,255,255,0.06)', borderRadius:100, height:6, overflow:'hidden' } },
                React.createElement('div', { style:{ width:`${f.pct}%`, height:'100%', background:f.color, borderRadius:100, opacity:0.9 } })
              )
            )
          )
        )
      ),
      React.createElement('div', { style:{ background:'#151C2E', borderRadius:12, padding:'18px', border:'1px solid rgba(255,255,255,0.07)' } },
        React.createElement('h3', { style:{ fontSize:14, fontWeight:700, marginBottom:16 } }, 'KPIs clave'),
        [['Tasa de respuesta','34%','#00C87A'],['Conversión a interés','38%','#00B8D4'],['Enrollment rate','9%','#4B6EF5'],['Costo por paciente identificado','$12 USD','#F59E0B'],['Costo vs. benchmark tradicional','−82%','#00C87A']].map(([k,v,c]) =>
          React.createElement('div', { key:k, style:{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' } },
            React.createElement('span', { style:{ fontSize:12, color:'#8899BB' } }, k),
            React.createElement('span', { style:{ fontSize:14, fontWeight:700, color:c } }, v)
          )
        )
      )
    )
  );
}

Object.assign(window, { CROPanel });
