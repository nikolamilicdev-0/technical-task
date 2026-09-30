import type {
  Breakpoint,
  FlexDirection,
  GridColumns,
  GridSpan,
  Responsive,
  ResponsiveClassMap,
} from '../types'

const BREAKPOINTS = ['base', 'sm', 'md', 'lg', 'xl'] as const satisfies readonly Breakpoint[]

// Every class is spelled out: Tailwind only generates classes it finds verbatim in source.
export const FLEX_DIRECTION_CLASSES = {
  base: {
    row: 'flex-row',
    column: 'flex-col',
    rowReverse: 'flex-row-reverse',
    columnReverse: 'flex-col-reverse',
  },
  sm: {
    row: 'sm:flex-row',
    column: 'sm:flex-col',
    rowReverse: 'sm:flex-row-reverse',
    columnReverse: 'sm:flex-col-reverse',
  },
  md: {
    row: 'md:flex-row',
    column: 'md:flex-col',
    rowReverse: 'md:flex-row-reverse',
    columnReverse: 'md:flex-col-reverse',
  },
  lg: {
    row: 'lg:flex-row',
    column: 'lg:flex-col',
    rowReverse: 'lg:flex-row-reverse',
    columnReverse: 'lg:flex-col-reverse',
  },
  xl: {
    row: 'xl:flex-row',
    column: 'xl:flex-col',
    rowReverse: 'xl:flex-row-reverse',
    columnReverse: 'xl:flex-col-reverse',
  },
} as const satisfies ResponsiveClassMap<FlexDirection>

export const GRID_COLUMN_CLASSES = {
  base: {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    12: 'grid-cols-12',
  },
  sm: {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6',
    12: 'sm:grid-cols-12',
  },
  md: {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
    12: 'md:grid-cols-12',
  },
  lg: {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    12: 'lg:grid-cols-12',
  },
  xl: {
    1: 'xl:grid-cols-1',
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
    6: 'xl:grid-cols-6',
    12: 'xl:grid-cols-12',
  },
} as const satisfies ResponsiveClassMap<GridColumns>

export const GRID_SPAN_CLASSES = {
  base: {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    12: 'col-span-12',
    full: 'col-span-full',
  },
  sm: {
    1: 'sm:col-span-1',
    2: 'sm:col-span-2',
    3: 'sm:col-span-3',
    4: 'sm:col-span-4',
    5: 'sm:col-span-5',
    6: 'sm:col-span-6',
    12: 'sm:col-span-12',
    full: 'sm:col-span-full',
  },
  md: {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    5: 'md:col-span-5',
    6: 'md:col-span-6',
    12: 'md:col-span-12',
    full: 'md:col-span-full',
  },
  lg: {
    1: 'lg:col-span-1',
    2: 'lg:col-span-2',
    3: 'lg:col-span-3',
    4: 'lg:col-span-4',
    5: 'lg:col-span-5',
    6: 'lg:col-span-6',
    12: 'lg:col-span-12',
    full: 'lg:col-span-full',
  },
  xl: {
    1: 'xl:col-span-1',
    2: 'xl:col-span-2',
    3: 'xl:col-span-3',
    4: 'xl:col-span-4',
    5: 'xl:col-span-5',
    6: 'xl:col-span-6',
    12: 'xl:col-span-12',
    full: 'xl:col-span-full',
  },
} as const satisfies ResponsiveClassMap<GridSpan>

export function responsiveClasses<TValue extends PropertyKey>(
  value: Responsive<NoInfer<TValue>> | undefined,
  classMap: ResponsiveClassMap<TValue>
): string[] {
  if (value === undefined) return []
  if (!isBreakpointMap(value)) return [classMap.base[value]]
  return BREAKPOINTS.flatMap((breakpoint) => {
    const breakpointValue = value[breakpoint]
    return breakpointValue === undefined ? [] : [classMap[breakpoint][breakpointValue]]
  })
}

function isBreakpointMap<TValue>(
  value: Responsive<TValue>
): value is Partial<Record<Breakpoint, TValue>> {
  return typeof value === 'object' && value !== null
}
