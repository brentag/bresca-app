export type CategoryFilter = 'all' | string;

export const CATEGORIES = [
  { id: 'all',            label: 'Todos',        color: '#0F172A' },
  { id: 'hematología',    label: 'Sangre',       color: '#EF4444' },
  { id: 'bioquímica',     label: 'Bioquímica',   color: '#F59E0B' },
  { id: 'imágenes',       label: 'Imagen',       color: '#3B82F6' },
  { id: 'cardiología',    label: 'Corazón',      color: '#EC4899' },
  { id: 'endocrinología', label: 'Endocrino',    color: '#8B5CF6' },
  { id: 'respiratorio',   label: 'Respiratorio', color: '#06B6D4' },
  { id: 'receta',         label: 'Receta',       color: '#10B981' },
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
