export type Species = 'bovino' | 'equino' | 'suino'
export type AnimalStatus = 'ativo' | 'vendido' | 'abatido' | 'morto'
export type AnimalSex = 'M' | 'F'
export type EntryType = 'nascimento' | 'compra' | 'arrendamento'
export type HealthType = 'vacina' | 'vermifugacao' | 'medicamento' | 'consulta'
export type ReproStatus = 'coberta' | 'prenha' | 'parida' | 'perdida'
export type FeedUnit = 'kg' | 'saco' | 'fardo' | 'litro' | 'outro'
export type SaleType = 'venda' | 'abate'
export type ExpenseCategory =
  | 'mao_de_obra'
  | 'energia'
  | 'manutencao'
  | 'transporte'
  | 'equipamento'
  | 'veterinario'
  | 'outro'

export interface Farm {
  id: string
  owner_id: string
  name: string
  owner_name?: string
  phone?: string
  city?: string
  state?: string
  location?: string
  area_hectares?: number
  is_active: boolean
  plan: string
  trial_ends_at?: string
  milk_active?: boolean
  milkings_per_day?: number
  created_at: string
}

export interface Animal {
  id: string
  farm_id: string
  code: string
  name?: string
  species: Species
  breed?: string
  sex: AnimalSex
  birth_date?: string
  entry_date: string
  entry_type: EntryType
  status: AnimalStatus
  notes?: string
  photo_url?: string
  market_value?: number
  weight_arrobas?: number
  ear_tag?: string
  to_discard?: boolean
  mother_id?: string
  created_at: string
}

export interface HealthRecord {
  id: string
  farm_id: string
  animal_id: string
  type: HealthType
  product_name: string
  dose?: string
  application_date: string
  next_due_date?: string
  applied_by?: string
  cost: number
  notes?: string
  created_at: string
  animal?: Animal
}

export interface ReproductionRecord {
  id: string
  farm_id: string
  female_id: string
  male_id?: string
  external_male_name?: string
  coverage_date: string
  expected_birth_date?: string
  actual_birth_date?: string
  offspring_count: number
  status: ReproStatus
  notes?: string
  created_at: string
  female?: Animal
  male?: Animal
}

export interface FeedStock {
  id: string
  farm_id: string
  product_name: string
  unit: FeedUnit
  current_quantity: number
  min_quantity: number
  cost_per_unit: number
  purchase_date?: string
  total_cost?: number
  last_updated: string
  created_at: string
}

export interface FeedRecord {
  id: string
  farm_id: string
  species: Species | 'geral'
  feed_stock_id?: string
  date: string
  quantity_used: number
  cost_total: number
  notes?: string
  created_at: string
  feed_stock?: FeedStock
}

export interface AnimalPurchase {
  id: string
  farm_id: string
  animal_id: string
  seller_name?: string
  purchase_date: string
  purchase_price: number
  weight_kg?: number
  notes?: string
  created_at: string
  animal?: Animal
}

export interface AnimalSale {
  id: string
  farm_id: string
  animal_id: string
  buyer_name?: string
  sale_date: string
  sale_price: number
  weight_kg?: number
  price_per_kg?: number
  sale_type: SaleType
  notes?: string
  created_at: string
  animal?: Animal
}

export interface OperationalExpense {
  id: string
  farm_id: string
  category: ExpenseCategory
  date: string
  amount: number
  description: string
  notes?: string
  created_at: string
}

export interface AnimalCost {
  animal_id: string
  farm_id: string
  code: string
  name?: string
  species: Species
  status: AnimalStatus
  entry_date: string
  purchase_cost: number
  health_cost: number
  total_cost: number
  sale_price?: number
  sale_date?: string
  profit?: number
  margin_pct?: number
  days_in_stock: number
}

export interface DRE {
  month: string
  revenue: number
  cmv: number
  gross_profit: number
  gross_margin: number
  operational_expenses: number
  net_profit: number
  net_margin: number
}

export interface CashflowMonth {
  month: string
  inflow: number
  outflow: number
  balance: number
}

export interface MilkProduction {
  id: string
  farm_id: string
  date: string
  total_liters: number
  notes?: string
  created_at: string
}

export interface MilkPayment {
  id: string
  farm_id: string
  reference_month: string
  payment_date?: string
  buyer_name?: string
  total_liters?: number
  price_per_liter?: number
  total_amount?: number
  notes?: string
  created_at: string
}
