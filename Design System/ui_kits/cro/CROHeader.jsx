function CROHeader({ navigate, screen }) {
  return (
    <header style={{position:'sticky',top:0,zIndex:100,background:'rgba(10,10,10,0.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 24px'}}>
      <div style={{maxWidth:1200,margin:'0 auto',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <img src="../../assets/logo-vertical-positive.png" alt="Bresca" style={{height:32,cursor:'pointer'}} onClick={()=>navigate('home')} />
        <nav style={{display:'flex',gap:28,alignItems:'center'}}>
          {[['Datasets','datasets'],['API Docs','home'],['Compliance','home'],['Pricing','home']].map(([l,s])=>(
            <a key={l} href="#" onClick={e=>{e.preventDefault();navigate(s);}} style={{fontSize:14,fontWeight:500,color:'#64748B',textDecoration:'none',transition:'color 150ms'}}
              onMouseEnter={e=>e.target.style.color='#00C87A'} onMouseLeave={e=>e.target.style.color='#64748B'}>{l}</a>
          ))}
        </nav>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button style={{background:'transparent',border:'none',fontSize:14,fontWeight:600,color:'#64748B',cursor:'pointer',padding:'8px 16px',fontFamily:'inherit'}}>Sign In</button>
          <button onClick={()=>navigate('contact')} style={{background:'linear-gradient(135deg,#00C87A,#4B6EF5)',color:'#fff',border:'none',borderRadius:100,padding:'9px 20px',fontSize:14,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>Request Access</button>
        </div>
      </div>
    </header>
  );
}
Object.assign(window, { CROHeader });
