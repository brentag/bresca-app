function B2CHero({ navigate }) {
  return (
    <section style={{padding:'96px 24px 80px',textAlign:'center',background:'#fff',position:'relative',overflow:'hidden'}}>
      {/* Soft gradient blobs */}
      <div style={{position:'absolute',top:-80,left:'50%',transform:'translateX(-50%)',width:600,height:400,background:'radial-gradient(ellipse,rgba(0,200,122,0.08) 0%,transparent 70%)',pointerEvents:'none'}} />
      <div style={{position:'absolute',top:40,right:'10%',width:300,height:300,background:'radial-gradient(ellipse,rgba(75,110,245,0.08) 0%,transparent 70%)',pointerEvents:'none'}} />
      <div style={{position:'relative',maxWidth:760,margin:'0 auto'}}>
        <span style={{display:'inline-block',fontSize:12,fontWeight:600,letterSpacing:'0.18em',textTransform:'uppercase',color:'#00C87A',marginBottom:20,padding:'5px 16px',background:'rgba(0,200,122,0.08)',borderRadius:100}}>HEALTH DATA AUTONOMY</span>
        <h1 style={{fontSize:'clamp(36px,5vw,64px)',fontWeight:700,lineHeight:1.08,letterSpacing:'-0.03em',marginBottom:24,color:'#0F172A'}}>
          Tus estudios médicos,<br/>
          <span style={{background:'linear-gradient(135deg,#00C87A,#4B6EF5)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>siempre contigo.</span>
        </h1>
        <p style={{fontSize:18,color:'#64748B',lineHeight:1.7,maxWidth:540,margin:'0 auto 36px'}}>
          Guarda, accede y comparte tus imágenes médicas desde cualquier lugar, sin depender del sistema de salud, país o proveedor.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>navigate('upload')} style={{background:'linear-gradient(135deg,#00C87A,#4B6EF5)',color:'#fff',border:'none',borderRadius:100,padding:'14px 32px',fontSize:16,fontWeight:600,fontFamily:'inherit',cursor:'pointer',transition:'filter 200ms,transform 200ms'}}
            onMouseEnter={e=>{e.currentTarget.style.filter='brightness(1.08)';e.currentTarget.style.transform='scale(1.02)'}}
            onMouseLeave={e=>{e.currentTarget.style.filter='brightness(1)';e.currentTarget.style.transform='scale(1)'}}>
            Comenzar gratis
          </button>
          <button onClick={()=>navigate('dashboard')} style={{background:'transparent',color:'#334155',border:'2px solid #E2E8F0',borderRadius:100,padding:'13px 30px',fontSize:16,fontWeight:600,fontFamily:'inherit',cursor:'pointer',transition:'border-color 200ms'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#00C87A'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#E2E8F0'}>
            Ver mis estudios
          </button>
        </div>
        <div style={{display:'flex',gap:32,justifyContent:'center',marginTop:48,flexWrap:'wrap'}}>
          {[['12K+','Estudios guardados'],['98%','Disponibilidad'],['15+','Países activos']].map(([val,lbl])=>(
            <div key={lbl} style={{textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:700,background:'linear-gradient(135deg,#00C87A,#4B6EF5)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{val}</div>
              <div style={{fontSize:13,color:'#94A3B8',marginTop:2}}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { B2CHero });
