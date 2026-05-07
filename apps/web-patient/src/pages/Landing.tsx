import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Space Grotesk',sans-serif;background:#fff;color:#0F172A;-webkit-font-smoothing:antialiased}
:root{
  --green:#00C87A;--blue:#4B6EF5;--teal:#00B8D4;
  --grad:linear-gradient(135deg,#00C87A 0%,#00B8D4 50%,#4B6EF5 100%);
  --bg:#F7F9FC;--white:#fff;
  --gray-50:#F8FAFC;--gray-100:#F1F5F9;--gray-200:#E2E8F0;
  --gray-400:#94A3B8;--gray-500:#64748B;--gray-600:#475569;--gray-900:#0F172A;
  --shadow-sm:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:0 4px 16px rgba(0,0,0,0.08);
  --shadow-lg:0 8px 32px rgba(0,0,0,0.12);
}
a{color:inherit;text-decoration:none}
.lp-wrap{min-height:100vh}
.container{max-width:1160px;margin:0 auto;padding:0 24px}
header{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--gray-200)}
.header-inner{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;max-width:1160px;margin:0 auto}
.logo{font-weight:700;font-size:20px;letter-spacing:-0.01em;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
nav{display:flex;align-items:center;gap:28px}
nav a{font-size:14px;font-weight:500;color:var(--gray-600);transition:color 150ms}
nav a:hover{color:var(--gray-900)}
.btn-primary{background:var(--grad);color:#fff;padding:10px 22px;border-radius:100px;font-size:14px;font-weight:600;border:none;cursor:pointer;transition:opacity 150ms,transform 150ms;white-space:nowrap}
.btn-primary:hover{opacity:.9;transform:scale(1.02)}
.btn-primary:active{transform:scale(0.98)}
.btn-outline{background:transparent;color:var(--gray-900);padding:10px 22px;border-radius:100px;font-size:14px;font-weight:600;border:1.5px solid var(--gray-200);cursor:pointer;transition:border-color 150ms}
.btn-outline:hover{border-color:var(--gray-400)}
.hero{padding:120px 24px 72px;background:linear-gradient(180deg,#fff 0%,var(--bg) 100%);text-align:center}
.tagline-badge{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(90deg,rgba(0,200,122,.1),rgba(75,110,245,.1));border:1px solid rgba(0,200,122,.25);border-radius:100px;padding:6px 16px;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--green);margin-bottom:28px}
.tagline-dot{width:6px;height:6px;border-radius:50%;background:var(--grad)}
.hero h1{font-size:clamp(40px,7vw,72px);font-weight:700;line-height:1.05;letter-spacing:-0.03em;margin-bottom:20px}
.hero h1 span{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:18px;color:var(--gray-500);max-width:520px;margin:0 auto 36px;line-height:1.6}
.hero-ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:40px}
.btn-primary-lg{background:var(--grad);color:#fff;padding:16px 32px;border-radius:100px;font-size:16px;font-weight:600;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(0,200,122,.3);transition:opacity 150ms,transform 150ms}
.btn-primary-lg:hover{opacity:.9;transform:scale(1.02)}
.btn-link{background:none;border:none;font-size:16px;font-weight:500;color:var(--gray-600);cursor:pointer;display:flex;align-items:center;gap:6px;transition:color 150ms;padding:16px 0}
.btn-link:hover{color:var(--gray-900)}
.trust-row{display:flex;justify-content:center;gap:24px;flex-wrap:wrap}
.trust-item{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--gray-500);font-weight:500}
.trust-dot{width:5px;height:5px;border-radius:50%;background:var(--green)}
.mockup-wrap{margin-top:60px;display:flex;justify-content:center}
.phone{width:240px;background:#fff;border-radius:36px;box-shadow:0 32px 80px rgba(0,0,0,0.15),0 0 0 1px rgba(0,0,0,.06);overflow:hidden}
.phone-bar{height:28px;background:#0F172A;border-radius:36px 36px 0 0;display:flex;align-items:center;justify-content:center}
.phone-notch{width:80px;height:12px;background:#1a2236;border-radius:0 0 12px 12px}
.phone-screen{background:var(--bg);padding:12px}
.ph-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.ph-title{font-size:11px;font-weight:700;color:var(--gray-900)}
.ph-badge{background:var(--grad);color:#fff;font-size:9px;font-weight:600;padding:2px 8px;border-radius:100px}
.ph-card{background:#fff;border-radius:10px;padding:10px;margin-bottom:6px;box-shadow:var(--shadow-sm);display:flex;gap:8px;align-items:center}
.ph-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px}
.ph-card-text{flex:1}
.ph-card-name{font-size:10px;font-weight:600;color:var(--gray-900)}
.ph-card-meta{font-size:9px;color:var(--gray-400)}
.ph-card-chip{font-size:8px;font-weight:600;padding:2px 6px;border-radius:100px;color:#fff;float:right;margin-left:4px}
.section{padding:80px 24px}
.section-label{font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--green);margin-bottom:12px}
.section-title{font-size:clamp(28px,4vw,42px);font-weight:700;letter-spacing:-0.02em;margin-bottom:16px;line-height:1.15}
.section-sub{font-size:17px;color:var(--gray-500);max-width:540px;line-height:1.6;margin-bottom:52px}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.feat-card{background:#fff;border-radius:16px;padding:28px;border:1px solid var(--gray-100);box-shadow:var(--shadow-sm);transition:transform 200ms,box-shadow 200ms}
.feat-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md)}
.feat-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:22px}
.feat-card h3{font-size:16px;font-weight:600;margin-bottom:8px;color:var(--gray-900)}
.feat-card p{font-size:14px;color:var(--gray-500);line-height:1.6}
.how-section{background:var(--bg);padding:80px 24px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;position:relative;margin-top:52px}
.steps::before{content:'';position:absolute;top:28px;left:calc(16.6% + 24px);right:calc(16.6% + 24px);height:2px;background:linear-gradient(90deg,var(--green),var(--teal),var(--blue));opacity:.3}
.step{text-align:center;position:relative}
.step-num{width:56px;height:56px;border-radius:50%;background:var(--grad);color:#fff;font-size:20px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(0,200,122,.25)}
.step h3{font-size:17px;font-weight:600;margin-bottom:8px}
.step p{font-size:14px;color:var(--gray-500);line-height:1.6}
.privacy-section{background:linear-gradient(135deg,#F0FDF4,#EFF6FF);padding:80px 24px;text-align:center}
.privacy-inner{max-width:640px;margin:0 auto}
.privacy-icon{width:72px;height:72px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;margin:0 auto 28px;font-size:32px}
.privacy-section h2{font-size:clamp(24px,3.5vw,36px);font-weight:700;letter-spacing:-0.02em;margin-bottom:16px}
.privacy-section p{font-size:17px;color:var(--gray-600);line-height:1.7;margin-bottom:32px}
.privacy-pills{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
.pill{background:#fff;border:1px solid var(--gray-200);border-radius:100px;padding:8px 18px;font-size:13px;font-weight:500;color:var(--gray-600);display:flex;align-items:center;gap:6px}
.pill-dot{width:6px;height:6px;border-radius:50%}
.cro-teaser{background:linear-gradient(135deg,#0F172A 0%,#111827 100%);padding:72px 24px;text-align:center;position:relative;overflow:hidden}
.cro-teaser::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:28px 28px}
.cro-teaser-inner{position:relative;max-width:600px;margin:0 auto}
.cro-chip{display:inline-block;background:rgba(0,200,122,.15);border:1px solid rgba(0,200,122,.3);border-radius:100px;padding:5px 14px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--green);margin-bottom:20px}
.cro-teaser h2{font-size:clamp(24px,3.5vw,36px);font-weight:700;color:#fff;margin-bottom:16px;line-height:1.2}
.cro-teaser p{font-size:16px;color:#94A3B8;line-height:1.7;margin-bottom:32px}
.btn-ghost{background:transparent;border:1.5px solid rgba(255,255,255,.25);color:#fff;padding:12px 28px;border-radius:100px;font-size:15px;font-weight:600;cursor:pointer;transition:border-color 150ms,background 150ms}
.btn-ghost:hover{border-color:rgba(255,255,255,.6);background:rgba(255,255,255,.06)}
.final-cta{padding:100px 24px;text-align:center}
.final-cta h2{font-size:clamp(28px,4.5vw,52px);font-weight:700;letter-spacing:-0.03em;margin-bottom:16px;line-height:1.1}
.final-cta p{font-size:17px;color:var(--gray-500);margin-bottom:36px}
.fine-print{font-size:13px;color:var(--gray-400);margin-top:16px}
footer{background:var(--gray-50);border-top:1px solid var(--gray-200);padding:48px 24px 32px}
.footer-inner{max-width:1160px;margin:0 auto}
.footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:40px}
.footer-brand{font-weight:700;font-size:18px;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:10px}
.footer-tagline{font-size:13px;color:var(--gray-400);letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px}
.footer-desc{font-size:13px;color:var(--gray-500);line-height:1.6}
.footer-col h4{font-size:13px;font-weight:600;color:var(--gray-700,#374151);margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em}
.footer-col a{display:block;font-size:14px;color:var(--gray-500);margin-bottom:8px;transition:color 150ms}
.footer-col a:hover{color:var(--gray-900)}
.footer-bottom{border-top:1px solid var(--gray-200);padding-top:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.footer-bottom p{font-size:13px;color:var(--gray-400)}
.sticky-cta{display:none;position:fixed;bottom:0;left:0;right:0;padding:12px 16px 24px;background:rgba(255,255,255,.95);backdrop-filter:blur(10px);border-top:1px solid var(--gray-200);z-index:90}
.reveal{opacity:0;transform:translateY(20px);transition:opacity 500ms ease-out,transform 500ms ease-out}
.reveal.visible{opacity:1;transform:translateY(0)}
@media(max-width:900px){
  .features-grid{grid-template-columns:repeat(2,1fr)}
  .steps{grid-template-columns:1fr;gap:28px}
  .steps::before{display:none}
  .footer-top{grid-template-columns:1fr 1fr}
  nav>a{display:none}
}
@media(max-width:600px){
  .features-grid{grid-template-columns:1fr}
  .footer-top{grid-template-columns:1fr}
  .footer-bottom{flex-direction:column;text-align:center}
  .sticky-cta{display:block}
  .hero-ctas{flex-direction:column;align-items:center}
}
`;

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    function checkViewport() {
      const sticky = document.querySelector('.sticky-cta') as HTMLElement | null;
      if (sticky) sticky.style.display = window.innerWidth > 600 ? 'none' : 'block';
    }
    checkViewport();
    window.addEventListener('resize', checkViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkViewport);
    };
  }, []);

  const goToAuth = () => navigate('/welcome');
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header>
        <div className="header-inner">
          <img src="/logo-horizontal-bicolor.png" alt="Bresca" style={{ height: 36, width: 'auto' }} />
          <nav>
            <a href="#features">Funciones</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#privacidad">Privacidad</a>
          </nav>
          <button className="btn-primary" onClick={goToAuth}>Crear cuenta gratis</button>
        </div>
      </header>

      <div className="lp-wrap">
        {/* HERO */}
        <section className="hero">
          <div className="tagline-badge">
            <span className="tagline-dot" />
            Health Data Autonomy
          </div>
          <h1>Tu historial médico,<br /><span>siempre con vos.</span></h1>
          <p className="hero-sub">Guardá todos tus estudios en un lugar seguro. Accedé desde donde estés. Compartí con tu médico en segundos.</p>
          <div className="hero-ctas">
            <button className="btn-primary-lg" onClick={goToAuth}>Crear cuenta gratis</button>
            <button className="btn-link" onClick={() => scrollTo('como-funciona')}>
              Ver cómo funciona <span>→</span>
            </button>
          </div>
          <div className="trust-row">
            <span className="trust-item"><span className="trust-dot" /> Cifrado end-to-end</span>
            <span className="trust-item"><span className="trust-dot" /> Sin publicidad</span>
            <span className="trust-item"><span className="trust-dot" /> Para toda la familia</span>
            <span className="trust-item"><span className="trust-dot" /> Gratis para empezar</span>
          </div>
          <div className="mockup-wrap">
            <div className="phone">
              <div className="phone-bar"><div className="phone-notch" /></div>
              <div className="phone-screen">
                <div className="ph-header">
                  <span className="ph-title">Mi Vault</span>
                  <span className="ph-badge">3 nuevos</span>
                </div>
                <div className="ph-card">
                  <div className="ph-icon" style={{ background: '#EFF6FF' }}>🩸</div>
                  <div className="ph-card-text">
                    <div className="ph-card-name">Hemograma completo</div>
                    <div className="ph-card-meta">Lab. Central · 14/04/2026</div>
                  </div>
                  <span className="ph-card-chip" style={{ background: '#00C87A' }}>OK</span>
                </div>
                <div className="ph-card">
                  <div className="ph-icon" style={{ background: '#F0FDF4' }}>💊</div>
                  <div className="ph-card-text">
                    <div className="ph-card-name">Glucemia en ayunas</div>
                    <div className="ph-card-meta">Lab. Rivadavia · 02/03/2026</div>
                  </div>
                  <span className="ph-card-chip" style={{ background: '#F59E0B' }}>Rev.</span>
                </div>
                <div className="ph-card">
                  <div className="ph-icon" style={{ background: '#FFF7ED' }}>🫀</div>
                  <div className="ph-card-text">
                    <div className="ph-card-name">Ecocardiograma</div>
                    <div className="ph-card-meta">Clínica San Martín · 18/01/2026</div>
                  </div>
                  <span className="ph-card-chip" style={{ background: '#4B6EF5' }}>PDF</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" id="features">
          <div className="container">
            <div className="section-label">Funciones</div>
            <h2 className="section-title">Todo lo que necesitás<br />para tu salud, en un lugar.</h2>
            <p className="section-sub">Diseñado para que no dependas de ningún sistema de salud, laboratorio o médico en particular.</p>
            <div className="features-grid reveal">
              <div className="feat-card">
                <div className="feat-icon" style={{ background: '#F0FDF4' }}>🗂️</div>
                <h3>Vault digital</h3>
                <p>Todos tus estudios organizados automáticamente. Por tipo, categoría y fecha. Sin carpetas, sin escáneres.</p>
              </div>
              <div className="feat-card">
                <div className="feat-icon" style={{ background: '#EFF6FF' }}>🤖</div>
                <h3>OCR con IA</h3>
                <p>Fotografiá o subí tu estudio y la IA extrae los valores automáticamente. Revisás y confirmás antes de guardar.</p>
              </div>
              <div className="feat-card">
                <div className="feat-icon" style={{ background: '#F0FDF4' }}>📲</div>
                <h3>QR para tu médico</h3>
                <p>Generá un código QR temporal y mostráselo a tu médico. Ve lo que autorizás, sin que tenga que registrarse.</p>
              </div>
              <div className="feat-card">
                <div className="feat-icon" style={{ background: '#EFF6FF' }}>💬</div>
                <h3>Asistente IA</h3>
                <p>Preguntale a tu asistente: "¿Cuál fue mi última glucemia?" o "¿Tomé algún antibiótico este año?" Responde con tus datos reales.</p>
              </div>
              <div className="feat-card">
                <div className="feat-icon" style={{ background: '#FFF7ED' }}>👨‍👩‍👧</div>
                <h3>Gestión familiar</h3>
                <p>Administrá los estudios de toda tu familia desde una sola cuenta. Cada perfil es independiente y privado.</p>
              </div>
              <div className="feat-card" style={{ borderColor: 'rgba(0,200,122,.2)', background: 'linear-gradient(135deg,#F0FDF4,#fff)' }}>
                <div className="feat-icon" style={{ background: 'var(--grad)' }}>🔒</div>
                <h3 style={{ background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Privacidad total</h3>
                <p>Tus datos son tuyos. Nunca los vendemos. Nunca los compartimos sin tu permiso explícito. Siempre.</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="how-section" id="como-funciona">
          <div className="container">
            <div className="section-label">Cómo funciona</div>
            <h2 className="section-title">Tres pasos, y listo.</h2>
            <p className="section-sub">Sin complicaciones. Sin formularios interminables. Sin dependencia del sistema.</p>
            <div className="steps reveal">
              <div className="step">
                <div className="step-num">1</div>
                <h3>Subí o fotografiá</h3>
                <p>Sacá fotos directamente desde la app o subí el PDF. Funciona con cualquier laboratorio o clínica.</p>
              </div>
              <div className="step">
                <div className="step-num">2</div>
                <h3>La IA extrae los datos</h3>
                <p>En segundos, tu asistente identifica tipo de estudio, fecha, laboratorio y todos los valores relevantes.</p>
              </div>
              <div className="step">
                <div className="step-num">3</div>
                <h3>Accedé y compartí</h3>
                <p>Tu historial siempre disponible, desde cualquier dispositivo. Compartí solo lo que querés, cuando querés.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PRIVACY */}
        <section className="privacy-section" id="privacidad">
          <div className="privacy-inner reveal">
            <div className="privacy-icon">🛡️</div>
            <h2>Tus datos son tuyos.<br />Sin letra chica.</h2>
            <p>No vendemos datos. No hacemos publicidad médica. No compartimos nada sin tu consentimiento explícito.<br />
              Y si decidís participar en investigación médica de forma anónima — es opcional, siempre reversible, y vos controlás todo.</p>
            <div className="privacy-pills">
              <span className="pill"><span className="pill-dot" style={{ background: 'var(--green)' }} />Cifrado AES-256</span>
              <span className="pill"><span className="pill-dot" style={{ background: 'var(--blue)' }} />Sin publicidad</span>
              <span className="pill"><span className="pill-dot" style={{ background: 'var(--teal)' }} />Consentimiento granular</span>
              <span className="pill"><span className="pill-dot" style={{ background: 'var(--green)' }} />Revocación en un tap</span>
              <span className="pill"><span className="pill-dot" style={{ background: 'var(--blue)' }} />Datos nunca vendidos</span>
            </div>
          </div>
        </section>

        {/* CRO TEASER */}
        <section className="cro-teaser">
          <div className="cro-teaser-inner reveal">
            <div className="cro-chip">Para investigadores</div>
            <h2>Tus datos pueden avanzar la medicina.<br />Vos decidís cuándo.</h2>
            <p>Si querés participar en investigación clínica de forma anónima, Bresca te conecta con estudios donde tus datos pueden ser útiles. Sin intermediarios. Sin perder la privacidad.</p>
            <button className="btn-ghost" onClick={() => scrollTo('privacidad')}>Conocer más sobre privacidad →</button>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final-cta">
          <div className="container reveal">
            <h2>Empezá hoy.<br />
              <span style={{ background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Es gratis.
              </span>
            </h2>
            <p>Tu historial médico organizado, siempre con vos, desde el primer día.</p>
            <button className="btn-primary-lg" onClick={goToAuth}>Crear cuenta gratis</button>
            <p className="fine-print">Gratis · Sin tarjeta de crédito · Sin compromiso</p>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="footer-inner">
            <div className="footer-top">
              <div>
                <img src="/logo-horizontal-bicolor.png" alt="Bresca" style={{ height: 28, width: 'auto', marginBottom: 10 }} />
                <div className="footer-tagline">Health Data Autonomy</div>
                <div className="footer-desc">La plataforma de portabilidad de datos de salud para LATAM. Tus estudios, tus datos, tu decisión.</div>
              </div>
              <div className="footer-col">
                <h4>Producto</h4>
                <a href="#features">Cómo funciona</a>
                <a href="#privacidad">Seguridad</a>
                <a href="#features">Gestión familiar</a>
                <a href="#como-funciona">Para médicos</a>
              </div>
              <div className="footer-col">
                <h4>Empresa</h4>
                <a href="#">Sobre Bresca</a>
                <a href="#">Para CROs</a>
                <a href="#">Blog</a>
                <a href="#">Contacto</a>
              </div>
              <div className="footer-col">
                <h4>Legal</h4>
                <a href="#">Privacidad</a>
                <a href="#">Términos de uso</a>
                <a href="#">Consentimiento</a>
                <a href="#">Compliance</a>
              </div>
            </div>
            <div className="footer-bottom">
              <p>© 2026 Bresca. Todos los derechos reservados.</p>
              <p>Hecho con cuidado en LATAM <span style={{ fontSize: 9, color: '#CBD5E1', fontFamily: 'monospace', marginLeft: 8, userSelect: 'none' }}>{__BUILD_VERSION__}</span></p>
            </div>
          </div>
        </footer>
      </div>

      {/* Sticky mobile CTA */}
      <div className="sticky-cta">
        <button className="btn-primary-lg" style={{ width: '100%', padding: '14px' }} onClick={goToAuth}>
          Crear cuenta gratis
        </button>
      </div>
    </>
  );
}
