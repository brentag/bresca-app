import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

function categoryLabel(cat: string | null): string {
  const map: Record<string, string> = {
    laboratory: 'Laboratorio',
    imaging:    'Imágenes',
    cardiology: 'Cardiología',
    pathology:  'Patología',
    other:      'Otro',
  };
  return cat ? (map[cat] ?? cat) : '';
}

function fmt(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function exportStudyPDF(study: Study): void {
  const fields = (study.extracted_fields as Record<string, string>) ?? {};
  const hasFields = Object.keys(fields).length > 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ocrScore: number | null = (study as any).ocr_score ?? null;
  const scoreLabel = ocrScore == null
    ? ''
    : ocrScore < 80
      ? `<span style="color:#DC2626">Calidad OCR: ${Math.round(ocrScore)}% (baja — verificar manualmente)</span>`
      : `Calidad OCR: ${Math.round(ocrScore)}%`;

  const fieldsHtml = hasFields
    ? Object.entries(fields).map(([k, v]) =>
        `<tr><td style="padding:7px 12px;border-bottom:1px solid #E2E8F0;color:#475569;font-size:13px">${escHtml(k)}</td><td style="padding:7px 12px;border-bottom:1px solid #E2E8F0;font-weight:600;font-size:13px;text-align:right">${escHtml(String(v))}</td></tr>`
      ).join('')
    : '<tr><td colspan="2" style="padding:12px;color:#94A3B8;font-size:13px">Sin resultados extraídos</td></tr>';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bresca — ${escHtml(study.study_type)} — ${fmt(study.study_date)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0F172A; background: #fff; padding: 32px; max-width: 680px; margin: auto; }
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid #00C87A; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; }
  .logo span { color: #00C87A; }
  .tag { font-size: 11px; font-weight: 600; color: #64748B; letter-spacing: 0.06em; text-transform: uppercase; background: #F1F5F9; padding: 3px 9px; border-radius: 20px; }
  .meta { background: #F8FAFC; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; }
  .meta-row { display: flex; gap: 6px; font-size: 13px; color: #475569; margin-bottom: 4px; }
  .meta-row:last-child { margin-bottom: 0; }
  .meta-label { font-weight: 600; color: #0F172A; min-width: 90px; }
  .score-line { font-size: 12px; color: #64748B; margin-top: 10px; padding-top: 10px; border-top: 1px solid #E2E8F0; }
  h2 { font-size: 14px; font-weight: 700; color: #64748B; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; margin-bottom: 24px; }
  .disclaimer { background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #92400E; line-height: 1.6; }
  .disclaimer strong { font-weight: 700; }
  .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 16px; }
    @page { margin: 20mm; size: A4; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">bres<span>ca</span></div>
    <span class="tag">Informe para médico</span>
  </div>

  <div class="meta">
    <div class="meta-row"><span class="meta-label">Tipo de estudio</span><span>${escHtml(study.study_type)}</span></div>
    <div class="meta-row"><span class="meta-label">Categoría</span><span>${escHtml(categoryLabel(study.category))}</span></div>
    <div class="meta-row"><span class="meta-label">Fecha</span><span>${fmt(study.study_date)}</span></div>
    ${study.lab_name ? `<div class="meta-row"><span class="meta-label">Laboratorio</span><span>${escHtml(study.lab_name)}</span></div>` : ''}
    ${scoreLabel ? `<div class="score-line">${scoreLabel}</div>` : ''}
  </div>

  <h2>Resultados extraídos</h2>
  <table>
    <tbody>${fieldsHtml}</tbody>
  </table>

  <div class="disclaimer">
    <strong>Aviso importante:</strong> Este informe fue generado automáticamente por Bresca a partir del documento original del paciente y es de carácter <strong>asistivo, no diagnóstico</strong>. Los valores mostrados deben ser siempre corroborados con el documento original antes de tomar cualquier decisión clínica. Bresca no asume responsabilidad por errores de extracción automática.
  </div>

  <div class="footer">
    <span>Generado por Bresca — bresca-app-api.vercel.app</span>
    <span>${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 300);
    });
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=750,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
