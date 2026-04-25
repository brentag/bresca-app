function B2CFooter() {
  return (
    <footer style={{background:'#0F172A',color:'#94A3B8',padding:'56px 24px 32px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:40,marginBottom:48,flexWrap:'wrap'}}>
          <div>
            <img src="../../assets/logo-vertical-positive.png" alt="Bresca" style={{height:56,marginBottom:16}} />
            <p style={{fontSize:14,lineHeight:1.7,maxWidth:260}}>La plataforma de portabilidad de estudios médicos para personas reales, en cualquier lugar del mundo.</p>
          </div>
          {[
            {title:'Producto',links:['Cómo funciona','Seguridad','Precios','Aplicación móvil']},
            {title:'Empresa',links:['Nosotros','Blog','Prensa','Carreras']},
            {title:'Legal',links:['Privacidad','Términos','Consentimiento','Contacto']},
          ].map(col=>(
            <div key={col.title}>
              <h4 style={{fontSize:12,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'#475569',marginBottom:16}}>{col.title}</h4>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:10}}>
                {col.links.map(l=>(
                  <li key={l}><a href="#" style={{fontSize:14,color:'#64748B',textDecoration:'none',transition:'color 150ms'}}
                    onMouseEnter={e=>e.target.style.color='#00C87A'} onMouseLeave={e=>e.target.style.color='#64748B'}>{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{borderTop:'1px solid #1E293B',paddingTop:24,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <span style={{fontSize:13}}>© 2024 Bresca. Todos los derechos reservados.</span>
          <span style={{fontSize:12,letterSpacing:'0.15em',textTransform:'uppercase',background:'linear-gradient(135deg,#00C87A,#4B6EF5)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',fontWeight:600}}>HEALTH DATA AUTONOMY</span>
        </div>
      </div>
    </footer>
  );
}
Object.assign(window, { B2CFooter });
