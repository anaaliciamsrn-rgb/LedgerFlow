import type { CollaboratorColor } from '@/features/calendar/types/calendar.types';

/**
 * Ordem da paleta. É a mesma sequência usada pela migration ao converter os
 * responsáveis antigos, e a mesma que `nextFreeColor` percorre.
 */
export const COLLABORATOR_COLORS: readonly CollaboratorColor[] = [
  'blue',
  'violet',
  'emerald',
  'amber',
  'rose',
  'cyan',
  'orange',
  'lime',
];

interface ColorClasses {
  /** Fundo + texto da tarefa dentro da grade. */
  readonly chip: string;
  /** Bolinha da legenda e dos blocos por responsável. */
  readonly dot: string;
}

/**
 * Classes escritas por extenso, nunca interpoladas (`bg-${color}-500`): o
 * Tailwind varre o código como texto e descartaria a classe montada em tempo
 * de execução.
 */
const CLASSES: Readonly<Record<CollaboratorColor, ColorClasses>> = {
  blue: {
    chip: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  violet: {
    chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  emerald: {
    chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  amber: {
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  rose: {
    chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  cyan: {
    chip: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    dot: 'bg-cyan-500',
  },
  orange: {
    chip: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  lime: {
    chip: 'bg-lime-500/15 text-lime-700 dark:text-lime-300',
    dot: 'bg-lime-500',
  },
};

export function colorClasses(color: CollaboratorColor): ColorClasses {
  return CLASSES[color] ?? CLASSES.blue;
}

/** Primeira cor ainda não usada; volta ao início da paleta se as 8 acabarem. */
export function nextFreeColor(
  used: readonly CollaboratorColor[],
): CollaboratorColor {
  return (
    COLLABORATOR_COLORS.find((color) => !used.includes(color)) ??
    COLLABORATOR_COLORS[used.length % COLLABORATOR_COLORS.length]!
  );
}

export const COLOR_LABELS: Readonly<Record<CollaboratorColor, string>> = {
  blue: 'Azul',
  violet: 'Roxo',
  emerald: 'Verde',
  amber: 'Âmbar',
  rose: 'Rosa',
  cyan: 'Ciano',
  orange: 'Laranja',
  lime: 'Limão',
};
