import type { ComponentType, ReactNode } from 'react'

export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl'

export type Responsive<TValue> = TValue | Partial<Record<Breakpoint, TValue>>

export type ResponsiveClassMap<TValue extends PropertyKey> = Record<
  Breakpoint,
  Record<TValue, string>
>

export type Space = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export type FlexDirection = 'row' | 'column' | 'rowReverse' | 'columnReverse'

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 12

export type GridSpan = GridColumns | 'full'

export type IconComponent = ComponentType<{
  className?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}>

export type MenuItemTone = 'default' | 'destructive'

export interface MenuActionEntry {
  type: 'item'
  id: string
  label: ReactNode
  onSelect: () => void
  icon?: IconComponent
  tone?: MenuItemTone
  disabled?: boolean
}

export interface MenuCheckboxEntry {
  type: 'checkbox'
  id: string
  label: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export interface MenuLabelEntry {
  type: 'label'
  id: string
  label: ReactNode
}

export interface MenuSeparatorEntry {
  type: 'separator'
  id: string
}

export type MenuEntry = MenuActionEntry | MenuCheckboxEntry | MenuLabelEntry | MenuSeparatorEntry

export type MenuAlign = 'start' | 'center' | 'end'

export type FloatingSide = 'top' | 'right' | 'bottom' | 'left'
