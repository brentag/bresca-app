function B2CFeatures() {
  const features = [
    { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color:'#00C87A', title:'Almacenamiento seguro', desc:'Cifrado de extremo a extremo. Tus estudios no pueden ser accedidos por nadie sin tu permiso.' },
    { icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064', color:'#00B8D4', title:'Independencia total', desc:'Sin fronteras. Sin proveedores. Accede a tus estudios desde cualquier país, en cualquier dispositivo.' },
    { icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', color:'#4B6EF5', title:'Compartir al instante', desc:'Envía estudios a cualquier médico con un link seguro y con fecha de expiración.' },
    { icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', color:'#00C87A', title:'Formatos médicos', desc:'Compatible con DICOM, JPEG, PDF y más. Visor integrado para imágenes de diagnóstico.' },
    { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color:'#4B6EF5', title:'Historial completo', desc:'Toda tu historia médica en un solo lugar. Organizada por fecha, tipo de estudio y proveedor.' },
    { icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', color:'#00B8D4', title:'Tú decides', desc:'Autoriza o revoca el acceso a tus datos en cualquier momento. Control total sobre tu información.' },
  ];
  return (
    <section style={{background:'#F8FAFC',padding:'80px 24px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:56}}>
          <span style={{fontSize:12,fontWeight:600,letterSpacing:'0.18em',textTransform:'uppercase',color:'#00C87A'}}>Por qué Bresca</span>
          <h2 style={{fontSize:'clamp(28px,4vw,40px)',fontWeight:700,letterSpacing:'-0.02em',marginTop:12,color:'#0F172A'}}>Portabilidad real. Sin fronteras.</h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20}}>
          {features.map((f,i)=>(
            <div key={i} style={{background:'#fff',borderRadius:14,padding:'28px 24px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',transition:'box-shadow 250ms,transform 250ms',cursor:'default'}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.10)';e.currentTarget.style.transform='translateY(-3px)'}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)';e.currentTarget.style.transform='translateY(0)'}}>
              <div style={{width:44,height:44,borderRadius:12,background:`${f.color}18`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={f.color} strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d={f.icon}/></svg>
              </div>
              <h3 style={{fontSize:17,fontWeight:700,marginBottom:8,color:'#0F172A'}}>{f.title}</h3>
              <p style={{fontSize:14,color:'#64748B',lineHeight:1.65}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { B2CFeatures });
