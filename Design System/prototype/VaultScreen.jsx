// Health Vault screens: list, detail, upload flow (3 steps)

function VaultScreen() {
  const [s, d] = useAppState();
  const screen = s.screen;

  if (screen === 'upload-1') return React.createElement(Upload1, null);
  if (screen === 'upload-2') return React.createElement(Upload2, null);
  if (screen === 'upload-3') return React.createElement(Upload3, null);
  if (screen === 'vault-detail') return React.createElement(VaultDetail, null);
  return React.createElement(VaultList, null);
}

function VaultList() {
  const [s, d] = useAppState();
  const [filter, setFilter] = React.useState('Todos');
  const tags = ['Todos', 'Laboratorio', 'Imagen', 'Cardiología', 'Medicación'];
  const docs = filter === 'Todos' ? SAMPLE_DOCS : SAMPLE_DOCS.filter(x=>x.tag===filter);

  return React.createElement(ScreenWrapper, null,
    React.createElement(TopBar, {
      title:'Mi Vault',
      subtitle:'18 estudios guardados',
      action: React.createElement('button', { onClick:()=>d({screen:'upload-1'}), style:{ width:32, height:32, borderRadius:'50%', background:AppColors.green, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' } },
        React.createElement(Icon, { name:'plus', size:16, color:'#fff' })
      )
    }),
    // Filter chips
    React.createElement('div', { style:{ display:'flex', gap:8, padding:'10px 14px', background:'#fff', overflowX:'auto', borderBottom:`1px solid ${AppColors.borderLight}`, flexShrink:0 } },
      tags.map(t => React.createElement('button', { key:t, onClick:()=>setFilter(t), style:{ flexShrink:0, padding:'5px 14px', borderRadius:100, border:`1.5px solid ${filter===t ? AppColors.green : AppColors.border}`, background:filter===t ? AppColors.greenLight : 'transparent', color:filter===t ? AppColors.green : AppColors.text2, fontSize:12, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, t))
    ),

    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'10px 14px' } },
      docs.map(doc =>
        React.createElement('div', { key:doc.id, onClick:()=>d({screen:'vault-detail', selectedDoc:doc}),
          style:{ display:'flex', gap:12, alignItems:'center', background:'#fff', borderRadius:14, padding:'14px 12px', marginBottom:8, boxShadow:'0 1px 6px rgba(0,0,0,0.05)', cursor:'pointer', border:`1px solid ${AppColors.borderLight}` } },
          React.createElement('div', { style:{ width:44, height:44, borderRadius:12, background:doc.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } },
            React.createElement(Icon, { name:'file', size:22, color:doc.color })
          ),
          React.createElement('div', { style:{ flex:1, minWidth:0 } },
            React.createElement('p', { style:{ fontSize:14, fontWeight:600, color:AppColors.text1 } }, doc.name),
            React.createElement('p', { style:{ fontSize:11, color:AppColors.text3, marginTop:2 } }, `${doc.lab} · ${doc.date}`),
            React.createElement(Pill, { children:doc.tag, style:{ marginTop:4, fontSize:10 } })
          ),
          doc.values.some(v=>v.alert) && React.createElement('div', { style:{ width:8, height:8, borderRadius:'50%', background:AppColors.warn, flexShrink:0 } })
        )
      )
    )
  );
}

function VaultDetail() {
  const [s, d] = useAppState();
  const doc = s.selectedDoc || SAMPLE_DOCS[0];
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement(TopBar, { title:doc.type, onBack:()=>d({screen:'vault'}),
      action: React.createElement('button', { onClick:()=>d({tab:'menu', screen:'sharing'}), style:{ background:AppColors.greenLight, border:`1px solid ${AppColors.greenBorder}`, borderRadius:100, padding:'6px 12px', display:'flex', gap:4, alignItems:'center', cursor:'pointer' } },
        React.createElement(Icon, { name:'share', size:14, color:AppColors.green }),
        React.createElement('span', { style:{ fontSize:12, fontWeight:600, color:AppColors.green } }, 'Compartir')
      )
    }),

    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'14px' } },
      // Document header
      React.createElement(Card, { style:{ marginBottom:12 } },
        React.createElement('div', { style:{ display:'flex', gap:12, alignItems:'center', marginBottom:12 } },
          React.createElement('div', { style:{ width:48, height:48, borderRadius:12, background:doc.color, display:'flex', alignItems:'center', justifyContent:'center' } },
            React.createElement(Icon, { name:'file', size:24, color:'#fff' })
          ),
          React.createElement('div', null,
            React.createElement('h2', { style:{ fontSize:16, fontWeight:700, color:AppColors.text1 } }, doc.name),
            React.createElement('p', { style:{ fontSize:12, color:AppColors.text3, marginTop:2 } }, `${doc.lab} · ${doc.date}`)
          )
        ),
        // Simulated doc preview
        React.createElement('div', { style:{ background:AppColors.bg, borderRadius:10, padding:'12px', minHeight:100, display:'flex', flexDirection:'column', gap:6 } },
          doc.values.length > 0
            ? doc.values.map((v, i) =>
              React.createElement('div', { key:i, style:{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i<doc.values.length-1 ? `1px solid ${AppColors.borderLight}` : 'none' } },
                React.createElement('span', { style:{ fontSize:13, color:AppColors.text2 } }, v.k),
                React.createElement('span', { style:{ fontSize:13, fontWeight:700, color: v.alert ? AppColors.warn : AppColors.text1 } }, v.v)
              ))
            : React.createElement('p', { style:{ fontSize:12, color:AppColors.text3, textAlign:'center', marginTop:16 } }, 'Vista previa del documento')
        )
      ),

      // AI Explanation
      React.createElement(Card, { style:{ marginBottom:12, background:'#F0FDF4', border:`1px solid ${AppColors.greenBorder}` } },
        React.createElement('div', { style:{ display:'flex', gap:8, alignItems:'center', marginBottom:8 } },
          React.createElement(Icon, { name:'zap', size:16, color:AppColors.green }),
          React.createElement('span', { style:{ fontSize:12, fontWeight:600, color:AppColors.green, textTransform:'uppercase', letterSpacing:'0.04em' } }, 'Explicación del Copilot')
        ),
        React.createElement('p', { style:{ fontSize:13, color:AppColors.text1, lineHeight:1.65 } },
          doc.values.some(v=>v.alert) ? 'Hay valores que están fuera del rango normal. La glucemia en 127 mg/dL puede indicar pre-diabetes. Te recomiendo consultarlo con tu médico.' : 'Los resultados se encuentran dentro de los rangos normales esperados para tu perfil.'
        ),
        React.createElement('button', { onClick:()=>d({tab:'copilot', screen:'copilot'}), style:{ marginTop:8, background:'none', border:'none', fontSize:12, color:AppColors.green, fontWeight:600, cursor:'pointer', padding:0, fontFamily:"'Space Grotesk',sans-serif" } }, 'Preguntarle más al Copilot →')
      ),

      React.createElement('div', { style:{ display:'flex', gap:10 } },
        React.createElement('button', { onClick:()=>d({tab:'menu',screen:'sharing'}), style:{ flex:1, padding:'12px', borderRadius:12, background:AppColors.grad, border:'none', color:'#fff', fontWeight:600, fontSize:14, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Compartir vía QR'),
        React.createElement('button', { style:{ width:44, height:44, borderRadius:12, background:AppColors.bg, border:`1px solid ${AppColors.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' } },
          React.createElement(Icon, { name:'trash', size:18, color:AppColors.text3 })
        )
      )
    )
  );
}

function Upload1() {
  const [s, d] = useAppState();
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement(TopBar, { title:'Subir estudio', onBack:()=>d({screen:'vault'}) }),
    React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:12 } },
      React.createElement('p', { style:{ fontSize:13, color:AppColors.text2, marginBottom:4 } }, 'Elegí cómo querés agregar el estudio.'),
      [
        { icon:'camera', title:'Sacar foto', desc:'Tomá una foto del informe en papel', color:AppColors.green },
        { icon:'upload', title:'Subir archivo', desc:'PDF, JPG o DICOM desde tu dispositivo', color:AppColors.blue },
        { icon:'folder', title:'Desde el laboratorio', desc:'Conectá con Stamboulian, LALCEC y más', color:AppColors.teal },
      ].map((opt, i) =>
        React.createElement('button', { key:i, onClick:()=>d({screen:'upload-2'}),
          style:{ display:'flex', gap:14, alignItems:'center', background:'#fff', borderRadius:14, padding:'16px', border:`1.5px solid ${AppColors.border}`, cursor:'pointer', textAlign:'left' } },
          React.createElement('div', { style:{ width:44, height:44, borderRadius:12, background:opt.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } },
            React.createElement(Icon, { name:opt.icon, size:22, color:opt.color })
          ),
          React.createElement('div', null,
            React.createElement('p', { style:{ fontSize:15, fontWeight:600, color:AppColors.text1, marginBottom:2 } }, opt.title),
            React.createElement('p', { style:{ fontSize:12, color:AppColors.text3 } }, opt.desc)
          ),
          React.createElement(Icon, { name:'chevronRight', size:16, color:AppColors.text3 })
        )
      ),
      React.createElement('div', { style:{ marginTop:'auto', padding:'12px', background:AppColors.bg, borderRadius:10, display:'flex', gap:8 } },
        React.createElement(Icon, { name:'shield', size:14, color:AppColors.green }),
        React.createElement('p', { style:{ fontSize:11, color:AppColors.text2, lineHeight:1.5 } }, 'Tus documentos se cifran antes de guardarse. Nadie puede acceder a ellos sin tu permiso.')
      )
    )
  );
}

function Upload2() {
  const [s, d] = useAppState();
  const [pct, setPct] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setPct(p => { if(p >= 100) { clearInterval(t); setTimeout(()=>d({screen:'upload-3'}),400); return 100; } return p+8; }), 80);
    return () => clearInterval(t);
  }, []);

  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement(TopBar, { title:'Procesando', onBack:()=>d({screen:'upload-1'}) }),
    React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', textAlign:'center' } },
      React.createElement('div', { style:{ width:80, height:80, borderRadius:24, background:AppColors.greenLight, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, border:`2px solid ${AppColors.greenBorder}` } },
        React.createElement(Icon, { name:'zap', size:36, color:AppColors.green })
      ),
      React.createElement('h2', { style:{ fontSize:20, fontWeight:700, color:AppColors.text1, marginBottom:8 } }, pct < 100 ? 'Analizando con IA…' : '¡Listo!'),
      React.createElement('p', { style:{ fontSize:13, color:AppColors.text2, marginBottom:28, lineHeight:1.6 } },
        pct < 40 ? 'Reconociendo el tipo de estudio' : pct < 70 ? 'Extrayendo valores y fechas' : pct < 100 ? 'Estructurando la información' : 'El estudio fue procesado correctamente'
      ),
      React.createElement('div', { style:{ width:'100%', maxWidth:240, background:AppColors.borderLight, borderRadius:100, height:6, overflow:'hidden' } },
        React.createElement('div', { style:{ width:`${pct}%`, height:'100%', background:AppColors.grad, borderRadius:100, transition:'width 100ms' } })
      ),
      React.createElement('p', { style:{ fontSize:12, color:AppColors.text3, marginTop:10 } }, `${pct}%`),
    )
  );
}

function Upload3() {
  const [s, d] = useAppState();
  const [name, setName] = React.useState('Análisis de Sangre — Mayo 2024');
  const [tag, setTag] = React.useState('Laboratorio');
  const tags2 = ['Laboratorio','Imagen','Cardiología','Medicación','Otro'];
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement(TopBar, { title:'Confirmar datos', onBack:()=>d({screen:'upload-1'}) }),
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'16px' } },
      React.createElement(Card, { style:{ background:'#F0FDF4', border:`1px solid ${AppColors.greenBorder}`, marginBottom:14 } },
        React.createElement('div', { style:{ display:'flex', gap:8, alignItems:'center', marginBottom:10 } },
          React.createElement(Icon, { name:'check', size:14, color:AppColors.green }),
          React.createElement('span', { style:{ fontSize:12, fontWeight:600, color:AppColors.green } }, 'IA extrajo automáticamente')
        ),
        React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:6 } },
          [['Tipo','Análisis de sangre completo'],['Fecha','15 Mayo 2024'],['Laboratorio','Stamboulian'],['Glucemia','127 mg/dL ⚠️'],['Colesterol','198 mg/dL'],['Hemoglobina','14.2 g/dL']].map(([k,v]) =>
            React.createElement('div', { key:k, style:{ display:'flex', justifyContent:'space-between' } },
              React.createElement('span', { style:{ fontSize:12, color:AppColors.text3 } }, k),
              React.createElement('span', { style:{ fontSize:12, fontWeight:600, color:AppColors.text1 } }, v)
            )
          )
        )
      ),
      React.createElement('div', { style:{ marginBottom:14 } },
        React.createElement('label', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, display:'block', marginBottom:5, letterSpacing:'0.04em' } }, 'NOMBRE'),
        React.createElement('input', { value:name, onChange:e=>setName(e.target.value), style:{ width:'100%', padding:'11px 13px', borderRadius:10, border:`1.5px solid ${AppColors.border}`, fontSize:14, fontFamily:"'Space Grotesk',sans-serif", color:AppColors.text1, outline:'none', boxSizing:'border-box' } })
      ),
      React.createElement('div', { style:{ marginBottom:20 } },
        React.createElement('label', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, display:'block', marginBottom:6, letterSpacing:'0.04em' } }, 'CATEGORÍA'),
        React.createElement('div', { style:{ display:'flex', flexWrap:'wrap', gap:6 } },
          tags2.map(t => React.createElement('button', { key:t, onClick:()=>setTag(t), style:{ padding:'5px 12px', borderRadius:100, border:`1.5px solid ${tag===t ? AppColors.green : AppColors.border}`, background:tag===t ? AppColors.greenLight : 'transparent', color:tag===t ? AppColors.green : AppColors.text2, fontSize:12, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, t))
        )
      ),
      React.createElement('button', { onClick:()=>d({screen:'vault'}), style:{ width:'100%', padding:'14px', borderRadius:100, background:AppColors.grad, border:'none', color:'#fff', fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' } }, 'Guardar en mi Vault ✓')
    )
  );
}

Object.assign(window, { VaultScreen });
