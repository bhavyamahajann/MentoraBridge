// =============================================
// WooCommerce REST API Configuration
// =============================================
const WC_URL = 'https://mentorabridge.com'
const WC_KEY = 'ck_832fc97f066f7be8bc313f180baf24b0458990fb'
const WC_SECRET = 'cs_eb927979f0070a153d248a9646c5387ea278b7d1'

// =============================================
// DEV MODE — Local testing ke liye
// Production mein DEV_MODE = false kar dena
// =============================================
const DEV_MODE = false

// Token = WooCommerce Order ID
// Link format: /portal/verify?token=1234&type=class7-8

export async function verifyToken(token, type) {
  if (!token || !type) {
    return { valid: false, reason: 'invalid' }
  }

  // DEV MODE: token=dev ho toh localStorage se check karo
  if (DEV_MODE && token === 'dev') {
    const usedKey = `mentora_dev_used_${type}`
    const alreadyUsed = localStorage.getItem(usedKey)
    if (alreadyUsed === 'yes') {
      return { valid: false, reason: 'used' }
    }

    // Expiry check — localStorage mein first-seen time save karo
    const createdKey = `mentora_dev_created_${type}`
    const createdAt = localStorage.getItem(createdKey)
    if (createdAt) {
      const expiry = new Date(parseInt(createdAt) + 7 * 24 * 60 * 60 * 1000)
      if (new Date() > expiry) {
        return { valid: false, reason: 'expired' }
      }
    } else {
      // Pehli baar dekha — time save karo
      localStorage.setItem(createdKey, Date.now().toString())
    }

    return {
      valid: true,
      orderId: 'DEV-001',
      customerName: 'Test User',
      customerEmail: 'test@mentorabridge.com',
      testType: type,
    }
  }

  try {
    const response = await fetch(
      `https://mentorabridge.com/wp-json/wc/v3/orders/${token}?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`,
      {
        method: 'GET',
      }
    )

    if (!response.ok) {
      return { valid: false, reason: 'invalid' }
    }

    const order = await response.json()

    // 1. Check order status — must be completed
    if (order.status !== 'completed') {
      return { valid: false, reason: 'invalid' }
    }

    // 2. Check test type matches
    const orderType = order.meta_data?.find(m => m.key === '_mentora_test_type')?.value
    if (orderType && orderType !== type) {
      return { valid: false, reason: 'invalid' }
    }

    // 3. Check expiry — 7 days from order completion
    const completedDate = new Date(order.date_completed || order.date_created)
    const expiryDate = new Date(completedDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    if (new Date() > expiryDate) {
      return { valid: false, reason: 'expired' }
    }

    // 4. Check if already used
    const alreadyUsed = order.meta_data?.find(m => m.key === '_mentora_test_used')?.value
    if (alreadyUsed === 'yes') {
      return { valid: false, reason: 'used' }
    }

    // All checks passed!
    return {
      valid: true,
      orderId: order.id,
      customerName: `${order.billing.first_name} ${order.billing.last_name}`,
      customerEmail: order.billing.email,
      testType: type,
    }
  } catch (err) {
    console.error('Token verify error:', err)
    return { valid: false, reason: 'invalid' }
  }
}

// Mark token as used after test submission
export async function markTokenUsed(orderId) {
  // DEV MODE: localStorage mein mark karo
  if (DEV_MODE && orderId === 'DEV-001') {
    // testType session se nikalo
    try {
      const session = JSON.parse(sessionStorage.getItem('mentora_session') || '{}')
      if (session.testType) {
        localStorage.setItem(`mentora_dev_used_${session.testType}`, 'yes')
      }
    } catch (e) {}
    return
  }

  try {
    await fetch(
      `https://mentorabridge.com/wp-json/wc/v3/orders/${orderId}?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta_data: [{ key: '_mentora_test_used', value: 'yes' }],
        }),
      }
    )
  } catch (err) {
    console.error('Mark used error:', err)
  }
}
