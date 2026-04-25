// Onboarding screens — trust-first, value before data requests
// Screens: welcome, value1, value2, value3, profile, consent-intro

function OnboardingScreen() {
  const [s, d] = useAppState();
  const step = s.onboardStep || 0;

  const screens = [Welcome, Value1, Value2, Value3, ProfileSetup, ConsentIntro];
  const Screen = screens[Math.min(step, screens.length - 1)];

  return React.createElement(Screen, {
    onNext: () => {
      if (step >= screens.length - 1) {
        d({ mode: 'app', tab: 'home', screen: 'home' });
      } else {
        d({ onboardStep: step + 1 });
      }
    },
    onSkip: () => d({ mode: 'app', tab: 'home', screen: 'home' }),
    step,
    totalSteps: screens.length,
  });
}

function ProgressDots({ step, total }) {
  return React.createElement('div', { style:{ display:'flex', gap:6, justifyContent:'center', marginBottom:24 } },
    ...Array.from({ length: total }, (_, i) =>
      React.createElement('div', { key:i, style:{ width: i===step ? 20 : 6, height:6, borderRadius:100, background: i===step ? AppColors.green : '#E2E8F0', transition:'all 300ms' } })
    )
  );
}

function OnboardBtn({ label, onClick, outline }) {
  return React.createElement('button', {
    onClick,
    style: { width:'100%', padding:'14px', borderRadius:100, border: outline ? `2px solid ${AppColors.border}` : 'none', background: outline ? 'transparent' : AppColors.grad, color: outline ? AppColors.text2 : '#fff', fontSize:15, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' }
  }, label);
}

function Welcome({ onNext, step, totalSteps }) {
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', textAlign:'center' } },
      React.createElement('div', { style:{ width:80, height:80, borderRadius:24, background:AppColors.grad, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, boxShadow:'0 8px 24px rgba(0,200,122,0.3)' } },
        React.createElement(Icon, { name:'heart', size:36, color:'#fff' })
      ),
      React.createElement('img', { src:'assets/logo-horizontal-bicolor.png', alt:'Bresca', style:{ height:28, marginBottom:28 } }),
      React.createElement('h1', { style:{ fontSize:26, fontWeight:700, color:AppColors.text1, lineHeight:1.2, marginBottom:12 } }, 'Tu historial médico,\nsiempre con vos.'),
      React.createElement('p', { style:{ fontSize:15, color:AppColors.text2, lineHeight:1.65, maxWidth:280, marginBottom:36 } },
        'Bresca guarda, organiza y te ayuda a entender todos tus estudios médicos — sin importar dónde los hiciste.'
      ),
      React.createElement(ProgressDots, { step, total: totalSteps }),
      React.createElement(OnboardBtn, { label: 'Comenzar →', onClick: onNext }),
    )
  );
}

function Value1({ onNext, onSkip, step, totalSteps }) {
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', padding:'40px 24px 24px' } },
      React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' } },
        React.createElement('div', { style:{ width:100, height:100, borderRadius:28, background:'rgba(0,200,122,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28, border:`2px solid rgba(0,200,122,0.2)` } },
          React.createElement(Icon, { name:'folder', size:48, color:AppColors.green })
        ),
        React.createElement(Pill, { children:'Vault de Salud' }),
        React.createElement('h2', { style:{ fontSize:24, fontWeight:700, color:AppColors.text1, marginTop:14, marginBottom:12, lineHeight:1.25 } }, 'Todos tus estudios en un solo lugar'),
        React.createElement('p', { style:{ fontSize:15, color:AppColors.text2, lineHeight:1.65, maxWidth:280 } },
          'Subí radiografías, análisis, recetas y ecografías. Bresca los organiza automáticamente y los hace legibles.'
        ),
      ),
      React.createElement(ProgressDots, { step, total: totalSteps }),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
        React.createElement(OnboardBtn, { label: 'Siguiente →', onClick: onNext }),
        React.createElement(OnboardBtn, { label: 'Saltar introducción', onClick: onSkip, outline: true }),
      )
    )
  );
}

function Value2({ onNext, onSkip, step, totalSteps }) {
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', padding:'40px 24px 24px' } },
      React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' } },
        React.createElement('div', { style:{ width:100, height:100, borderRadius:28, background:'rgba(75,110,245,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28, border:'2px solid rgba(75,110,245,0.2)' } },
          React.createElement(Icon, { name:'zap', size:48, color:AppColors.blue })
        ),
        React.createElement(Pill, { children:'IA Copilot', color:AppColors.blue }),
        React.createElement('h2', { style:{ fontSize:24, fontWeight:700, color:AppColors.text1, marginTop:14, marginBottom:12, lineHeight:1.25 } }, 'Una IA que entiende tu historia clínica'),
        React.createElement('p', { style:{ fontSize:15, color:AppColors.text2, lineHeight:1.65, maxWidth:280 } },
          'Preguntale sobre tus resultados en lenguaje simple. Te explica qué significan, sin reemplazar a tu médico.'
        ),
        React.createElement('div', { style:{ marginTop:24, background:AppColors.bg, borderRadius:14, padding:'12px 16px', textAlign:'left', maxWidth:280, border:`1px solid ${AppColors.border}` } },
          React.createElement('p', { style:{ fontSize:12, color:AppColors.text3, marginBottom:4 } }, 'Ejemplo de consulta:'),
          React.createElement('p', { style:{ fontSize:13, color:AppColors.text1, fontStyle:'italic' } }, '"¿Qué significa que mi glucemia esté en 127 mg/dL?"'),
        ),
      ),
      React.createElement(ProgressDots, { step, total: totalSteps }),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
        React.createElement(OnboardBtn, { label: 'Siguiente →', onClick: onNext }),
        React.createElement(OnboardBtn, { label: 'Saltar introducción', onClick: onSkip, outline: true }),
      )
    )
  );
}

function Value3({ onNext, onSkip, step, totalSteps }) {
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', padding:'40px 24px 24px' } },
      React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' } },
        React.createElement('div', { style:{ width:100, height:100, borderRadius:28, background:'rgba(0,184,212,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28, border:'2px solid rgba(0,184,212,0.2)' } },
          React.createElement(Icon, { name:'share', size:48, color:AppColors.teal })
        ),
        React.createElement(Pill, { children:'Compartir Seguro', color:AppColors.teal }),
        React.createElement('h2', { style:{ fontSize:24, fontWeight:700, color:AppColors.text1, marginTop:14, marginBottom:12, lineHeight:1.25 } }, 'Compartí con tu médico al instante'),
        React.createElement('p', { style:{ fontSize:15, color:AppColors.text2, lineHeight:1.65, maxWidth:280 } },
          'Generá un QR temporal. Tu médico ve lo que vos elegís, por el tiempo que vos decidís. Sin registros, sin apps.'
        ),
        React.createElement('div', { style:{ marginTop:20, display:'flex', gap:12, justifyContent:'center' } },
          ['48hs de acceso','Solo lectura','Vos decidís qué'].map((t,i) =>
            React.createElement('div', { key:i, style:{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:AppColors.text2 } },
              React.createElement(Icon, { name:'check', size:12, color:AppColors.green }), t
            )
          )
        ),
      ),
      React.createElement(ProgressDots, { step, total: totalSteps }),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
        React.createElement(OnboardBtn, { label: 'Crear mi perfil →', onClick: onNext }),
        React.createElement(OnboardBtn, { label: 'Saltar introducción', onClick: onSkip, outline: true }),
      )
    )
  );
}

function ProfileSetup({ onNext, step, totalSteps }) {
  const [name, setName] = React.useState('');
  const [year, setYear] = React.useState('');
  const [conditions, setConditions] = React.useState([]);
  const opts = ['Diabetes', 'Hipertensión', 'Oncología', 'Cardiopatía', 'Ninguna'];
  const toggle = (c) => setConditions(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev, c]);

  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'28px 20px 16px' } },
      React.createElement(ProgressDots, { step, total: totalSteps }),
      React.createElement('h2', { style:{ fontSize:22, fontWeight:700, color:AppColors.text1, marginBottom:4 } }, 'Tu perfil'),
      React.createElement('p', { style:{ fontSize:13, color:AppColors.text2, marginBottom:24 } }, 'Solo para personalizar tu experiencia.'),

      React.createElement('div', { style:{ marginBottom:14 } },
        React.createElement('label', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, display:'block', marginBottom:5, letterSpacing:'0.04em' } }, 'NOMBRE'),
        React.createElement('input', { value:name, onChange:e=>setName(e.target.value), placeholder:'¿Cómo te llamás?', style:{ width:'100%', padding:'12px 14px', borderRadius:10, border:`1.5px solid ${AppColors.border}`, fontSize:15, fontFamily:"'Space Grotesk',sans-serif", color:AppColors.text1, outline:'none', boxSizing:'border-box' } })
      ),
      React.createElement('div', { style:{ marginBottom:20 } },
        React.createElement('label', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, display:'block', marginBottom:5, letterSpacing:'0.04em' } }, 'AÑO DE NACIMIENTO'),
        React.createElement('input', { value:year, onChange:e=>setYear(e.target.value), placeholder:'ej. 1985', type:'number', style:{ width:'100%', padding:'12px 14px', borderRadius:10, border:`1.5px solid ${AppColors.border}`, fontSize:15, fontFamily:"'Space Grotesk',sans-serif", color:AppColors.text1, outline:'none', boxSizing:'border-box' } })
      ),
      React.createElement('div', { style:{ marginBottom:24 } },
        React.createElement('label', { style:{ fontSize:12, fontWeight:600, color:AppColors.text2, display:'block', marginBottom:8, letterSpacing:'0.04em' } }, 'CONDICIONES DE SALUD (opcional)'),
        React.createElement('div', { style:{ display:'flex', flexWrap:'wrap', gap:8 } },
          opts.map(c => React.createElement('button', {
            key:c, onClick:()=>toggle(c),
            style:{ padding:'7px 14px', borderRadius:100, border:`1.5px solid ${conditions.includes(c) ? AppColors.green : AppColors.border}`, background: conditions.includes(c) ? AppColors.greenLight : 'transparent', color: conditions.includes(c) ? AppColors.green : AppColors.text2, fontSize:13, fontWeight:500, fontFamily:"'Space Grotesk',sans-serif", cursor:'pointer' }
          }, c))
        )
      ),
      React.createElement('div', { style:{ background:'#F0FDF4', borderRadius:12, padding:'12px 14px', marginBottom:20, display:'flex', gap:10 } },
        React.createElement(Icon, { name:'shield', size:16, color:AppColors.green }),
        React.createElement('p', { style:{ fontSize:12, color:'#166534', lineHeight:1.5 } }, 'Tu información es privada. Nunca la compartimos sin tu consentimiento explícito.')
      ),
      React.createElement(OnboardBtn, { label: 'Continuar →', onClick: onNext }),
    )
  );
}

function ConsentIntro({ onNext, step, totalSteps }) {
  return React.createElement(ScreenWrapper, { bg:'#fff' },
    React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', padding:'28px 20px 20px' } },
      React.createElement(ProgressDots, { step, total: totalSteps }),
      React.createElement('div', { style:{ width:56, height:56, borderRadius:16, background:'rgba(75,110,245,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 } },
        React.createElement(Icon, { name:'flasklg', size:28, color:AppColors.blue })
      ),
      React.createElement('h2', { style:{ fontSize:22, fontWeight:700, color:AppColors.text1, marginBottom:10 } }, 'Sobre la investigación médica'),
      React.createElement('p', { style:{ fontSize:14, color:AppColors.text2, lineHeight:1.7, marginBottom:20 } },
        'Bresca colabora con organizaciones de investigación clínica. Podés elegir contribuir con tus datos de forma anónima.'
      ),
      ['Siempre es optativo — vos decidís', 'Tus datos nunca se identifican', 'Podés revocar en cualquier momento', 'Recibís información sobre estudios relevantes'].map((t,i) =>
        React.createElement('div', { key:i, style:{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12 } },
          React.createElement('div', { style:{ width:20, height:20, borderRadius:'50%', background:AppColors.greenLight, border:`1px solid ${AppColors.greenBorder}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 } },
            React.createElement(Icon, { name:'check', size:10, color:AppColors.green })
          ),
          React.createElement('p', { style:{ fontSize:14, color:AppColors.text1 } }, t)
        )
      ),
      React.createElement('div', { style:{ flex:1 } }),
      React.createElement('p', { style:{ fontSize:11, color:AppColors.text3, textAlign:'center', marginBottom:12 } }, 'Podés explorar y cambiar estas opciones en Configuración → Centro de Consentimiento en cualquier momento.'),
      React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
        React.createElement(OnboardBtn, { label: '¡Entendido, empezar!', onClick: onNext }),
        React.createElement(OnboardBtn, { label: 'Configurar más tarde', onClick: onNext, outline:true }),
      )
    )
  );
}

Object.assign(window, { OnboardingScreen });
