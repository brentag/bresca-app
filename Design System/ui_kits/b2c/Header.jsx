function B2CHeader({ navigate, screen }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <header style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,0.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid #E2E8F0',padding:'0 24px'}}>
      <div style={{maxWidth:1200,margin:'0 auto',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <img src="../../assets/logo-horizontal-bicolor.png" alt="Bresca" style={{height:32,cursor:'pointer'}} onClick={()=>navigate('home')} />
        <nav style={{display:'flex',gap:28,alignItems:'center'}}>
          {['Cómo funciona','Seguridad','Precios'].map(l=>(
            <a key={l} href="#" style={{fontSize:14,fontWeight:500,color:'#475569',textDecoration:'none',transition:'color 150ms'}}
              onMouseEnter={e=>e.target.style.color='#00C87A'} onMouseLeave={e=>e.target.style.color='#475569'}>{l}</a>
          ))}
        </nav>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button style={{background:'transparent',border:'none',fontSize:14,fontWeight:600,color:'#334155',cursor:'pointer',padding:'8px 16px',fontFamily:'inherit'}}>Iniciar sesión</button>
          <button onClick={()=>navigate('upload')} style={{background:'linear-gradient(135deg,#00C87A,#4B6EF5)',color:'#fff',border:'none',borderRadius:100,padding:'9px 20px',fontSize:14,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>Comenzar gratis</button>
        </div>
      </div>
    </header>
  );
}
Object.assign(window, { B2CHeader });
