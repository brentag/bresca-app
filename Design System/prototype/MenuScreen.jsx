// Menu, Sharing/QR, Consent Center, Study Invitation, Settings

function MenuScreen() {
  const [s, d] = useAppState();
  const screen = s.screen;

  if (screen === 'sharing') return React.createElement(SharingScreen, null);
  if (screen === 'consent') return React.createElement(ConsentScreen, null);
  if (screen === 'study-invite') return React.createElement(StudyInviteScreen, null);
  if (screen === 'settings') return React.createElement(SettingsScreen, null);
  if (screen === 'timeline') return React.createElement(TimelineScreen, null);

  return React.createElement(MenuList, null);
}

function MenuList() {
  const [s, d] = useAppState();
  const items = [
    { icon:'share', label:'Compartir vía QR', desc:'Generá acceso temporal para tu médico', screen:'sharing', color:AppColors.green },
    { icon:'clock', label:'Timeline de salud', desc:'Tu historia clínica ordenada', screen:'timeline', color:AppColors.blue },
    { icon:'flasklg', label:'Centro de Consentimiento', desc:'Investigación clínica y privacidad', screen:'consent', color:AppColors.teal },
    { icon:'bell', label:'Invitaciones a estudios', desc:'1 nueva invitación', screen:'study-invite', color:'#F59E0B', badge:1 },
    { icon:'settings', label:'Configuración y privacidad', desc:'Cuenta, seguridad, datos', screen:'settings', color:AppColors.text3 },
  ];

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Más opciones' }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'12px 14px' } },
      // User card
      React.createElement(Card, { style:{ display:'flex', gap:12, alignItems:'center', marginBottom:14 } },
        React.createElement(Avatar, { name:'María García', size:48 }),
        React.createElement('div', { style:{ flex:1 } },
          React.createElement('p', { style:{ fontSize:16, fontWeight:700, color:AppColors.text1 } }, 'María García'),
          React.createElement('p', { style:{ fontSize:12, color:AppColors.text3 } }, 'Plan Free · 18 estudios'),
          React.createElement(Pill, { children:'Beta Bresca 🎉', style:{ marginTop:4, fontSize:10 } })
        )
      ),

      items.map((item, i) =>
        React.createElement('button', { key:i, onClick:()=>d({screen:item.screen}),
          style:{ width:'100%', display:'flex', gap:12, alignItems:'center', background:'#fff', borderRadius:14, padding:'14px 12px', marginBottom:8, border:`1px solid ${AppColors.borderLight}`, cursor:'pointer', textAlign:'left' } },
          React.createElement('div', { style:{ width:40, height:40, borderRadius:11, background:item.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } },
            React.createElement(Icon, { name:item.icon, size:20, color:item.color })
          ),
          React.createElement('div', { style:{ flex:1 } },
            React.createElement('p', { style:{ fontSize:14, fontWeight:600, color:AppColors.text1 } }, item.label),
            React.createElement('p', { style:{ fontSize:11, color:AppColors.text3, marginTop:1 } }, item.desc)
          ),
          item.badge && React.createElement('div', { style:{ width:20, height:20, borderRadius:'50%', background:AppColors.warn, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' } }, item.badge),
          React.createElement(Icon, { name:'chevronRight', size:14, color:AppColors.text3 })
        )
      )
    )
  );
}

// ── QR SHARING SCREEN ────────────────────────────────────────────────
function SharingScreen() {
  const [s, d] = useAppState();
  const [hours, setHours] = React.useState(48);
  const [docs, setDocs] = React.useState(['Análisis de Sangre']);
  const [generated, setGenerated] = React.useState(false);

  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement(TopBar, { title:'Compartir vía QR', onBack:()=>d({screen:'menu'}) }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'16px' } },

      !generated ? React.createElement('div', null,
        React.createElement('p', { style:{ fontSize:13, color:AppColors.text2, marginBottom:16, lineHeight:1.6 } }, 'Generá un código QR temporal. Tu médico podrá ver solo lo que vos elegís, por el tiempo que vos decidís.'),

        React.createElement('div', { style:{ marginBottom:16 } },
          React.createElement('p', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase' } }, 'Documentos a compartir'),
          SAMPLE_DOCS.map(doc => React.createElement('div', { key:doc.id, style:{ display:'flex', gap:10, alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${AppColors.borderLight}` } },
            React.createElement('input', { type:'checkbox', checked:docs.includes(doc.name), onChange:()=>setDocs(p=>p.includes(doc.name)?p.filter(x=>x!==doc.name):[...p,doc.name]),
              style:{ width:16, height:16, accentColor:AppColors.green, flexShrink:0 } }),
            React.createElement('p', { style:{ fontSize:13, color:AppColors.text1 } }, doc.name),
          ))
        ),

        React.createElement('div', { style:{ marginBottom:20 } },
          React.createElement('p', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase' } }, 'Duración del acceso'),
          React.createElement('div', { style:{ display:'flex', gap:8 } },
            [24, 48, 72, 168].map(h => React.createElement('button', { key:h, onClick:()=>setHours(h), style:{ flex:1, padding:'8px 4px', borderRadius:10, border:`1.5px solid ${hours===h ? AppColors.green : AppColors.border}`, background:hours===h ? AppColors.greenLight : 'transparent', color:hours===h ? AppColors.green : AppColors.text2, fontSize:12, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, h===168?'1 semana':`${h}hs`))
          )
        ),

        React.createElement('button', { onClick:()=>setGenerated(true), style:{ width:'100%', padding:'14px', borderRadius:100, background:AppColors.grad, border:'none', color:'#fff', fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Generar QR →')
      ) : React.createElement('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' } },
        // Simulated QR
        React.createElement('div', { style:{ width:180, height:180, background:'#fff', border:`2px solid ${AppColors.border}`, borderRadius:16, padding:16, marginBottom:16, display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:2 } },
          Array.from({length:81}).map((_,i) => React.createElement('div', { key:i, style:{ background: Math.random()>0.5 ? '#0F172A' : 'transparent', borderRadius:1 } }))
        ),
        React.createElement(Pill, { children:`Válido ${hours}hs · Solo lectura`, style:{marginBottom:12} }),
        React.createElement('p', { style:{ fontSize:13, color:AppColors.text2, marginBottom:4 } }, 'Mostrá este código a tu médico'),
        React.createElement('p', { style:{ fontSize:11, color:AppColors.text3, marginBottom:20, lineHeight:1.6 } }, `Expira en ${hours} horas. El médico puede ver: ${docs.join(', ')}.`),
        React.createElement('div', { style:{ background:'#F0FDF4', border:`1px solid ${AppColors.greenBorder}`, borderRadius:12, padding:'12px 16px', width:'100%', marginBottom:12, textAlign:'left' } },
          React.createElement('p', { style:{ fontSize:12, color:AppColors.green, fontWeight:600, marginBottom:4 } }, '¿Qué ve el médico?'),
          React.createElement('p', { style:{ fontSize:12, color:AppColors.text2, lineHeight:1.5 } }, 'Una vista de solo lectura de los documentos seleccionados, sin necesidad de crear cuenta en Bresca.')
        ),
        React.createElement('button', { onClick:()=>setGenerated(false), style:{ background:'none', border:'none', fontSize:13, color:AppColors.text3, cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif" } }, 'Generar nuevo QR')
      )
    )
  );
}

// ── CONSENT CENTER ───────────────────────────────────────────────────
const CONSENT_AREAS = [
  { id:'diabetes', label:'Diabetes y Metabolismo', desc:'Estudios de glucemia, HbA1c, insulinorresistencia', enabled:true, color:AppColors.green },
  { id:'cardio', label:'Cardiología', desc:'Enfermedades cardiovasculares, hipertensión', enabled:false, color:AppColors.blue },
  { id:'onco', label:'Oncología', desc:'Detección temprana, tratamientos oncológicos', enabled:false, color:AppColors.teal },
  { id:'neuro', label:'Neurología', desc:'Salud mental, neurológicos, enfermedades raras', enabled:false, color:'#8B5CF6' },
];

function ConsentScreen() {
  const [s, d] = useAppState();
  const [areas, setAreas] = React.useState(CONSENT_AREAS);
  const [globalConsent, setGlobalConsent] = React.useState(true);

  const toggle = (id) => setAreas(prev => prev.map(a => a.id===id ? {...a, enabled:!a.enabled} : a));

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Centro de Consentimiento', onBack:()=>d({screen:'menu'}) }),

    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'14px' } },
      React.createElement(Card, { style:{ background:'linear-gradient(135deg,#EEF2FF,#F0FDF4)', border:`1px solid ${AppColors.greenBorder}`, marginBottom:14 } },
        React.createElement('div', { style:{ display:'flex', gap:10, alignItems:'flex-start' } },
          React.createElement(Icon, { name:'shield', size:20, color:AppColors.green }),
          React.createElement('div', null,
            React.createElement('p', { style:{ fontSize:14, fontWeight:700, color:AppColors.text1, marginBottom:4 } }, 'Tus datos, tus reglas'),
            React.createElement('p', { style:{ fontSize:12, color:AppColors.text2, lineHeight:1.6 } }, 'Podés activar o desactivar tu participación en investigación clínica en cualquier momento, sin consecuencias en tu uso de Bresca.')
          )
        )
      ),

      // Global toggle
      React.createElement(Card, { style:{ marginBottom:14 } },
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center' } },
          React.createElement('div', null,
            React.createElement('p', { style:{ fontSize:15, fontWeight:700, color:AppColors.text1 } }, 'Participar en investigación'),
            React.createElement('p', { style:{ fontSize:12, color:AppColors.text3, marginTop:2 } }, globalConsent ? 'Activo — tus datos pueden usarse en estudios' : 'Inactivo — no participás en estudios')
          ),
          React.createElement('button', { onClick:()=>setGlobalConsent(!globalConsent),
            style:{ width:48, height:26, borderRadius:100, background:globalConsent ? AppColors.green : '#CBD5E1', border:'none', cursor:'pointer', position:'relative', transition:'background 200ms' } },
            React.createElement('div', { style:{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:globalConsent?25:3, transition:'left 200ms', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' } })
          )
        )
      ),

      globalConsent && React.createElement('div', null,
        React.createElement('p', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' } }, 'Áreas terapéuticas'),
        areas.map(area =>
          React.createElement(Card, { key:area.id, style:{ marginBottom:8 } },
            React.createElement('div', { style:{ display:'flex', gap:10, alignItems:'flex-start' } },
              React.createElement('div', { style:{ width:36, height:36, borderRadius:10, background:area.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } },
                React.createElement(Icon, { name:'flasklg', size:16, color:area.color })
              ),
              React.createElement('div', { style:{ flex:1 } },
                React.createElement('p', { style:{ fontSize:13, fontWeight:600, color:AppColors.text1 } }, area.label),
                React.createElement('p', { style:{ fontSize:11, color:AppColors.text3, marginTop:2, lineHeight:1.5 } }, area.desc)
              ),
              React.createElement('button', { onClick:()=>toggle(area.id),
                style:{ width:40, height:22, borderRadius:100, background:area.enabled ? area.color : '#CBD5E1', border:'none', cursor:'pointer', position:'relative', flexShrink:0, transition:'background 200ms' } },
                React.createElement('div', { style:{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:area.enabled?21:3, transition:'left 200ms' } })
              )
            )
          )
        )
      ),

      React.createElement(Card, { style:{ background:AppColors.bg, border:'none', marginTop:8 } },
        React.createElement('p', { style:{ fontSize:11, color:AppColors.text3, lineHeight:1.7 } }, '📋 Tus datos siempre son anonimizados antes de compartirse. El sponsor nunca te identifica directamente. Podés revocar en cualquier momento. Cumplimiento: LGPD, Ley 25.326, HIPAA.')
      )
    )
  );
}

// ── STUDY INVITATION SCREEN ──────────────────────────────────────────
function StudyInviteScreen() {
  const [s, d] = useAppState();
  const [step, setStep] = React.useState(0); // 0=list, 1=detail, 2=confirm

  if (step === 2) return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', textAlign:'center' } },
      React.createElement('div', { style:{ width:72, height:72, borderRadius:24, background:AppColors.greenLight, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, border:`2px solid ${AppColors.greenBorder}` } },
        React.createElement(Icon, { name:'check', size:32, color:AppColors.green })
      ),
      React.createElement('h2', { style:{ fontSize:20, fontWeight:700, marginBottom:8 } }, '¡Gracias por participar!'),
      React.createElement('p', { style:{ fontSize:14, color:AppColors.text2, lineHeight:1.65, maxWidth:260 } }, 'El equipo del estudio se pondrá en contacto en los próximos 5 días hábiles. Podés revocar tu participación en cualquier momento.'),
      React.createElement('button', { onClick:()=>d({screen:'menu'}), style:{ marginTop:28, padding:'12px 28px', borderRadius:100, background:AppColors.grad, border:'none', color:'#fff', fontSize:14, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Volver al inicio')
    )
  );

  if (step === 1) return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement(TopBar, { title:'Detalle del estudio', onBack:()=>setStep(0) }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'16px' } },
      React.createElement(Pill, { children:'Estudio Clínico Fase III', style:{ marginBottom:12 } }),
      React.createElement('h2', { style:{ fontSize:19, fontWeight:700, color:AppColors.text1, marginBottom:8, lineHeight:1.3 } }, 'Estudio LATAM Diabetes Tipo 2 — Metformina vs. nueva molécula'),
      React.createElement('p', { style:{ fontSize:13, color:AppColors.text3, marginBottom:16 } }, 'Patrocinado por Roche LATAM · CRO: ICON plc'),

      [['¿De qué se trata?','Comparación de eficacia entre Metformina y un nuevo compuesto oral para diabetes tipo 2 sin insulinoterapia.'],['¿Por qué te invitamos?','Tu perfil clínico (glucemia 127, HbA1c 6.8%, sin insulina) cumple exactamente los criterios de inclusión.'],['¿Qué implica para vos?','3 visitas médicas en 6 meses. Análisis de sangre cada 2 meses. Todo cubierto por el patrocinador.'],['¿Qué data se usa?','Solo los estudios que ya tenés en Bresca, con tu autorización explícita. Siempre anonimizados.']].map(([t,c]) =>
        React.createElement(Card, { key:t, style:{ marginBottom:10 } },
          React.createElement('p', { style:{ fontSize:12, fontWeight:700, color:AppColors.green, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' } }, t),
          React.createElement('p', { style:{ fontSize:13, color:AppColors.text2, lineHeight:1.6 } }, c)
        )
      ),
      React.createElement('div', { style:{ display:'flex', gap:10, marginTop:4 } },
        React.createElement('button', { onClick:()=>setStep(2), style:{ flex:2, padding:'13px', borderRadius:100, background:AppColors.grad, border:'none', color:'#fff', fontSize:14, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Me interesa →'),
        React.createElement('button', { onClick:()=>d({screen:'menu'}), style:{ flex:1, padding:'13px', borderRadius:100, background:'transparent', border:`1.5px solid ${AppColors.border}`, color:AppColors.text2, fontSize:14, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Declinar')
      )
    )
  );

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Invitaciones', subtitle:'1 nueva', onBack:()=>d({screen:'menu'}) }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'14px' } },
      React.createElement(Card, { onClick:()=>setStep(1), style:{ cursor:'pointer', border:`2px solid ${AppColors.greenBorder}`, background:'linear-gradient(135deg,#F0FDF4,#EEF2FF)' } },
        React.createElement('div', { style:{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 } },
          React.createElement('div', { style:{ width:44, height:44, borderRadius:12, background:AppColors.green, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } },
            React.createElement(Icon, { name:'flasklg', size:22, color:'#fff' })
          ),
          React.createElement('div', null,
            React.createElement(Pill, { children:'Nueva · Fase III', style:{marginBottom:4,fontSize:10} }),
            React.createElement('p', { style:{ fontSize:14, fontWeight:700, color:AppColors.text1, lineHeight:1.3 } }, 'Estudio LATAM Diabetes Tipo 2'),
          )
        ),
        React.createElement('p', { style:{ fontSize:12, color:AppColors.text2, lineHeight:1.5, marginBottom:10 } }, 'Tu perfil es compatible. 3 visitas en 6 meses. Patrocinado por Roche LATAM.'),
        React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center' } },
          React.createElement('p', { style:{ fontSize:11, color:AppColors.text3 } }, 'Expira en 7 días'),
          React.createElement('span', { style:{ fontSize:12, fontWeight:700, color:AppColors.green } }, 'Ver detalles →')
        )
      )
    )
  );
}

// ── SETTINGS ─────────────────────────────────────────────────────────
function SettingsScreen() {
  const [s, d] = useAppState();
  const sections = [
    { title:'Cuenta', items:[{icon:'users',label:'Mi perfil'},{icon:'lock',label:'Contraseña y seguridad'},{icon:'bell',label:'Notificaciones'}] },
    { title:'Datos y Privacidad', items:[{icon:'shield',label:'Centro de Consentimiento',action:()=>d({screen:'consent'})},{icon:'eye',label:'Quién accedió a mis datos'},{icon:'trash',label:'Eliminar mi cuenta'}] },
    { title:'App', items:[{icon:'info',label:'Acerca de Bresca'},{icon:'star',label:'Calificar la app'}] },
  ];

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Configuración', onBack:()=>d({screen:'menu'}) }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'14px' } },
      sections.map(sec => React.createElement('div', { key:sec.title, style:{ marginBottom:18 } },
        React.createElement('p', { style:{ fontSize:11, fontWeight:600, color:AppColors.text3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 } }, sec.title),
        React.createElement('div', { style:{ background:'#fff', borderRadius:14, overflow:'hidden', border:`1px solid ${AppColors.borderLight}` } },
          sec.items.map((item,i) => React.createElement('button', { key:i, onClick:item.action||undefined,
            style:{ width:'100%', display:'flex', gap:12, alignItems:'center', padding:'13px 14px', background:'none', border:'none', borderBottom:i<sec.items.length-1?`1px solid ${AppColors.borderLight}`:'none', cursor:'pointer', textAlign:'left' } },
            React.createElement(Icon, { name:item.icon, size:18, color:AppColors.text2 }),
            React.createElement('span', { style:{ fontSize:14, color:AppColors.text1 } }, item.label),
            React.createElement('div', { style:{ marginLeft:'auto' } }, React.createElement(Icon, { name:'chevronRight', size:14, color:AppColors.text3 }))
          ))
        )
      ))
    )
  );
}

Object.assign(window, { MenuScreen });
