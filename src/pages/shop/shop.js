import React from 'react'
import Link from 'next/link'

function Shop(props) {
  return (
    <div className="page shop">
      <h1>Shop</h1>
      <Link href="/shop/checkout">
        <a>Checkout</a>
      </Link>
    </div>
  )
}

export default Shop