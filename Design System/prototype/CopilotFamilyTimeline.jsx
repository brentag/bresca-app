// AI Copilot, Family Management, Timeline screens

const CHAT_HISTORY = [
  { role:'assistant', text:'¡Hola María! Soy tu Copilot de salud. Puedo ayudarte a entender tus estudios, explicar resultados o preparar preguntas para tu médico. ¿En qué te ayudo hoy?' },
  { role:'user', text:'¿Qué significa que mi glucemia esté en 127 mg/dL?' },
  { role:'assistant', text:'Una glucemia de 127 mg/dL en ayunas está por encima del rango normal (70–100 mg/dL) y entra en la zona de pre-diabetes (100–125 mg/dL) o posiblemente diabetes si se repite en dos mediciones.\n\n⚠️ Esto no es un diagnóstico — te recomiendo consultarlo con tu médico para confirmar con una prueba de HbA1c.\n\n¿Querés que te prepare preguntas para la consulta?' },
];

function CopilotScreen() {
  const [s, d] = useAppState();
  const [msgs, setMsgs] = React.useState(CHAT_HISTORY);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ block: 'nearest' });
  }, [msgs]);

  const suggestions = ['Preparar preguntas para mi médico', 'Explicar mis valores de colesterol', '¿Qué es la hemoglobina glicosilada?'];

  const send = (text) => {
    if (!text.trim()) return;
    const userMsg = { role:'user', text };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      setMsgs(prev => [...prev, { role:'assistant', text: 'Entiendo tu pregunta. Basándome en tu historial clínico, te puedo decir que este es un tema importante que vale la pena explorar con tu médico. ¿Querés que te prepare una lista de preguntas para la consulta?' }]);
      setLoading(false);
    }, 1200);
  };

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Copilot IA', subtitle:'Asistente médico personal',
      action: React.createElement('button', { style:{ background:AppColors.greenLight, border:AppColors.greenBorder, borderRadius:100, padding:'5px 12px', fontSize:11, fontWeight:700, color:AppColors.green, cursor:'pointer' } }, '⚕ No diagnóstica')
    }),

    // Disclaimer
    React.createElement('div', { style:{ background:'#FFFBEB', borderBottom:'1px solid #FDE68A', padding:'8px 14px', flexShrink:0 } },
      React.createElement('p', { style:{ fontSize:11, color:'#92400E', lineHeight:1.5 } }, '⚠️ El Copilot no reemplaza la consulta médica. Siempre validá con un profesional de salud.')
    ),

    // Chat messages
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 } },
      msgs.map((m, i) =>
        React.createElement('div', { key:i, style:{ display:'flex', flexDirection:'column', alignItems: m.role==='user' ? 'flex-end' : 'flex-start', maxWidth:'85%', alignSelf: m.role==='user' ? 'flex-end' : 'flex-start' } },
          React.createElement('div', { style:{ background: m.role==='user' ? AppColors.grad : '#fff', color: m.role==='user' ? '#fff' : AppColors.text1, padding:'10px 13px', borderRadius: m.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize:13, lineHeight:1.6, boxShadow:'0 1px 4px rgba(0,0,0,0.07)', whiteSpace:'pre-line' } }, m.text)
        )
      ),
      loading && React.createElement('div', { style:{ display:'flex', gap:4, padding:'10px 13px', background:'#fff', borderRadius:'16px 16px 16px 4px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)', width:'fit-content' } },
        [0,1,2].map(i => React.createElement('div', { key:i, style:{ width:6, height:6, borderRadius:'50%', background:AppColors.text3, animation:`pulse 1.2s ${i*0.2}s infinite` } }))
      ),
      React.createElement('div', { ref: bottomRef })
    ),

    // Suggestions
    !loading && msgs.length < 4 && React.createElement('div', { style:{ padding:'6px 14px', display:'flex', gap:6, overflowX:'auto', flexShrink:0 } },
      suggestions.map((sg, i) => React.createElement('button', { key:i, onClick:()=>send(sg),
        style:{ flexShrink:0, padding:'6px 12px', borderRadius:100, border:`1.5px solid ${AppColors.border}`, background:'#fff', color:AppColors.text2, fontSize:11, fontWeight:500, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, sg))
    ),

    // Input
    React.createElement('div', { style:{ padding:'10px 12px', background:'#fff', borderTop:`1px solid ${AppColors.borderLight}`, display:'flex', gap:8, flexShrink:0 } },
      React.createElement('input', { value:input, onChange:e=>setInput(e.target.value), onKeyDown:e=>e.key==='Enter' && send(input), placeholder:'Preguntá sobre tus estudios…', style:{ flex:1, padding:'10px 13px', borderRadius:100, border:`1.5px solid ${AppColors.border}`, fontSize:13, fontFamily:"'Space Grotesk',sans-serif", color:AppColors.text1, outline:'none' } }),
      React.createElement('button', { onClick:()=>send(input), disabled:!input.trim(), style:{ width:38, height:38, borderRadius:'50%', background:input.trim() ? AppColors.grad : AppColors.borderLight, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' } },
        React.createElement(Icon, { name:'send', size:16, color: input.trim() ? '#fff' : AppColors.text3 })
      )
    )
  );
}

// ── FAMILY SCREEN ───────────────────────────────────────────────────
const FAMILY_MEMBERS = [
  { id:'me', name:'María García', rel:'Yo', color:AppColors.green, docs:18 },
  { id:'mom', name:'Graciela García', rel:'Mamá, 68 años', color:'#4B6EF5', docs:7 },
  { id:'son', name:'Lucas García', rel:'Hijo, 12 años', color:'#F59E0B', docs:4 },
];

function FamilyScreen() {
  const [s, d] = useAppState();
  const screen = s.screen;
  if (screen === 'family-add') return React.createElement(FamilyAdd, null);
  return React.createElement(FamilyList, null);
}

function FamilyList() {
  const [s, d] = useAppState();
  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Familia', subtitle:'3 perfiles activos',
      action: React.createElement('button', { onClick:()=>d({screen:'family-add'}), style:{ width:32, height:32, borderRadius:'50%', background:AppColors.green, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' } },
        React.createElement(Icon, { name:'plus', size:16, color:'#fff' })
      )
    }),

    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'14px' } },
      React.createElement('p', { style:{ fontSize:12, color:AppColors.text3, marginBottom:12 } }, 'Gestioná el historial médico de toda tu familia desde un solo lugar.'),

      FAMILY_MEMBERS.map(m =>
        React.createElement(Card, { key:m.id, onClick:()=>d({activeFamily:m.id}), style:{ marginBottom:10, cursor:'pointer', border: s.activeFamily===m.id ? `2px solid ${AppColors.green}` : `1px solid ${AppColors.borderLight}` } },
          React.createElement('div', { style:{ display:'flex', gap:12, alignItems:'center' } },
            React.createElement(Avatar, { name:m.name, size:44, color:m.color }),
            React.createElement('div', { style:{ flex:1 } },
              React.createElement('p', { style:{ fontSize:15, fontWeight:700, color:AppColors.text1 } }, m.name),
              React.createElement('p', { style:{ fontSize:12, color:AppColors.text3, marginTop:2 } }, m.rel),
              React.createElement('p', { style:{ fontSize:11, color:AppColors.text2, marginTop:4 } }, `${m.docs} estudios guardados`)
            ),
            s.activeFamily===m.id
              ? React.createElement(Pill, { children:'Activo' })
              : React.createElement(Icon, { name:'chevronRight', size:16, color:AppColors.text3 })
          )
        )
      ),

      React.createElement('div', { style:{ background:'#EEF2FF', borderRadius:12, padding:'12px 14px', marginTop:8 } },
        React.createElement('p', { style:{ fontSize:12, fontWeight:600, color:AppColors.blue, marginBottom:4 } }, '👨‍👩‍👧 ¿Por qué el perfil familiar?'),
        React.createElement('p', { style:{ fontSize:12, color:AppColors.text2, lineHeight:1.6 } }, 'Muchas cuidadoras manejan la salud de toda la familia. Bresca te permite gestionar hasta 6 perfiles desde una sola cuenta.')
      )
    )
  );
}

function FamilyAdd() {
  const [s, d] = useAppState();
  const [name, setName] = React.useState('');
  const [rel, setRel] = React.useState('');
  const rels = ['Pareja', 'Hijo/a', 'Madre', 'Padre', 'Abuelo/a', 'Otro'];

  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement(TopBar, { title:'Agregar familiar', onBack:()=>d({screen:'family'}) }),
    React.createElement('div', { style:{ flex:1, padding:'16px', overflowY:'auto' } },
      React.createElement('div', { style:{ display:'flex', justifyContent:'center', marginBottom:20 } },
        React.createElement('div', { style:{ width:72, height:72, borderRadius:'50%', background:AppColors.greenLight, border:`2px dashed ${AppColors.green}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' } },
          React.createElement(Icon, { name:'plus', size:28, color:AppColors.green })
        )
      ),
      React.createElement('div', { style:{ marginBottom:14 } },
        React.createElement('label', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, display:'block', marginBottom:5, letterSpacing:'0.04em' } }, 'NOMBRE COMPLETO'),
        React.createElement('input', { value:name, onChange:e=>setName(e.target.value), placeholder:'Nombre del familiar', style:{ width:'100%', padding:'12px 13px', borderRadius:10, border:`1.5px solid ${AppColors.border}`, fontSize:14, fontFamily:"'Space Grotesk',sans-serif", color:AppColors.text1, outline:'none', boxSizing:'border-box' } })
      ),
      React.createElement('div', { style:{ marginBottom:20 } },
        React.createElement('label', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, display:'block', marginBottom:6, letterSpacing:'0.04em' } }, 'RELACIÓN'),
        React.createElement('div', { style:{ display:'flex', flexWrap:'wrap', gap:6 } },
          rels.map(r => React.createElement('button', { key:r, onClick:()=>setRel(r), style:{ padding:'6px 14px', borderRadius:100, border:`1.5px solid ${rel===r ? AppColors.blue : AppColors.border}`, background:rel===r ? AppColors.blueLight : 'transparent', color:rel===r ? AppColors.blue : AppColors.text2, fontSize:12, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, r))
        )
      ),
      React.createElement('div', { style:{ background:AppColors.bg, borderRadius:10, padding:'12px 14px', marginBottom:20 } },
        React.createElement('p', { style:{ fontSize:12, color:AppColors.text2, lineHeight:1.6 } }, '🔒 El familiar recibirá una invitación para aprobar el acceso. Podés revocar el acceso en cualquier momento.')
      ),
      React.createElement('button', { onClick:()=>d({screen:'family'}), disabled:!name||!rel, style:{ width:'100%', padding:'14px', borderRadius:100, background: name&&rel ? AppColors.grad : AppColors.borderLight, border:'none', color: name&&rel ? '#fff' : AppColors.text3, fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor: name&&rel ? 'pointer' : 'default' } }, 'Invitar al familiar')
    )
  );
}

// ── TIMELINE SCREEN ──────────────────────────────────────────────────
const TIMELINE_EVENTS = [
  { date:'15 Mar 2024', type:'lab', label:'Análisis de Sangre', icon:'activity', color:AppColors.green, detail:'Glucemia 127 mg/dL', alert:true },
  { date:'2 Feb 2024', type:'image', label:'Rx Tórax AP', icon:'eye', color:AppColors.blue, detail:'Sin alteraciones' },
  { date:'18 Jan 2024', type:'cardio', label:'Ecocardiograma', icon:'heart', color:AppColors.teal, detail:'FE 62%, Normal' },
  { date:'10 Jan 2024', type:'med', label:'Metformina 500mg', icon:'shield', color:'#F59E0B', detail:'Inicio de medicación' },
  { date:'5 Nov 2023', type:'lab', label:'HbA1c', icon:'activity', color:AppColors.green, detail:'6.8%', alert:true },
  { date:'12 Sep 2023', type:'consult', label:'Consulta Endocrinología', icon:'users', color:'#94A3B8', detail:'Dr. Pérez — seguimiento' },
];

function TimelineScreen() {
  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, { title:'Timeline', subtitle:'Tu historia clínica completa' }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'12px 14px' } },
      TIMELINE_EVENTS.map((ev, i) =>
        React.createElement('div', { key:i, style:{ display:'flex', gap:12, marginBottom:0 } },
          // Timeline line
          React.createElement('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 } },
            React.createElement('div', { style:{ width:36, height:36, borderRadius:'50%', background:ev.color+'18', border:`2px solid ${ev.color}33`, display:'flex', alignItems:'center', justifyContent:'center' } },
              React.createElement(Icon, { name:ev.icon, size:16, color:ev.color })
            ),
            i < TIMELINE_EVENTS.length-1 && React.createElement('div', { style:{ width:2, flex:1, background:AppColors.borderLight, minHeight:20, margin:'4px 0' } })
          ),
          // Content
          React.createElement('div', { style:{ flex:1, paddingBottom:16 } },
            React.createElement('p', { style:{ fontSize:11, color:AppColors.text3, marginBottom:3 } }, ev.date),
            React.createElement('div', { style:{ background:'#fff', borderRadius:12, padding:'11px 13px', border:`1px solid ${ev.alert ? AppColors.warn+'44' : AppColors.borderLight}` } },
              React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center' } },
                React.createElement('p', { style:{ fontSize:13, fontWeight:600, color:AppColors.text1 } }, ev.label),
                ev.alert && React.createElement('div', { style:{ width:8, height:8, borderRadius:'50%', background:AppColors.warn } })
              ),
              React.createElement('p', { style:{ fontSize:11, color:AppColors.text2, marginTop:2 } }, ev.detail)
            )
          )
        )
      )
    )
  );
}

Object.assign(window, { CopilotScreen, FamilyScreen, TimelineScreen });
