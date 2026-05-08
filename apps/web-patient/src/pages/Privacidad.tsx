import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Privacidad() {
  const nav = useNavigate();

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
        <button
          onClick={() => nav(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 15, cursor: 'pointer', minHeight: 44, padding: 0 }}
        >
          <ArrowLeft size={18} /> Volver
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Política de privacidad</span>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 680, width: '100%', margin: '0 auto' }}>

        <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 24 }}>
          Última actualización: mayo de 2026
        </p>

        <Section title="1. Quiénes somos">
          <p>
            Bresca es una plataforma de gestión de estudios médicos personales operada bajo la marca Bresca.
            El responsable del tratamiento de datos es Bresca (en adelante, "nosotros" o "la plataforma").
          </p>
          <p>
            Contacto del Responsable de Protección de Datos (DPO):{' '}
            <a href="mailto:dpo@bresca.io" style={{ color: '#4B6EF5' }}>dpo@bresca.io</a>
          </p>
        </Section>

        <Section title="2. Datos que recopilamos">
          <p>Recopilamos únicamente los datos necesarios para brindar el servicio:</p>
          <ul>
            <li><strong>Identificación:</strong> dirección de correo electrónico (para autenticación).</li>
            <li><strong>Perfil:</strong> nombre, año de nacimiento, condiciones de salud seleccionadas.</li>
            <li><strong>Estudios médicos:</strong> archivos (imágenes, PDF) que el usuario sube voluntariamente, y los campos extraídos automáticamente mediante OCR (tipo de estudio, laboratorio, fecha, valores numéricos).</li>
            <li><strong>Consentimiento:</strong> registros de aceptación de términos y consentimiento informado (append-only, no modificables).</li>
            <li><strong>Datos técnicos:</strong> tokens de sesión y logs de operación necesarios para el funcionamiento.</li>
          </ul>
          <p>
            <strong>No recopilamos</strong> datos de geolocalización, datos biométricos ni realizamos seguimiento publicitario.
          </p>
        </Section>

        <Section title="3. Finalidad del tratamiento">
          <ul>
            <li>Almacenar y organizar los estudios médicos personales del usuario.</li>
            <li>Extraer y estructurar resultados mediante procesamiento automático (OCR con IA).</li>
            <li>Brindar asistencia informativa a través del copiloto de IA (no diagnóstica).</li>
            <li>Permitir compartir estudios con profesionales de salud mediante códigos QR temporales.</li>
            <li>Conectar, con consentimiento explícito, datos anonimizados con investigación clínica.</li>
          </ul>
        </Section>

        <Section title="4. Transferencia internacional de datos">
          <p>
            Los datos se almacenan en servidores de <strong>Supabase Inc.</strong> (infraestructura AWS) ubicados en la región{' '}
            <strong>us-east-2 (Ohio, Estados Unidos)</strong>.
          </p>
          <p>
            De conformidad con el <strong>Art. 12 de la Ley 25.326</strong> (Habeas Data, Argentina), informamos que sus datos
            son transferidos a un país que puede no contar con un nivel de protección adecuado equivalente al argentino.
            Al crear su cuenta y aceptar estos términos, usted presta consentimiento expreso e informado para dicha transferencia
            internacional, en los términos del Art. 12 inc. 1 apartado a) de la Ley 25.326.
          </p>
          <p>
            Las transferencias están sujetas a las políticas de privacidad y seguridad de Supabase Inc.
            (SOC 2 Type II, cifrado en tránsito TLS 1.2+ y en reposo AES-256).
          </p>
        </Section>

        <Section title="5. Base legal">
          <p>El tratamiento se realiza sobre la base de:</p>
          <ul>
            <li><strong>Consentimiento explícito</strong> del titular al crear la cuenta y aceptar los términos.</li>
            <li><strong>Ejecución del contrato</strong> de servicio aceptado al registrarse.</li>
            <li><strong>Cumplimiento legal</strong> para registros de consentimiento que la normativa exige conservar.</li>
          </ul>
        </Section>

        <Section title="6. Plazo de conservación">
          <p>
            Los datos se conservan mientras la cuenta esté activa. Al eliminar su cuenta, se eliminan permanentemente
            todos sus estudios, archivos, perfil y datos de uso. Los registros de consentimiento se anonimizarán
            (no se eliminan, ya que la normativa exige su conservación con fines de auditoría).
          </p>
          <p>
            Los borradores temporales de OCR (study_drafts) se eliminan automáticamente a las 24 horas.
          </p>
        </Section>

        <Section title="7. Sus derechos (Ley 25.326)">
          <p>Como titular de datos, tiene derecho a:</p>
          <ul>
            <li><strong>Acceso:</strong> solicitar información sobre los datos que conservamos sobre usted.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
            <li><strong>Supresión:</strong> solicitar la eliminación de sus datos ("derecho al olvido").</li>
            <li><strong>Confidencialidad:</strong> los datos sensibles de salud gozan de protección especial bajo el Art. 7 Ley 25.326.</li>
          </ul>
          <p>
            Para ejercer estos derechos, escriba a{' '}
            <a href="mailto:dpo@bresca.io" style={{ color: '#4B6EF5' }}>dpo@bresca.io</a> o elimine su cuenta
            directamente desde Configuración → Eliminar mi cuenta.
          </p>
          <p>
            Tiene derecho a presentar una reclamación ante la{' '}
            <strong>Agencia de Acceso a la Información Pública (AAIP)</strong> si considera que sus derechos
            no han sido atendidos: <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noopener noreferrer" style={{ color: '#4B6EF5' }}>www.argentina.gob.ar/aaip</a>.
          </p>
        </Section>

        <Section title="8. Datos de salud — categoría especial">
          <p>
            Los estudios médicos constituyen <strong>datos sensibles</strong> en los términos del Art. 2 y Art. 7
            de la Ley 25.326. Su tratamiento requiere consentimiento expreso del titular y está sujeto a
            medidas de seguridad reforzadas:
          </p>
          <ul>
            <li>Acceso restringido por RLS (Row Level Security) a nivel de base de datos.</li>
            <li>Los archivos de estudios solo son accesibles mediante URLs firmadas temporales (1 hora).</li>
            <li>El copiloto de IA no transmite datos personales identificables a servicios de terceros.</li>
          </ul>
        </Section>

        <Section title="9. Investigación clínica (B2B CRO)">
          <p>
            Bresca puede, con su <strong>consentimiento explícito y separado</strong>, conectar datos anonimizados
            de su perfil y estudios con organizaciones de investigación clínica.
          </p>
          <p>
            En este caso: (a) los datos se transfieren exclusivamente en forma anonimizada con k-anonimato mínimo de 5;
            (b) nunca se transmite su nombre, correo ni identificador directo; (c) puede revocar este consentimiento
            en cualquier momento desde Configuración → Centro de consentimiento.
          </p>
        </Section>

        <Section title="10. Seguridad">
          <p>Implementamos las siguientes medidas técnicas y organizativas:</p>
          <ul>
            <li>Cifrado TLS 1.2+ en tránsito y AES-256 en reposo.</li>
            <li>Autenticación por magic link (sin contraseñas almacenadas).</li>
            <li>Políticas de Row Level Security en toda tabla con datos de usuario.</li>
            <li>Acceso administrativo restringido mediante Service Role Key en servidor backend únicamente.</li>
            <li>Logs de consentimiento append-only (no modificables).</li>
          </ul>
        </Section>

        <Section title="11. Cookies y almacenamiento local">
          <p>
            Usamos almacenamiento local del navegador (localStorage) exclusivamente para:
          </p>
          <ul>
            <li>Mantener la sesión de autenticación (token de Supabase).</li>
            <li>Preferencias de la interfaz (ej.: activar/desactivar sugerencia de GPT Salud).</li>
          </ul>
          <p>No usamos cookies de seguimiento ni publicidad de terceros.</p>
        </Section>

        <Section title="12. Contacto y consultas">
          <p>
            Para cualquier consulta sobre esta política o el tratamiento de sus datos:{' '}
            <a href="mailto:dpo@bresca.io" style={{ color: '#4B6EF5' }}>dpo@bresca.io</a>
          </p>
          <p>
            Nos comprometemos a responder en un plazo máximo de 30 días hábiles, conforme lo exige la Ley 25.326.
          </p>
        </Section>

        <div style={{ marginTop: 32, padding: '16px', background: '#EEF2FF', borderRadius: 12, border: '1px solid #C7D2FE' }}>
          <p style={{ fontSize: 12, color: '#3730A3', margin: 0, lineHeight: 1.6 }}>
            Esta política fue redactada conforme a la <strong>Ley 25.326</strong> de Protección de Datos Personales
            de la República Argentina y las disposiciones complementarias de la AAIP. Bresca es una plataforma
            de gestión personal de datos de salud — no es un servicio médico ni reemplaza la consulta profesional.
          </p>
        </div>

        <p style={{ fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 32, marginBottom: 8 }}>
          Bresca · dpo@bresca.io · Mayo 2026
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #E2E8F0' }}>
        {title}
      </h2>
      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}
