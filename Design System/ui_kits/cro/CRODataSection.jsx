function CRODataSection() {
  const pillars = [
    { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color:'#00C87A', title:'Fully Consented', desc:'Every study in our platform carries explicit, auditable patient consent. Traceable to source, compliant globally.' },
    { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color:'#00B8D4', title:'De-identified at Source', desc:'Multi-layer anonymization pipeline. No PHI leakage. HIPAA, GDPR, and LGPD-ready out of the box.' },
    { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color:'#4B6EF5', title:'Research-Grade Quality', desc:'DICOM-native datasets with complete metadata. Curated by modality, anatomy, and pathology type.' },
    { icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', color:'#00C87A', title:'API-First Delivery', desc:'Programmatic access via REST API. DICOM web standards. Integrates with PACS, RIS, and data pipelines.' },
    { icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064', color:'#00B8D4', title:'Global Coverage', desc:'Imaging data sourced across Latin America, with expanding coverage in North America and Europe.' },
    { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0', color:'#4B6EF5', title:'Dedicated Support', desc:'Assigned research coordinator for each CRO partnership. SLA-backed response times.' },
  ];

  return (
    <section style={{background:'#0A0A0A',padding:'80px 24px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:56}}>
          <span style={{fontSize:11,fontWeight:600,letterSpacing:'0.18em',textTransform:'uppercase',color:'#00C87A'}}>Platform Capabilities</span>
          <h2 style={{fontSize:'clamp(26px,3.5vw,38px)',fontWeight:700,letterSpacing:'-0.02em',marginTop:12,color:'#F1F5F9'}}>Built for serious research.</h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {pillars.map((p,i)=>(
            <div key={i} style={{background:'#111827',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'28px 24px',transition:'border-color 250ms,box-shadow 250ms',cursor:'default'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=`${p.color}44`;e.currentTarget.style.boxShadow=`0 0 28px ${p.color}12`}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.boxShadow='none'}}>
              <div style={{width:44,height:44,borderRadius:12,background:`${p.color}12`,border:`1px solid ${p.color}22`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={p.color} strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d={p.icon}/></svg>
              </div>
              <h3 style={{fontSize:16,fontWeight:700,marginBottom:8,color:'#F1F5F9'}}>{p.title}</h3>
              <p style={{fontSize:14,color:'#475569',lineHeight:1.65}}>{p.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Strip */}
        <div style={{marginTop:64,background:'#111827',border:'1px solid rgba(0,200,122,0.15)',borderRadius:16,padding:'40px 40px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:24}}>
          <div>
            <h3 style={{fontSize:22,fontWeight:700,color:'#F1F5F9',marginBottom:6}}>Ready to access research-grade data?</h3>
            <p style={{fontSize:14,color:'#64748B'}}>Talk to our team about your study protocol and data requirements.</p>
          </div>
          <div style={{display:'flex',gap:10,flexShrink:0}}>
            <button style={{background:'linear-gradient(135deg,#00C87A,#4B6EF5)',color:'#fff',border:'none',borderRadius:100,padding:'12px 28px',fontSize:14,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>Get in Touch</button>
            <button style={{background:'transparent',color:'#00C87A',border:'1.5px solid rgba(0,200,122,0.3)',borderRadius:100,padding:'11px 26px',fontSize:14,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>View Pricing</button>
          </div>
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { CRODataSection });
