export interface SubUserData {
  id: string
  dealerId: string
  name: string
  email: string
  password: string
  role: string
  active: boolean
  createdAt: string
}

export interface User {
  id: string
  email: string
  name: string
  role: string
  dealerId?: string | null
  subUserRole?: string
  isSubUser?: boolean
  adminRoleId?: string | null
  adminRole?: { id: string; name: string; permissions: string }
}

export interface DealerInfo {
  id: string
  name: string
  company: string
  discountRate: number
  group: string
  creditLimit: number
  openingBalance: number
  status: string
}

export interface Product {
  id: string
  name: string
  description: string
  subtitle?: string
  shortDescription?: string
  badgeText?: string
  price: number
  costPrice: number
  image: string
  images: string
  category: string
  subcategory: string
  stock: number
  minStockLevel: number
  maxStockLevel: number
  minOrderQuantity: number
  backorderable: boolean
  eta: string
  createdAt: string
}

export interface CartItem {
  id: string
  productId: string
  quantity: number
  product: Product
  effectivePrice?: number
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  total: number
  status: string
  address: string
  createdAt: string
}

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  product: Product
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
