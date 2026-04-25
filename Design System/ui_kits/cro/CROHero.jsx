function CROHero({ navigate }) {
  return (
    <section className="dot-grid" style={{padding:'100px 24px 80px',position:'relative',overflow:'hidden',background:'#0A0A0A'}}>
      <div style={{position:'absolute',top:-100,left:'50%',transform:'translateX(-50%)',width:700,height:500,background:'radial-gradient(ellipse,rgba(0,200,122,0.07) 0%,transparent 65%)',pointerEvents:'none'}} />
      <div style={{position:'absolute',top:100,right:'5%',width:400,height:400,background:'radial-gradient(ellipse,rgba(75,110,245,0.07) 0%,transparent 65%)',pointerEvents:'none'}} />
      <div style={{maxWidth:800,margin:'0 auto',textAlign:'center',position:'relative'}}>
        <span style={{display:'inline-block',fontSize:11,fontWeight:600,letterSpacing:'0.2em',textTransform:'uppercase',color:'#00C87A',marginBottom:20,padding:'5px 16px',background:'rgba(0,200,122,0.08)',border:'1px solid rgba(0,200,122,0.2)',borderRadius:100}}>FOR CROs &amp; RESEARCH ORGANIZATIONS</span>
        <h1 style={{fontSize:'clamp(36px,5vw,64px)',fontWeight:700,lineHeight:1.07,letterSpacing:'-0.03em',marginBottom:24,color:'#F1F5F9'}}>
          Clean data.<br/>
          <span style={{background:'linear-gradient(135deg,#00C87A,#4B6EF5)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Consented. Traceable.</span>
        </h1>
        <p style={{fontSize:18,color:'#64748B',lineHeight:1.7,maxWidth:560,margin:'0 auto 36px'}}>
          Access anonymized, consent-authorized medical imaging datasets for clinical research. Built for global laboratories and CROs who need prolific, traceable data.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>navigate('contact')} style={{background:'linear-gradient(135deg,#00C87A,#4B6EF5)',color:'#fff',border:'none',borderRadius:100,padding:'14px 32px',fontSize:16,fontWeight:600,fontFamily:'inherit',cursor:'pointer',transition:'filter 200ms,transform 200ms'}}
            onMouseEnter={e=>{e.currentTarget.style.filter='brightness(1.1)';e.currentTarget.style.transform='scale(1.02)'}}
            onMouseLeave={e=>{e.currentTarget.style.filter='brightness(1)';e.currentTarget.style.transform='scale(1)'}}>
            Request Data Access
          </button>
          <button onClick={()=>navigate('datasets')} style={{background:'transparent',color:'#94A3B8',border:'1.5px solid rgba(255,255,255,0.12)',borderRadius:100,padding:'13px 30px',fontSize:16,fontWeight:600,fontFamily:'inherit',cursor:'pointer',transition:'border-color 200ms,color 200ms'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,200,122,0.4)';e.currentTarget.style.color='#00C87A'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';e.currentTarget.style.color='#94A3B8'}}>
            Browse Datasets
          </button>
        </div>
        <div style={{display:'flex',gap:40,justifyContent:'center',marginTop:56,flexWrap:'wrap'}}>
          {[['19K+','Medical Studies'],['100%','Consented'],['HIPAA','Compliant'],['48h','Response SLA']].map(([val,lbl])=>(
            <div key={lbl} style={{textAlign:'center'}}>
              <div style={{fontSize:26,fontWeight:700,color:'#00C87A'}}>{val}</div>
              <div style={{fontSize:12,color:'#475569',marginTop:3,letterSpacing:'0.03em'}}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { CROHero });
