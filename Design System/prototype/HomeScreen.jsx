// Home Dashboard + Tab Bar

const SAMPLE_DOCS = [
  { id:1, type:'Análisis', name:'Análisis de Sangre Completo', date:'15 Mar 2024', lab:'Stamboulian', color:'#00C87A', tag:'Laboratorio', values:[{k:'Glucemia',v:'127 mg/dL',alert:true},{k:'Colesterol',v:'198 mg/dL',alert:false},{k:'Hemoglobina',v:'14.2 g/dL',alert:false}] },
  { id:2, type:'Imagen', name:'Radiografía de Tórax AP', date:'2 Feb 2024', lab:'Centro Diagnóstico', color:'#4B6EF5', tag:'Imagen', values:[{k:'Resultado',v:'Sin alteraciones agudas',alert:false}] },
  { id:3, type:'Informe', name:'Ecocardiograma', date:'18 Jan 2024', lab:'Cardiopatía Integral', color:'#00B8D4', tag:'Cardiología', values:[{k:'FE',v:'62%',alert:false},{k:'VI',v:'Normal',alert:false}] },
  { id:4, type:'Receta', name:'Receta Metformina 500mg', date:'10 Jan 2024', lab:'Dr. García', color:'#F59E0B', tag:'Medicación', values:[] },
];

function TabBar({ active, onTab }) {
  const tabs = [
    { id:'home', icon:'home', label:'Inicio' },
    { id:'vault', icon:'folder', label:'Vault' },
    { id:'copilot', icon:'zap', label:'Copilot' },
    { id:'family', icon:'users', label:'Familia' },
    { id:'menu', icon:'menu', label:'Más' },
  ];
  return React.createElement('div', {
    style:{ display:'flex', background:'#fff', borderTop:'1px solid #F0F4FA', paddingBottom:'env(safe-area-inset-bottom,4px)', flexShrink:0 }
  },
    tabs.map(t => React.createElement('button', {
      key: t.id, onClick: () => onTab(t.id),
      style:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'10px 4px 6px', background:'none', border:'none', cursor:'pointer', gap:3 }
    },
      React.createElement(Icon, { name:t.icon, size:22, color: active===t.id ? AppColors.green : AppColors.text3 }),
      React.createElement('span', { style:{ fontSize:10, fontWeight: active===t.id ? 600 : 400, color: active===t.id ? AppColors.green : AppColors.text3 } }, t.label)
    ))
  );
}

function HomeScreen() {
  const [s, d] = useAppState();
  const quickActions = [
    { icon:'upload', label:'Subir estudio', action:()=>d({tab:'vault', screen:'upload-1'}) },
    { icon:'zap', label:'Preguntar al Copilot', action:()=>d({tab:'copilot', screen:'copilot'}) },
    { icon:'share', label:'Compartir vía QR', action:()=>d({tab:'menu', screen:'sharing'}) },
    { icon:'clock', label:'Ver timeline', action:()=>d({tab:'menu', screen:'timeline'}) },
  ];

  return React.createElement(ScreenWrapper, null,
    // Header
    React.createElement('div', { style:{ background:'#fff', padding:'14px 16px 12px', borderBottom:'1px solid #F0F4FA', flexShrink:0 } },
      React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center' } },
        React.createElement('div', null,
          React.createElement('p', { style:{ fontSize:12, color:AppColors.text3, marginBottom:2 } }, 'Buenos días,'),
          React.createElement('h1', { style:{ fontSize:20, fontWeight:700, color:AppColors.text1 } }, 'María 👋'),
        ),
        React.createElement('div', { style:{ display:'flex', gap:10, alignItems:'center' } },
          React.createElement('button', { onClick:()=>d({tab:'menu', screen:'study-invite'}), style:{ background:'none', border:'none', cursor:'pointer', position:'relative' } },
            React.createElement(Icon, { name:'bell', size:22, color:AppColors.text2 }),
            React.createElement('div', { style:{ position:'absolute', top:-2, right:-2, width:8, height:8, borderRadius:'50%', background:AppColors.green } })
          ),
          React.createElement(Avatar, { name:'María G', size:34 })
        )
      )
    ),

    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'12px 14px 8px' } },
      // Stats strip
      React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 } },
        [['18', 'estudios', AppColors.green], ['3', 'compartidos', AppColors.blue], ['7 meses', 'de historia', AppColors.teal]].map(([v, l, c]) =>
          React.createElement(Card, { key:l, style:{ padding:'12px 10px', textAlign:'center' } },
            React.createElement('div', { style:{ fontSize:18, fontWeight:700, color:c, lineHeight:1 } }, v),
            React.createElement('div', { style:{ fontSize:10, color:AppColors.text3, marginTop:3 } }, l)
          )
        )
      ),

      // Study invite banner
      React.createElement(Card, { onClick:()=>d({tab:'menu', screen:'study-invite'}), style:{ marginBottom:14, background:'linear-gradient(135deg,#EEF2FF,#F0FDF4)', border:`1px solid ${AppColors.greenBorder}`, cursor:'pointer' } },
        React.createElement('div', { style:{ display:'flex', gap:10, alignItems:'flex-start' } },
          React.createElement('div', { style:{ width:36, height:36, borderRadius:10, background:AppColors.greenLight, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } },
            React.createElement(Icon, { name:'flasklg', size:18, color:AppColors.green })
          ),
          React.createElement('div', null,
            React.createElement(Pill, { children:'Invitación a estudio', style:{ fontSize:10, marginBottom:4 } }),
            React.createElement('p', { style:{ fontSize:13, fontWeight:600, color:AppColors.text1 } }, 'Estudio de Diabetes Tipo 2 — LATAM'),
            React.createElement('p', { style:{ fontSize:11, color:AppColors.text2, marginTop:2 } }, 'Tu perfil es compatible. Tap para ver detalles →')
          )
        )
      ),

      // Quick actions
      React.createElement('h2', { style:{ fontSize:13, fontWeight:600, color:AppColors.text2, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 } }, 'Acciones rápidas'),
      React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 } },
        quickActions.map((a, i) =>
          React.createElement(Card, { key:i, onClick:a.action, style:{ display:'flex', flexDirection:'column', gap:8, cursor:'pointer' } },
            React.createElement('div', { style:{ width:36, height:36, borderRadius:10, background:AppColors.greenLight, display:'flex', alignItems:'center', justifyContent:'center' } },
              React.createElement(Icon, { name:a.icon, size:18, color:AppColors.green })
            ),
            React.createElement('span', { style:{ fontSize:13, fontWeight:600, color:AppColors.text1, lineHeight:1.3 } }, a.label)
          )
        )
      ),

      // Recent docs
      React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 } },
        React.createElement('h2', { style:{ fontSize:13, fontWeight:600, color:AppColors.text2, letterSpacing:'0.06em', textTransform:'uppercase' } }, 'Estudios recientes'),
        React.createElement('button', { onClick:()=>d({tab:'vault', screen:'vault'}), style:{ background:'none', border:'none', fontSize:12, color:AppColors.green, cursor:'pointer', fontWeight:600 } }, 'Ver todos')
      ),
      SAMPLE_DOCS.slice(0,3).map(doc =>
        React.createElement(Card, { key:doc.id, onClick:()=>d({tab:'vault', screen:'vault-detail', selectedDoc:doc}), style:{ display:'flex', gap:10, alignItems:'center', marginBottom:8, cursor:'pointer' } },
          React.createElement('div', { style:{ width:38, height:38, borderRadius:10, background:doc.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } },
            React.createElement(Icon, { name:'file', size:18, color:doc.color })
          ),
          React.createElement('div', { style:{ flex:1, minWidth:0 } },
            React.createElement('p', { style:{ fontSize:13, fontWeight:600, color:AppColors.text1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' } }, doc.name),
            React.createElement('p', { style:{ fontSize:11, color:AppColors.text3 } }, `${doc.lab} · ${doc.date}`)
          ),
          React.createElement(Icon, { name:'chevronRight', size:14, color:AppColors.text3 })
        )
      ),
    )
  );
}

window.SAMPLE_DOCS = SAMPLE_DOCS;
Object.assign(window, { TabBar, HomeScreen });
