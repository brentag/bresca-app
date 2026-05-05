import { useState, useEffect } from 'react';

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Space Grotesk',sans-serif;background:#0A0A0A;color:#F1F5F9;-webkit-font-smoothing:antialiased}
:root{
  --cro-green:#00C87A;--cro-blue:#4B6EF5;--cro-teal:#00B8D4;
  --cro-grad:linear-gradient(135deg,#00C87A 0%,#00B8D4 50%,#4B6EF5 100%);
  --cro-surface:#111827;--cro-card:#1A2236;
  --cro-border:rgba(255,255,255,0.08);--cro-border-strong:rgba(255,255,255,0.15);
  --cro-muted:#94A3B8;--cro-dim:#64748B;
  --glow-green:0 0 40px rgba(0,200,122,0.2);
  --glow-blue:0 0 40px rgba(75,110,245,0.2);
}
a{color:inherit;text-decoration:none}
.cro-lp{min-height:100vh;background:#0A0A0A}
.cro-lp .container{max-width:1160px;margin:0 auto;padding:0 24px}
.cro-lp header{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,10,10,0.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--cro-border)}
.cro-lp .header-inner{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;max-width:1160px;margin:0 auto}
.cro-lp .logo{font-weight:700;font-size:20px;letter-spacing:-0.01em;background:var(--cro-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cro-lp .logo-tag{font-size:10px;font-weight:500;color:var(--cro-muted);letter-spacing:.12em;text-transform:uppercase;margin-left:8px;vertical-align:middle}
.cro-lp nav{display:flex;align-items:center;gap:28px}
.cro-lp nav a{font-size:14px;font-weight:500;color:var(--cro-muted);transition:color 150ms}
.cro-lp nav a:hover{color:#F1F5F9}
.cro-lp .btn-demo{background:var(--cro-grad);color:#fff;padding:10px 22px;border-radius:100px;font-size:14px;font-weight:600;border:none;cursor:pointer;transition:opacity 150ms,transform 150ms}
.cro-lp .btn-demo:hover{opacity:.9;transform:scale(1.02)}
.cro-lp .btn-ghost{background:transparent;border:1.5px solid var(--cro-border-strong);color:#F1F5F9;padding:10px 22px;border-radius:100px;font-size:14px;font-weight:600;cursor:pointer;transition:border-color 150ms,background 150ms}
.cro-lp .btn-ghost:hover{border-color:rgba(255,255,255,.4);background:rgba(255,255,255,.05)}
.cro-lp .hero{padding:120px 24px 80px;position:relative;overflow:hidden;text-align:center}
.cro-lp .hero-bg{position:absolute;inset:0}
.cro-lp .hero-bg::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:28px 28px}
.cro-lp .hero-bg::after{content:'';position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(ellipse,rgba(0,200,122,0.08) 0%,rgba(75,110,245,0.05) 40%,transparent 70%)}
.cro-lp .hero-content{position:relative}
.cro-lp .hero-chip{display:inline-flex;align-items:center;gap:8px;background:rgba(0,200,122,.12);border:1px solid rgba(0,200,122,.25);border-radius:100px;padding:6px 16px;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--cro-green);margin-bottom:28px}
.cro-lp .pulse{width:7px;height:7px;border-radius:50%;background:var(--cro-green);box-shadow:0 0 0 0 rgba(0,200,122,.6);animation:pulse-ring 2s infinite}
@keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(0,200,122,.5)}70%{box-shadow:0 0 0 8px rgba(0,200,122,0)}100%{box-shadow:0 0 0 0 rgba(0,200,122,0)}}
.cro-lp .hero h1{font-size:clamp(36px,6vw,68px);font-weight:700;line-height:1.05;letter-spacing:-0.03em;margin-bottom:8px}
.cro-lp .hero h1 .grad{background:var(--cro-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cro-lp .hero-tagline{font-size:clamp(14px,2vw,18px);color:var(--cro-muted);letter-spacing:.2em;text-transform:uppercase;margin-bottom:20px}
.cro-lp .hero-sub{font-size:18px;color:var(--cro-muted);max-width:560px;margin:0 auto 40px;line-height:1.65}
.cro-lp .hero-ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:52px}
.cro-lp .btn-demo-lg{background:var(--cro-grad);color:#fff;padding:16px 36px;border-radius:100px;font-size:16px;font-weight:600;border:none;cursor:pointer;box-shadow:0 8px 28px rgba(75,110,245,.3);transition:opacity 150ms,transform 150ms}
.cro-lp .btn-demo-lg:hover{opacity:.9;transform:scale(1.02)}
.cro-lp .btn-ghost-lg{background:transparent;border:1.5px solid var(--cro-border-strong);color:#F1F5F9;padding:16px 28px;border-radius:100px;font-size:16px;font-weight:600;cursor:pointer;transition:border-color 150ms,background 150ms}
.cro-lp .btn-ghost-lg:hover{border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.05)}
.cro-lp .stats-bar{background:var(--cro-surface);border-top:1px solid var(--cro-border);border-bottom:1px solid var(--cro-border);padding:36px 24px}
.cro-lp .stats-inner{max-width:1160px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.cro-lp .stat{text-align:center}
.cro-lp .stat-num{font-size:clamp(28px,4vw,44px);font-weight:700;letter-spacing:-0.03em;background:var(--cro-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px}
.cro-lp .stat-label{font-size:13px;color:var(--cro-muted);font-weight:500}
.cro-lp .section{padding:80px 24px}
.cro-lp .section-label{font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--cro-green);margin-bottom:12px}
.cro-lp .section-title{font-size:clamp(28px,4vw,42px);font-weight:700;letter-spacing:-0.02em;margin-bottom:16px;line-height:1.15}
.cro-lp .section-sub{font-size:17px;color:var(--cro-muted);max-width:540px;line-height:1.65;margin-bottom:52px}
.cro-lp .how-section{background:var(--cro-surface);padding:80px 24px}
.cro-lp .flow-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:52px;position:relative}
.cro-lp .flow-grid::before{content:'';position:absolute;top:36px;left:calc(16.6% + 20px);right:calc(16.6% + 20px);height:1px;background:linear-gradient(90deg,var(--cro-green),var(--cro-teal),var(--cro-blue));opacity:.4}
.cro-lp .flow-card{background:var(--cro-card);border:1px solid var(--cro-border);border-radius:16px;padding:28px;position:relative;transition:border-color 200ms,box-shadow 200ms}
.cro-lp .flow-card:hover{border-color:var(--cro-border-strong);box-shadow:var(--glow-green)}
.cro-lp .flow-num{width:52px;height:52px;border-radius:50%;background:var(--cro-grad);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;margin-bottom:20px;position:relative;z-index:1}
.cro-lp .flow-card h3{font-size:17px;font-weight:600;margin-bottom:10px}
.cro-lp .flow-card p{font-size:14px;color:var(--cro-muted);line-height:1.65}
.cro-lp .feat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.cro-lp .feat-dark{background:var(--cro-card);border:1px solid var(--cro-border);border-radius:16px;padding:28px;transition:border-color 200ms,box-shadow 200ms}
.cro-lp .feat-dark:hover{border-color:rgba(0,200,122,.25);box-shadow:var(--glow-green)}
.cro-lp .feat-dark.blue:hover{border-color:rgba(75,110,245,.3);box-shadow:var(--glow-blue)}
.cro-lp .feat-icon-dark{width:48px;height:48px;border-radius:12px;background:rgba(0,200,122,.1);border:1px solid rgba(0,200,122,.2);display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:18px}
.cro-lp .feat-icon-dark.blue{background:rgba(75,110,245,.1);border-color:rgba(75,110,245,.2)}
.cro-lp .feat-dark h3{font-size:17px;font-weight:600;margin-bottom:10px}
.cro-lp .feat-dark p{font-size:14px;color:var(--cro-muted);line-height:1.65}
.cro-lp .feat-dark .feat-tag{display:inline-block;margin-top:14px;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--cro-green);opacity:.8}
.cro-lp .compliance-section{padding:80px 24px;background:#050810}
.cro-lp .compliance-inner{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
.cro-lp .compliance-left h2{font-size:clamp(26px,3.5vw,40px);font-weight:700;letter-spacing:-0.02em;margin-bottom:16px;line-height:1.2}
.cro-lp .compliance-left p{font-size:16px;color:var(--cro-muted);line-height:1.7;margin-bottom:28px}
.cro-lp .compliance-list{list-style:none;display:flex;flex-direction:column;gap:12px}
.cro-lp .compliance-list li{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--cro-muted);line-height:1.5}
.cro-lp .check{flex-shrink:0;width:18px;height:18px;border-radius:50%;background:rgba(0,200,122,.15);border:1px solid rgba(0,200,122,.3);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--cro-green);margin-top:1px}
.cro-lp .audit-card{background:var(--cro-card);border:1px solid var(--cro-border);border-radius:16px;padding:24px;font-size:12px;font-family:'JetBrains Mono','Fira Code',monospace}
.cro-lp .audit-row{padding:8px 0;border-bottom:1px solid var(--cro-border);display:flex;justify-content:space-between;gap:16px}
.cro-lp .audit-row:last-child{border-bottom:none}
.cro-lp .audit-key{color:var(--cro-dim)}
.cro-lp .audit-val{color:var(--cro-green);text-align:right;word-break:break-all}
.cro-lp .audit-val.blue{color:var(--cro-teal)}
.cro-lp .audit-title{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--cro-dim);margin-bottom:12px}
.cro-lp .demo-cta{padding:100px 24px;text-align:center;position:relative;overflow:hidden}
.cro-lp .demo-cta::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.03) 1px,transparent 1px);background-size:28px 28px}
.cro-lp .demo-cta::after{content:'';position:absolute;bottom:-300px;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse,rgba(75,110,245,0.12) 0%,rgba(0,200,122,0.06) 50%,transparent 70%)}
.cro-lp .demo-cta-inner{position:relative;max-width:640px;margin:0 auto}
.cro-lp .demo-cta h2{font-size:clamp(28px,4.5vw,52px);font-weight:700;letter-spacing:-0.03em;margin-bottom:16px;line-height:1.1}
.cro-lp .demo-cta h2 .grad{background:var(--cro-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cro-lp .demo-cta p{font-size:17px;color:var(--cro-muted);margin-bottom:36px;line-height:1.6}
.cro-lp .demo-fine{font-size:13px;color:var(--cro-dim);margin-top:16px}
.cro-lp footer{background:#050810;border-top:1px solid var(--cro-border);padding:48px 24px 32px}
.cro-lp .footer-inner{max-width:1160px;margin:0 auto}
.cro-lp .footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:40px}
.cro-lp .footer-brand{font-weight:700;font-size:18px;background:var(--cro-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:10px}
.cro-lp .footer-tagline{font-size:11px;color:var(--cro-dim);letter-spacing:.12em;text-transform:uppercase;margin-bottom:14px}
.cro-lp .footer-desc{font-size:13px;color:var(--cro-muted);line-height:1.6}
.cro-lp .footer-col h4{font-size:11px;font-weight:600;color:#64748B;margin-bottom:14px;text-transform:uppercase;letter-spacing:.1em}
.cro-lp .footer-col a{display:block;font-size:14px;color:var(--cro-muted);margin-bottom:9px;transition:color 150ms}
.cro-lp .footer-col a:hover{color:#F1F5F9}
.cro-lp .footer-bottom{border-top:1px solid var(--cro-border);padding-top:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.cro-lp .footer-bottom p{font-size:13px;color:var(--cro-dim)}
.cro-lp .reveal{opacity:0;transform:translateY(20px);transition:opacity 550ms ease-out,transform 550ms ease-out}
.cro-lp .reveal.visible{opacity:1;transform:translateY(0)}
.cro-lp .hamburger{display:none;background:none;border:1.5px solid var(--cro-border-strong);border-radius:8px;padding:7px 11px;cursor:pointer;color:#F1F5F9;font-size:18px;line-height:1;align-items:center;justify-content:center}
.cro-lp .mobile-overlay{position:fixed;inset:0;z-index:300;background:rgba(10,10,10,.97);padding:20px 24px;display:flex;flex-direction:column;overflow-y:auto}
.cro-lp .mob-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:48px}
.cro-lp .mob-close{background:none;border:none;color:#F1F5F9;font-size:26px;cursor:pointer;line-height:1;padding:4px}
.cro-lp .mobile-overlay .mob-nav{display:flex;flex-direction:column}
.cro-lp .mobile-overlay .mob-nav a{font-size:26px;font-weight:600;color:#F1F5F9;padding:18px 0;border-bottom:1px solid var(--cro-border);transition:color 150ms}
.cro-lp .mobile-overlay .mob-nav a:hover{color:var(--cro-green)}
.cro-lp .mob-cta{margin-top:40px;display:flex;flex-direction:column;gap:12px}
@media(max-width:900px){
  .cro-lp .stats-inner{grid-template-columns:repeat(2,1fr)}
  .cro-lp .flow-grid{grid-template-columns:1fr;gap:16px}
  .cro-lp .flow-grid::before{display:none}
  .cro-lp .feat-grid{grid-template-columns:1fr}
  .cro-lp .compliance-inner{grid-template-columns:1fr}
  .cro-lp .footer-top{grid-template-columns:1fr 1fr}
  .cro-lp nav{display:none}
  .cro-lp .header-btns{display:none!important}
  .cro-lp .hamburger{display:flex}
}
@media(max-width:600px){
  .cro-lp .footer-top{grid-template-columns:1fr}
  .cro-lp .hero-ctas{flex-direction:column;align-items:center}
  .cro-lp .footer-bottom{flex-direction:column;text-align:center}
  .cro-lp .hero{padding:100px 16px 60px}
}
`;

interface Props {
  onRequestDemo: () => void;
}

export default function LandingCRO({ onRequestDemo }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.cro-lp .reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="cro-lp">
        {/* Mobile overlay menu */}
        {menuOpen && (
          <div className="mobile-overlay">
            <div className="mob-head">
              <span className="logo">Bresca</span>
              <button className="mob-close" onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <nav className="mob-nav">
              <a href="#como-funciona" onClick={() => scrollTo('como-funciona')}>Plataforma</a>
              <a href="#features" onClick={() => scrollTo('features')}>Funciones</a>
              <a href="#compliance" onClick={() => scrollTo('compliance')}>Compliance</a>
            </nav>
            <div className="mob-cta">
              <button className="btn-demo-lg" onClick={() => { setMenuOpen(false); onRequestDemo(); }}>Solicitar demo</button>
              <button className="btn-ghost-lg" onClick={() => scrollTo('compliance')}>Ver documentación técnica</button>
            </div>
          </div>
        )}

        <header>
          <div className="header-inner">
            <div>
              <span className="logo">Bresca</span>
              <span className="logo-tag">for CRO</span>
            </div>
            <nav>
              <a href="#como-funciona">Plataforma</a>
              <a href="#features">Funciones</a>
              <a href="#compliance">Compliance</a>
            </nav>
            <div className="header-btns" style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" onClick={() => document.getElementById('compliance')?.scrollIntoView({ behavior: 'smooth' })}>
                Documentación
              </button>
              <button className="btn-demo" onClick={onRequestDemo}>Solicitar demo</button>
            </div>
            <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">☰</button>
          </div>
        </header>

        {/* HERO */}
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-content container">
            <div className="hero-chip">
              <span className="pulse" />
              Plataforma activa — LATAM
            </div>
            <div className="hero-tagline">Health Data Platform</div>
            <h1>Datos clínicos reales.<br /><span className="grad">Consentidos. Trazables.</span></h1>
            <p className="hero-sub">La plataforma que conecta datos de salud de pacientes reales con investigadores. Anónimo por diseño. Auditado desde el origen.</p>
            <div className="hero-ctas">
              <button className="btn-demo-lg" onClick={onRequestDemo}>Solicitar demo</button>
              <button className="btn-ghost-lg" onClick={() => document.getElementById('compliance')?.scrollIntoView({ behavior: 'smooth' })}>
                Ver documentación técnica
              </button>
            </div>

            {/* Dashboard mockup */}
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <div style={{ background: 'var(--cro-card)', border: '1px solid var(--cro-border)', borderRadius: 16, padding: 20, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                    Panel CRO — Estudio CARDIO-04
                  </span>
                  <span style={{ background: 'rgba(0,200,122,.15)', border: '1px solid rgba(0,200,122,.25)', borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: 'var(--cro-green)' }}>
                    Activo
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { val: '847', label: 'Candidatos', color: 'var(--cro-green)' },
                    { val: '312', label: 'Fit score ≥80%', color: 'var(--cro-teal)' },
                    { val: '98',  label: 'Invitados',   color: 'var(--cro-blue)' },
                    { val: '41',  label: 'Enrolled',    color: '#fff' },
                  ].map(({ val, label, color }) => (
                    <div key={label} style={{ background: '#0F172A', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#0F172A', borderRadius: 10, padding: 12, display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: '#64748B' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cro-green)', flexShrink: 0 }} />
                  <span>Último match: Pac. #a3f8… — Fit score 94% — Hematología · Cardiología</span>
                  <span style={{ marginLeft: 'auto', color: '#94A3B8', whiteSpace: 'nowrap' }}>hace 3 min</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <div className="stats-bar">
          <div className="stats-inner reveal">
            {[
              { num: '+12.000', label: 'Pacientes activos' },
              { num: '+45.000', label: 'Estudios indexados' },
              { num: '100%',   label: 'Consentimiento auditado' },
              { num: '< 48h',  label: 'Entrega de dataset' },
            ].map(({ num, label }) => (
              <div key={label} className="stat">
                <div className="stat-num">{num}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section className="how-section" id="como-funciona">
          <div className="container">
            <div className="section-label">Cómo funciona</div>
            <h2 className="section-title">De paciente a dataset.<br />Sin comprometer nada.</h2>
            <p className="section-sub">Cada paso del proceso está auditado. Cada dato tiene trazabilidad desde el origen hasta la entrega.</p>
            <div className="flow-grid reveal">
              <div className="flow-card">
                <div className="flow-num">1</div>
                <h3>Paciente consiente voluntariamente</h3>
                <p>El paciente activa su consentimiento desde la app. Granular, revocable en cualquier momento. Cada acción genera un registro inmutable en la DB.</p>
              </div>
              <div className="flow-card">
                <div className="flow-num">2</div>
                <h3>Anonimización y matching</h3>
                <p>Los datos se anonimizan con hash unidireccional. El algoritmo de matching evalúa cada perfil contra los criterios clínicos del estudio y genera un fit score.</p>
              </div>
              <div className="flow-card">
                <div className="flow-num">3</div>
                <h3>Dataset certificado en tu panel</h3>
                <p>Accedés a los candidatos por score, invitás al estudio, seguís el funnel de enrollment en tiempo real. Sin intermediarios. Sin emails. Sin hojas de cálculo.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" id="features">
          <div className="container">
            <div className="section-label">Plataforma</div>
            <h2 className="section-title">Todo lo que necesitás<br />para reclutar mejor.</h2>
            <p className="section-sub">Construido para investigadores clínicos. Integrable con tu stack. Auditado por diseño.</p>
            <div className="feat-grid reveal">
              <div className="feat-dark">
                <div className="feat-icon-dark">🎯</div>
                <h3>Matching por criterio clínico</h3>
                <p>Definís los criterios de inclusión/exclusión y el sistema evalúa cada perfil del vault: diagnósticos, biomarcadores, historial de estudios, rango etario, medicación.</p>
                <span className="feat-tag">Fit score por paciente</span>
              </div>
              <div className="feat-dark blue">
                <div className="feat-icon-dark blue">🔒</div>
                <h3>Anonimización certificada</h3>
                <p>Ningún dato identificable sale de la plataforma. Hash unidireccional por perfil. El investigador nunca ve nombre, documento ni dirección. Solo variables clínicas relevantes.</p>
                <span className="feat-tag" style={{ color: 'var(--cro-teal)' }}>Zero PII exposure</span>
              </div>
              <div className="feat-dark blue">
                <div className="feat-icon-dark blue">📊</div>
                <h3>Dashboard en tiempo real</h3>
                <p>KPIs de cohorte: candidatos, invitados, enrolled, dropout rate. Funnel de cada estudio. Alertas automáticas cuando un nuevo paciente coincide con tus criterios.</p>
                <span className="feat-tag" style={{ color: 'var(--cro-teal)' }}>Sin integraciones adicionales</span>
              </div>
              <div className="feat-dark">
                <div className="feat-icon-dark">🔗</div>
                <h3>Trazabilidad completa</h3>
                <p>Cada dato tiene su audit trail: timestamp del consentimiento, versión del ToS aceptado, hash del paciente, fecha de extracción. Reproducible y verificable en cualquier momento.</p>
                <span className="feat-tag">ICH-GCP ready</span>
              </div>
            </div>
          </div>
        </section>

        {/* COMPLIANCE */}
        <section className="compliance-section" id="compliance">
          <div className="container">
            <div className="compliance-inner reveal">
              <div className="compliance-left">
                <div className="section-label">Compliance</div>
                <h2>Datos con cadena de custodia<br />desde el origen.</h2>
                <p>Diseñado para cumplir con los estándares de privacidad y ética en investigación clínica de LATAM y requerimientos internacionales.</p>
                <ul className="compliance-list">
                  <li><span className="check">✓</span>RLS (Row Level Security) en toda la DB — ningún query accede datos cruzados</li>
                  <li><span className="check">✓</span>consent_audit append-only — el historial de consentimiento es inmutable por diseño</li>
                  <li><span className="check">✓</span>Tamaño mínimo de cohorte: 5 pacientes — k-anonimato en todas las vistas</li>
                  <li><span className="check">✓</span>Ley 25.326 (Argentina) · LGPD (Brasil) · estándares ICH-GCP</li>
                  <li><span className="check">✓</span>Audit trail exportable para submissions regulatorias</li>
                </ul>
              </div>
              <div>
                <div className="audit-card">
                  <div className="audit-title">consent_audit — registro de muestra</div>
                  {[
                    { k: 'patient_hash',      v: 'a3f8c2d1…9e4b', blue: false },
                    { k: 'layer',             v: 'therapeutic_area', blue: false },
                    { k: 'therapeutic_area',  v: 'cardiology',   blue: false },
                    { k: 'granted',           v: 'true',         blue: false },
                    { k: 'tos_version',       v: '2.1.0',        blue: false },
                    { k: 'created_at',        v: '2026-05-03 14:22:07Z', blue: true },
                    { k: 'ip_hash',           v: 'fc8a…b32d',    blue: false },
                  ].map(({ k, v, blue }) => (
                    <div key={k} className="audit-row">
                      <span className="audit-key">{k}</span>
                      <span className={`audit-val${blue ? ' blue' : ''}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DEMO CTA */}
        <section className="demo-cta">
          <div className="demo-cta-inner reveal">
            <h2>Hablemos de tu<br /><span className="grad">próximo estudio.</span></h2>
            <p>Mostramos la plataforma en vivo, te explicamos el modelo de datos y definimos si es fit para tu protocolo. Sin compromiso.</p>
            <button className="btn-demo-lg" onClick={onRequestDemo}>Solicitar demo</button>
            <p className="demo-fine">Respondemos en menos de 24 horas · Demo personalizada · Sin costo</p>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="footer-inner">
            <div className="footer-top">
              <div>
                <div className="footer-brand">Bresca</div>
                <div className="footer-tagline">Health Data Autonomy</div>
                <div className="footer-desc">Plataforma de datos clínicos para investigación. Consentimiento real. Anonimización certificada. Trazabilidad completa.</div>
              </div>
              <div className="footer-col">
                <h4>Plataforma</h4>
                <a href="#como-funciona">Cómo funciona</a>
                <a href="#features">Matching &amp; Fit Score</a>
                <a href="#features">Dashboard CRO</a>
                <a href="#">API &amp; Integraciones</a>
              </div>
              <div className="footer-col">
                <h4>Empresa</h4>
                <a href="#">Sobre Bresca</a>
                <a href="#">Para pacientes</a>
                <a href="#">Blog</a>
                <a href="#">Contacto</a>
              </div>
              <div className="footer-col">
                <h4>Legal</h4>
                <a href="#">Política de datos</a>
                <a href="#">Términos CRO</a>
                <a href="#">Compliance LATAM</a>
                <a href="#">Seguridad</a>
              </div>
            </div>
            <div className="footer-bottom">
              <p>© 2026 Bresca. Todos los derechos reservados.</p>
              <p>bresca.health · erelan@bresca.health</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
