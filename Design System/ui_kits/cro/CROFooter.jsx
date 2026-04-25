function CROFooter() {
  return (
    <footer style={{background:'#060608',borderTop:'1px solid rgba(255,255,255,0.05)',color:'#475569',padding:'48px 24px 28px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:40,marginBottom:40,flexWrap:'wrap'}}>
          <div>
            <img src="../../assets/logo-vertical-positive.png" alt="Bresca" style={{height:48,marginBottom:14}} />
            <p style={{fontSize:13,lineHeight:1.7,maxWidth:240,color:'#334155'}}>Health data infrastructure for the global research community.</p>
          </div>
          {[
            {title:'Platform',links:['Datasets','API Reference','Data Standards','Compliance']},
            {title:'Company',links:['About','Research Blog','Press','Careers']},
            {title:'Legal',links:['Privacy Policy','Terms of Use','DPA','Contact']},
          ].map(col=>(
            <div key={col.title}>
              <h4 style={{fontSize:11,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'#334155',marginBottom:14}}>{col.title}</h4>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:9}}>
                {col.links.map(l=>(
                  <li key={l}><a href="#" style={{fontSize:13,color:'#334155',textDecoration:'none',transition:'color 150ms'}}
                    onMouseEnter={e=>e.target.style.color='#00C87A'} onMouseLeave={e=>e.target.style.color='#334155'}>{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <span style={{fontSize:12}}>© 2024 Bresca. All rights reserved.</span>
          <span style={{fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',background:'linear-gradient(135deg,#00C87A,#4B6EF5)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',fontWeight:600}}>HEALTH DATA AUTONOMY</span>
        </div>
      </div>
    </footer>
  );
}
Object.assign(window, { CROFooter });
