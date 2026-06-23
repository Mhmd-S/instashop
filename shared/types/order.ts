export interface OrderSummary {
  id: string
  order_number: string
  status: string
  payment_status: string
  total_minor: number
  currency: string
  contact_name: string | null
  contact_email: string | null
  placed_at: string
}

export interface OrderItem {
  id: string
  product_id: string | null
  title_snapshot: string
  image_url_snapshot: string | null
  unit_price_minor: number
  quantity: number
  line_total_minor: number
}

export interface OrderEvent {
  id: string
  kind: string
  from_value: string | null
  to_value: string | null
  created_at: string
}

export interface CheckoutContact {
  email: string
  phone?: string
  name?: string
}

export interface CheckoutShipping {
  name?: string
  line1?: string
  line2?: string
  city?: string
  region?: string
  postcode?: string
  country?: string
}

export interface CheckoutRequest {
  contact: CheckoutContact
  ship: CheckoutShipping
  note?: string
  items: Array<{ productId: string; quantity: number }>
  idempotencyKey: string
}
