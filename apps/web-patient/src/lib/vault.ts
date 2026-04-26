export type CategoryFilter = 'all' | string;

export const CATEGORIES = [
  { id: 'all',            label: 'Todos',        color: '#0F172A' },
  { id: 'hematología',    label: 'Sangre',       color: '#EF4444' },
  { id: 'bioquímica',     label: 'Bioquímica',   color: '#F59E0B' },
  { id: 'imágenes',       label: 'Imagen',       color: '#3B82F6' },
  { id: 'cardiología',    label: 'Corazón',      color: '#EC4899' },
  { id: 'endocrinología', label: 'Endocrino',    color: '#8B5CF6' },
  { id: 'respiratorio',   label: 'Respiratorio', color: '#06B6D4' },
  { id: 'otro',           label: 'Otro',         color: '#94A3B8' },
] as const;

export function categoryColor(cat: string): string {
  return CATEGORIES.find((c) => c.id === cat)?.color ?? '#94A3B8';
}

export function formatStudyDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function mockExtract(category: string) {
  const today = new Date().toISOString().slice(0, 10);
  const mocks: Record<string, { study_type: string; lab_name: string; study_date: string; extracted_fields: Record<string, string> }> = {
    hematología:    { study_type: 'Hemograma completo',   lab_name: 'Lab Central',      study_date: today, extracted_fields: { Hemoglobina: '14.2 g/dL', Hematocrito: '43 %', Leucocitos: '6800 /mm³', Plaquetas: '220000 /mm³' } },
    bioquímica:     { study_type: 'Perfil bioquímico',    lab_name: 'Lab Central',      study_date: today, extracted_fields: { Glucosa: '95 mg/dL', Creatinina: '0.9 mg/dL', 'Colesterol total': '185 mg/dL' } },
    imágenes:       { study_type: 'Radiografía de tórax', lab_name: 'Centro de Imagen', study_date: today, extracted_fields: { Hallazgo: 'Sin alteraciones', Conclusión: 'Tórax normal' } },
    cardiología:    { study_type: 'Electrocardiograma',   lab_name: 'Cardiología SA',   study_date: today, extracted_fields: { Ritmo: 'Sinusal regular', FC: '72 lpm', Conclusión: 'ECG normal' } },
    endocrinología: { study_type: 'Perfil tiroideo',      lab_name: 'Lab Endocrino',    study_date: today, extracted_fields: { TSH: '2.1 mUI/L', T4L: '1.2 ng/dL' } },
    respiratorio:   { study_type: 'Espirometría',         lab_name: 'Pulmonar Centro',  study_date: today, extracted_fields: { CVF: '4.2 L (95%)', VEF1: '3.5 L (92%)', Conclusión: 'Función normal' } },
  };
  return mocks[category] ?? { study_type: 'Estudio clínico', lab_name: '', study_date: today, extracted_fields: { Resultado: 'Ver documento adjunto' } };
}
