// AI Copilot, Timeline, Family, Sharing, Consent, Study Invitation, Settings

const CHAT_INIT = [
  { from:'ai', text:'Hola María 👋 Soy tu Copilot de salud. Puedo ayudarte a entender tus estudios, revisar valores o preparar preguntas para tu próxima consulta. ¿En qué te ayudo?' },
];

function CopilotScreen() {
  const [s, d] = useAppState();
  const [messages, setMessages] = React.useState(CHAT_INIT);
  const [input, setInput] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const bottomRef = React.useRef(null);

  const ANSWERS = {
    'glucemia': 'Tu glucemia en **127 mg/dL** está ligeramente elevada — el rango normal en ayunas es de 70–100 mg/dL. Un valor entre 100–125 puede indicar *pre-diabetes*. Te recomiendo comentarlo con tu médico en la próxima consulta. ¿Querés que te ayude a preparar las preguntas?',
    'colesterol': 'Tu colesterol total es **198 mg/dL**, que se considera *borderline* (límite aceptable es <200). Lo importante es revisar el HDL (colesterol bueno) y LDL por separado. ¿Tenés ese desglose en el informe?',
    default: 'Entendido. Basado en tu historial, puedo ver que tenés análisis de sangre recientes y una radiografía de tórax. ¿Querés que revise algún valor específico o te explique algún término del informe?'
  };

  const send = () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    setMessages(m => [...m, { from:'user', text:msg }]);
    setTyping(true);
    setTimeout(() => {
      const key = Object.keys(ANSWERS).find(k => msg.toLowerCase().includes(k));
      setMessages(m => [...m, { from:'ai', text: ANSWERS[key || 'default'] }]);
      setTyping(false);
    }, 1200);
  };

  React.useEffect(() => { bottomRef.current?.scrollIntoView?.(); }, [messages, typing]);

  const SUGGESTIONS = ['¿Qué significa glucemia 127?','¿Debo preocuparme por el colesterol?','Preparar preguntas para mi médico'];

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Copilot IA', subtitle:'Tu asistente de salud personal' }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'12px 14px' } },
      messages.map((m, i) =>
        React.createElement('div', { key:i, style:{ display:'flex', justifyContent:m.from==='user'?'flex-end':'flex-start', marginBottom:10 } },
          m.from==='ai' && React.createElement('div', { style:{ width:28, height:28, borderRadius:'50%', background:AppColors.grad, display:'flex', alignItems:'center', justifyContent:'center', marginRight:8, flexShrink:0, alignSelf:'flex-end' } },
            React.createElement(Icon, { name:'zap', size:13, color:'#fff' })
          ),
          React.createElement('div', { style:{ maxWidth:'78%', padding:'10px 13px', borderRadius: m.from==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.from==='user' ? AppColors.grad : '#fff', color: m.from==='user' ? '#fff' : AppColors.text1, fontSize:13, lineHeight:1.6, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' } },
            m.text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
          )
        )
      ),
      typing && React.createElement('div', { style:{ display:'flex', gap:8, marginBottom:10 } },
        React.createElement('div', { style:{ width:28, height:28, borderRadius:'50%', background:AppColors.grad, display:'flex', alignItems:'center', justifyContent:'center', marginRight:8, flexShrink:0 } },
          React.createElement(Icon, { name:'zap', size:13, color:'#fff' })
        ),
        React.createElement('div', { style:{ padding:'10px 14px', borderRadius:'16px 16px 16px 4px', background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' } },
          React.createElement('div', { style:{ display:'flex', gap:4 } },
            [0,1,2].map(i => React.createElement('div', { key:i, style:{ width:6, height:6, borderRadius:'50%', background:AppColors.text3, animation:`bounce ${800}ms ${i*150}ms infinite` } }))
          )
        )
      ),
      React.createElement('div', { ref:bottomRef })
    ),
    // Suggestions
    messages.length <= 1 && React.createElement('div', { style:{ padding:'0 12px 8px', display:'flex', flexWrap:'wrap', gap:6 } },
      SUGGESTIONS.map((sg, i) => React.createElement('button', { key:i, onClick:()=>{ setInput(sg); },
        style:{ padding:'6px 12px', borderRadius:100, background:AppColors.bg, border:`1px solid ${AppColors.border}`, fontSize:11, color:AppColors.text2, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, sg))
    ),
    // Input bar
    React.createElement('div', { style:{ padding:'10px 12px', background:'#fff', borderTop:`1px solid ${AppColors.borderLight}`, display:'flex', gap:8, alignItems:'center', flexShrink:0 } },
      React.createElement('input', { value:input, onChange:e=>setInput(e.target.value), onKeyDown:e=>e.key==='Enter'&&send(), placeholder:'Preguntale al Copilot…', style:{ flex:1, padding:'10px 14px', borderRadius:100, border:`1.5px solid ${AppColors.border}`, fontSize:14, fontFamily:"'Space Grotesk',sans-serif", color:AppColors.text1, outline:'none', background:AppColors.bg } }),
      React.createElement('button', { onClick:send, style:{ width:40, height:40, borderRadius:'50%', background:AppColors.grad, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' } },
        React.createElement(Icon, { name:'send', size:17, color:'#fff' })
      )
    )
  );
}

function TimelineScreen() {
  const [s, d] = useAppState();
  const events = [
    { date:'Mar 2024', color:AppColors.green, icon:'file', title:'Análisis de Sangre', note:'Glucemia levemente elevada' },
    { date:'Feb 2024', color:AppColors.blue, icon:'camera', title:'Radiografía Tórax', note:'Sin alteraciones' },
    { date:'Ene 2024', color:AppColors.teal, icon:'heart', title:'Ecocardiograma', note:'FE 62% — normal' },
    { date:'Ene 2024', color:AppColors.warn, icon:'file', title:'Receta Metformina', note:'500mg — 1 vez/día' },
    { date:'Dic 2023', color:AppColors.green, icon:'activity', title:'Control Glucemia', note:'HbA1c: 6.1%' },
    { date:'Oct 2023', color:AppColors.blue, icon:'file', title:'Consulta Cardiología', note:'Control anual' },
  ];

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Mi Timeline', subtitle:'Tu historia clínica en orden' }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'14px 16px' } },
      events.map((ev, i) =>
        React.createElement('div', { key:i, style:{ display:'flex', gap:12, marginBottom:16, alignItems:'flex-start' } },
          React.createElement('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center' } },
            React.createElement('div', { style:{ width:36, height:36, borderRadius:'50%', background:ev.color+'18', border:`2px solid ${ev.color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } },
              React.createElement(Icon, { name:ev.icon, size:15, color:ev.color })
            ),
            i < events.length-1 && React.createElement('div', { style:{ width:2, height:24, background:AppColors.borderLight, margin:'4px 0' } })
          ),
          React.createElement('div', { style:{ flex:1, paddingTop:4 } },
            React.createElement('p', { style:{ fontSize:11, color:AppColors.text3, marginBottom:2 } }, ev.date),
            React.createElement('p', { style:{ fontSize:14, fontWeight:600, color:AppColors.text1 } }, ev.title),
            React.createElement('p', { style:{ fontSize:12, color:AppColors.text2 } }, ev.note)
          )
        )
      )
    )
  );
}

function FamilyScreen() {
  const [s, d] = useAppState();
  const [view, setView] = React.useState('list'); // list | add
  const members = [
    { name:'María García', rel:'Yo', color:AppColors.green, docs:18 },
    { name:'Carlos García', rel:'Padre', color:AppColors.blue, docs:7 },
    { name:'Sofía García', rel:'Hija (8 años)', color:'#F59E0B', docs:4 },
  ];
  if (view === 'add') return React.createElement(AddMember, { onBack:()=>setView('list') });

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Familia', subtitle:'3 perfiles activos',
      action: React.createElement('button', { onClick:()=>setView('add'), style:{ width:32, height:32, borderRadius:'50%', background:AppColors.blue, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' } },
        React.createElement(Icon, { name:'plus', size:16, color:'#fff' })
      )
    }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'14px' } },
      React.createElement('p', { style:{ fontSize:13, color:AppColors.text2, marginBottom:12 } }, 'Administrá el historial de tus familiares desde un solo lugar.'),
      members.map((m, i) =>
        React.createElement(Card, { key:i, style:{ marginBottom:10, display:'flex', gap:12, alignItems:'center', cursor:'pointer' } },
          React.createElement('div', { style:{ position:'relative' } },
            React.createElement(Avatar, { name:m.name, size:48, color:m.color }),
            i===0 && React.createElement('div', { style:{ position:'absolute', bottom:-2, right:-2, width:14, height:14, borderRadius:'50%', background:AppColors.green, border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center' } },
              React.createElement(Icon, { name:'check', size:7, color:'#fff' })
            )
          ),
          React.createElement('div', { style:{ flex:1 } },
            React.createElement('p', { style:{ fontSize:15, fontWeight:600, color:AppColors.text1 } }, m.name),
            React.createElement('p', { style:{ fontSize:12, color:AppColors.text3 } }, `${m.rel} · ${m.docs} estudios`),
          ),
          React.createElement(Icon, { name:'chevronRight', size:16, color:AppColors.text3 })
        )
      ),
      React.createElement(Card, { onClick:()=>setView('add'), style:{ display:'flex', gap:12, alignItems:'center', cursor:'pointer', border:`1.5px dashed ${AppColors.border}`, background:'transparent', boxShadow:'none' } },
        React.createElement('div', { style:{ width:48, height:48, borderRadius:'50%', background:AppColors.bg, border:`1.5px dashed ${AppColors.border}`, display:'flex', alignItems:'center', justifyContent:'center' } },
          React.createElement(Icon, { name:'plus', size:22, color:AppColors.text3 })
        ),
        React.createElement('div', null,
          React.createElement('p', { style:{ fontSize:14, fontWeight:600, color:AppColors.text2 } }, 'Agregar familiar'),
          React.createElement('p', { style:{ fontSize:12, color:AppColors.text3 } }, 'Hijo, padre, pareja…')
        )
      )
    )
  );
}

function AddMember({ onBack }) {
  const [name, setName] = React.useState('');
  const [rel, setRel] = React.useState('');
  const rels = ['Pareja','Hijo/a','Padre/Madre','Hermano/a','Otro'];
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement(TopBar, { title:'Agregar familiar', onBack }),
    React.createElement('div', { style:{ flex:1, padding:'16px', display:'flex', flexDirection:'column', gap:14 } },
      React.createElement('div', { style:{ width:72, height:72, borderRadius:'50%', background:AppColors.bg, border:`2px dashed ${AppColors.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px' } },
        React.createElement(Icon, { name:'camera', size:28, color:AppColors.text3 })
      ),
      React.createElement('div', null,
        React.createElement('label', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, display:'block', marginBottom:5, letterSpacing:'0.04em' } }, 'NOMBRE COMPLETO'),
        React.createElement('input', { value:name, onChange:e=>setName(e.target.value), placeholder:'ej. Carlos García', style:{ width:'100%', padding:'11px 13px', borderRadius:10, border:`1.5px solid ${AppColors.border}`, fontSize:14, fontFamily:"'Space Grotesk',sans-serif", color:AppColors.text1, outline:'none', boxSizing:'border-box' } })
      ),
      React.createElement('div', null,
        React.createElement('label', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, display:'block', marginBottom:6, letterSpacing:'0.04em' } }, 'RELACIÓN'),
        React.createElement('div', { style:{ display:'flex', flexWrap:'wrap', gap:8 } },
          rels.map(r => React.createElement('button', { key:r, onClick:()=>setRel(r), style:{ padding:'7px 14px', borderRadius:100, border:`1.5px solid ${rel===r ? AppColors.blue : AppColors.border}`, background:rel===r ? AppColors.blueLight : 'transparent', color:rel===r ? AppColors.blue : AppColors.text2, fontSize:13, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, r))
        )
      ),
      React.createElement('div', { style:{ background:'#FFF7ED', borderRadius:12, padding:'12px 14px', display:'flex', gap:8 } },
        React.createElement(Icon, { name:'info', size:14, color:AppColors.warn }),
        React.createElement('p', { style:{ fontSize:12, color:'#92400E', lineHeight:1.5 } }, 'El familiar recibirá un correo para confirmar el acceso. Vos tendrás control total sobre qué podés ver.')
      ),
      React.createElement('button', { onClick:onBack, style:{ marginTop:'auto', width:'100%', padding:'14px', borderRadius:100, background:AppColors.grad, border:'none', color:'#fff', fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Agregar familiar →')
    )
  );
}

function SharingScreen() {
  const [s, d] = useAppState();
  const [generated, setGenerated] = React.useState(false);
  const [hours, setHours] = React.useState(48);

  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement(TopBar, { title:'Compartir vía QR', onBack:()=>d({screen:'home', tab:'home'}) }),
    React.createElement('div', { style:{ flex:1, padding:'16px', display:'flex', flexDirection:'column', gap:14 } },
      !generated ? React.createElement(React.Fragment, null,
        React.createElement('p', { style:{ fontSize:13, color:AppColors.text2 } }, 'Generá un acceso temporal para que tu médico vea los estudios que vos elijas.'),
        React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:8 } },
          SAMPLE_DOCS.slice(0,3).map((doc, i) =>
            React.createElement(Card, { key:i, style:{ display:'flex', gap:10, alignItems:'center' } },
              React.createElement('input', { type:'checkbox', defaultChecked:i<2, style:{ width:16, height:16, accentColor:AppColors.green } }),
              React.createElement(Icon, { name:'file', size:16, color:doc.color }),
              React.createElement('span', { style:{ fontSize:13, color:AppColors.text1, flex:1 } }, doc.name)
            )
          )
        ),
        React.createElement('div', null,
          React.createElement('label', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, display:'block', marginBottom:8, letterSpacing:'0.04em' } }, `DURACIÓN DEL ACCESO: ${hours}hs`),
          React.createElement('input', { type:'range', min:1, max:168, value:hours, onChange:e=>setHours(+e.target.value), style:{ width:'100%', accentColor:AppColors.green } })
        ),
        React.createElement('button', { onClick:()=>setGenerated(true), style:{ width:'100%', padding:'14px', borderRadius:100, background:AppColors.grad, border:'none', color:'#fff', fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Generar QR →')
      ) : React.createElement('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center' } },
        React.createElement('div', { style:{ width:160, height:160, borderRadius:16, background:AppColors.bg, border:`2px solid ${AppColors.greenBorder}`, display:'flex', alignItems:'center', justifyContent:'center', padding:16 } },
          React.createElement(Icon, { name:'qr', size:120, color:AppColors.text1 })
        ),
        React.createElement('div', null,
          React.createElement('p', { style:{ fontSize:15, fontWeight:700, color:AppColors.text1, marginBottom:4 } }, 'QR listo'),
          React.createElement('p', { style:{ fontSize:13, color:AppColors.text2 } }, `Válido por ${hours}hs · Solo lectura`),
          React.createElement(Pill, { children:'2 estudios seleccionados', style:{ marginTop:8 } })
        ),
        React.createElement('div', { style:{ background:'#F0FDF4', borderRadius:12, padding:'12px 16px', width:'100%', border:`1px solid ${AppColors.greenBorder}` } },
          React.createElement('p', { style:{ fontSize:12, color:'#166534', lineHeight:1.6 } }, '✓ El médico no necesita registrarse\n✓ No puede descargar ni compartir\n✓ El acceso expira automáticamente')
        ),
        React.createElement('button', { onClick:()=>setGenerated(false), style:{ fontSize:13, color:AppColors.text3, background:'none', border:'none', cursor:'pointer', textDecoration:'underline', fontFamily:"'Space Grotesk',sans-serif" } }, 'Generar otro QR')
      )
    )
  );
}

function ConsentScreen() {
  const [s, d] = useAppState();
  const [areas, setAreas] = React.useState({ 'Diabetes tipo 2': true, 'Oncología': false, 'Cardiología': true, 'Salud mental': false, 'Enfermedades raras': false });
  const toggle = (k) => setAreas(a => ({ ...a, [k]: !a[k] }));

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Centro de Consentimiento', onBack:()=>d({screen:'home', tab:'home'}) }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'14px' } },
      React.createElement(Card, { style:{ background:'rgba(75,110,245,0.05)', border:`1px solid ${AppColors.blueBorder}`, marginBottom:14 } },
        React.createElement('div', { style:{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' } },
          React.createElement(Icon, { name:'shield', size:16, color:AppColors.blue }),
          React.createElement('div', null,
            React.createElement('p', { style:{ fontSize:13, fontWeight:700, color:AppColors.text1 } }, '¿Cómo se usan tus datos?'),
            React.createElement('p', { style:{ fontSize:12, color:AppColors.text2, lineHeight:1.6, marginTop:4 } }, 'Tus datos siempre son anonimizados antes de compartirse. Nunca se identifican individualmente. Podés revocar en cualquier momento sin consecuencias.')
          )
        )
      ),
      React.createElement('h3', { style:{ fontSize:13, fontWeight:600, color:AppColors.text2, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 } }, 'Áreas terapéuticas'),
      Object.entries(areas).map(([k, v]) =>
        React.createElement(Card, { key:k, style:{ marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' } },
          React.createElement('div', null,
            React.createElement('p', { style:{ fontSize:14, fontWeight:600, color:AppColors.text1 } }, k),
            React.createElement('p', { style:{ fontSize:11, color:AppColors.text3, marginTop:1 } }, v ? 'Participando — podés recibir invitaciones' : 'No participando')
          ),
          React.createElement('button', { onClick:()=>toggle(k), style:{ width:44, height:24, borderRadius:100, background:v ? AppColors.green : AppColors.border, border:'none', cursor:'pointer', position:'relative', transition:'background 200ms' } },
            React.createElement('div', { style:{ position:'absolute', top:3, left: v ? 23 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 200ms', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' } })
          )
        )
      ),
      React.createElement('div', { style:{ marginTop:8, padding:'12px 14px', background:AppColors.bg, borderRadius:12, border:`1px solid ${AppColors.border}` } },
        React.createElement('p', { style:{ fontSize:12, color:AppColors.text2, lineHeight:1.6 } }, 'Cualquier cambio se aplica de inmediato. Los estudios que ya enviaste a investigaciones activas no se ven afectados.')
      )
    )
  );
}

function StudyInviteScreen() {
  const [s, d] = useAppState();
  const [step, setStep] = React.useState(0);
  if (step === 1) return React.createElement(StudyAccepted, { onDone:()=>d({screen:'home', tab:'home'}) });
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement(TopBar, { title:'Invitación a estudio', onBack:()=>d({screen:'home', tab:'home'}) }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12 } },
      React.createElement(Pill, { children:'Nuevo estudio clínico', style:{ alignSelf:'flex-start' } }),
      React.createElement('h2', { style:{ fontSize:20, fontWeight:700, color:AppColors.text1, lineHeight:1.25 } }, 'Estudio de Diabetes Tipo 2 en LATAM'),
      React.createElement('div', { style:{ display:'flex', gap:8, flexWrap:'wrap' } },
        ['CRO: Syneos Health','Argentina · Presencial','Compensación: $5,000 ARS'].map((t,i) => React.createElement('span', { key:i, style:{ fontSize:11, padding:'3px 10px', borderRadius:100, background:AppColors.bg, color:AppColors.text2, border:`1px solid ${AppColors.border}` } }, t))
      ),
      React.createElement(Card, { style:{ background:AppColors.bg } },
        React.createElement('p', { style:{ fontSize:13, fontWeight:600, color:AppColors.text2, marginBottom:6, letterSpacing:'0.04em', textTransform:'uppercase' } }, '¿De qué se trata?'),
        React.createElement('p', { style:{ fontSize:13, color:AppColors.text1, lineHeight:1.7 } }, 'Estudio observacional de 12 semanas sobre el control glucémico en pacientes con diabetes tipo 2. No requiere cambios en tu medicación actual. Solo compartís datos que ya tenés en tu Vault.')
      ),
      [['¿Tengo que cambiar mi tratamiento?','No. Es un estudio observacional — solo analizamos datos que ya tenés.'],['¿Qué datos se comparten?','Solo los que vos autorizás: glucemias, HbA1c, medicación. Nada más.'],['¿Puedo salirme?','Sí, en cualquier momento y sin consecuencias.']].map(([q,a],i) =>
        React.createElement(Card, { key:i, style:{ padding:'12px 14px' } },
          React.createElement('p', { style:{ fontSize:13, fontWeight:600, color:AppColors.text1, marginBottom:4 } }, q),
          React.createElement('p', { style:{ fontSize:12, color:AppColors.text2, lineHeight:1.55 } }, a)
        )
      ),
      React.createElement('div', { style:{ display:'flex', gap:10, marginTop:8 } },
        React.createElement('button', { onClick:()=>setStep(1), style:{ flex:1, padding:'14px', borderRadius:100, background:AppColors.grad, border:'none', color:'#fff', fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Me interesa →'),
        React.createElement('button', { onClick:()=>d({screen:'home', tab:'home'}), style:{ flex:1, padding:'14px', borderRadius:100, background:'transparent', border:`1.5px solid ${AppColors.border}`, color:AppColors.text2, fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Declinar')
      )
    )
  );
}

function StudyAccepted({ onDone }) {
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', textAlign:'center' } },
      React.createElement('div', { style:{ width:80, height:80, borderRadius:24, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, border:`2px solid ${AppColors.greenBorder}` } },
        React.createElement(Icon, { name:'check', size:36, color:AppColors.green })
      ),
      React.createElement('h2', { style:{ fontSize:22, fontWeight:700, color:AppColors.text1, marginBottom:10 } }, '¡Gracias por participar!'),
      React.createElement('p', { style:{ fontSize:14, color:AppColors.text2, lineHeight:1.7, maxWidth:280, marginBottom:28 } }, 'Un coordinador del estudio te va a contactar en las próximas 48hs para los próximos pasos. Podés revocar tu participación en cualquier momento desde el Centro de Consentimiento.'),
      React.createElement('button', { onClick:onDone, style:{ width:'100%', maxWidth:280, padding:'14px', borderRadius:100, background:AppColors.grad, border:'none', color:'#fff', fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Volver al inicio')
    )
  );
}

function MenuScreen() {
  const [s, d] = useAppState();
  const sc = s.screen;
  if (sc === 'timeline') return React.createElement(TimelineScreen, null);
  if (sc === 'sharing') return React.createElement(SharingScreen, null);
  if (sc === 'consent') return React.createElement(ConsentScreen, null);
  if (sc === 'study-invite') return React.createElement(StudyInviteScreen, null);
  if (sc === 'settings') return React.createElement(SettingsScreen, null);

  const items = [
    { icon:'clock', label:'Timeline de salud', sub:'Tu historia clínica ordenada', action:()=>d({screen:'timeline'}) },
    { icon:'share', label:'Compartir vía QR', sub:'Acceso temporal para tu médico', action:()=>d({screen:'sharing'}) },
    { icon:'flasklg', label:'Centro de Consentimiento', sub:'Gestioná tu participación en estudios', action:()=>d({screen:'consent'}), badge:'1 nuevo' },
    { icon:'bell', label:'Invitaciones a estudios', sub:'Tenés 1 invitación pendiente', action:()=>d({screen:'study-invite'}), badge:'1' },
    { icon:'settings', label:'Configuración y privacidad', sub:'Cuenta, datos, notificaciones', action:()=>d({screen:'settings'}) },
  ];

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Más opciones' }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'12px 14px' } },
      React.createElement('div', { style:{ display:'flex', gap:10, alignItems:'center', marginBottom:16 } },
        React.createElement(Avatar, { name:'María García', size:44 }),
        React.createElement('div', null,
          React.createElement('p', { style:{ fontSize:16, fontWeight:700, color:AppColors.text1 } }, 'María García'),
          React.createElement('p', { style:{ fontSize:12, color:AppColors.text3 } }, 'maria@email.com · Plan Free')
        )
      ),
      items.map((item, i) =>
        React.createElement('button', { key:i, onClick:item.action, style:{ width:'100%', display:'flex', gap:12, alignItems:'center', background:'#fff', borderRadius:14, padding:'14px 12px', marginBottom:8, border:`1px solid ${AppColors.borderLight}`, cursor:'pointer', textAlign:'left', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' } },
          React.createElement('div', { style:{ width:40, height:40, borderRadius:10, background:AppColors.greenLight, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } },
            React.createElement(Icon, { name:item.icon, size:20, color:AppColors.green })
          ),
          React.createElement('div', { style:{ flex:1 } },
            React.createElement('p', { style:{ fontSize:14, fontWeight:600, color:AppColors.text1 } }, item.label),
            React.createElement('p', { style:{ fontSize:12, color:AppColors.text3 } }, item.sub)
          ),
          item.badge && React.createElement('span', { style:{ fontSize:11, fontWeight:700, background:AppColors.green, color:'#fff', borderRadius:100, padding:'2px 8px' } }, item.badge),
          React.createElement(Icon, { name:'chevronRight', size:14, color:AppColors.text3 })
        )
      )
    )
  );
}

function SettingsScreen() {
  const [s, d] = useAppState();
  const sections = [
    { label:'Cuenta', items:['Datos personales','Cambiar contraseña','Idioma y región'] },
    { label:'Privacidad y datos', items:['Mis datos — qué guardamos','Exportar mi información','Eliminar cuenta'] },
    { label:'Notificaciones', items:['Recordatorios de estudios','Invitaciones a investigación','Novedades de Bresca'] },
  ];
  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Configuración', onBack:()=>d({screen:'home', tab:'home'}) }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'12px 14px' } },
      sections.map((sec, si) =>
        React.createElement('div', { key:si, style:{ marginBottom:20 } },
          React.createElement('p', { style:{ fontSize:11, fontWeight:600, color:AppColors.text3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6, paddingLeft:4 } }, sec.label),
          React.createElement('div', { style:{ background:'#fff', borderRadius:14, border:`1px solid ${AppColors.borderLight}`, overflow:'hidden' } },
            sec.items.map((item, ii) =>
              React.createElement('div', { key:ii, style:{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 14px', borderBottom: ii < sec.items.length-1 ? `1px solid ${AppColors.borderLight}` : 'none' } },
                React.createElement('span', { style:{ fontSize:14, color:AppColors.text1 } }, item),
                React.createElement(Icon, { name:'chevronRight', size:14, color:AppColors.text3 })
              )
            )
          )
        )
      )
    )
  );
}

Object.assign(window, { CopilotScreen, TimelineScreen, FamilyScreen, MenuScreen });
