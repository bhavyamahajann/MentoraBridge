// =============================================
// Submit test responses
// =============================================
const WC_URL = 'https://mentorabridge.com'
const WC_KEY = 'ck_832fc97f066f7be8bc313f180baf24b0458990fb'
const WC_SECRET = 'cs_eb927979f0070a153d248a9646c5387ea278b7d1'

// Admin email jahan results jaayenge
const ADMIN_EMAIL = 'admin@mentorabridge.com'

const DEV_MODE = false

export async function submitResponses({ orderId, customerName, customerEmail, testType, answers, questions }) {

  // DEV MODE: sirf console mein log karo, koi API call nahi
  if (DEV_MODE && orderId === 'DEV-001') {
    const answersLog = questions.map((q, i) => {
      const ans = answers[i]
      const answerLabel = q.options ? (q.options[ans] || ans) : ans
      return `Q${i + 1}. ${q.text}\nAnswer: ${answerLabel}`
    }).join('\n\n')
    console.log('=== DEV MODE: Test Submitted ===')
    console.log('Customer:', customerName, '|', customerEmail)
    console.log('Test Type:', testType)
    console.log('Answers:\n', answersLog)
    return { success: true }
  }

  const answersText = questions.map((q, i) => {
    const ans = answers[i]
    let answerLabel = ans
    if (q.options) {
      answerLabel = q.options[ans] || ans
    }
    return `Q${i + 1}. ${q.text}\nAnswer: ${answerLabel}`
  }).join('\n\n')

  const submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

  try {
    // 1. WooCommerce order mein save karo
    await fetch(
      `${WC_URL}/wp-json/wc/v3/orders/${orderId}?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta_data: [
            { key: '_mentora_test_used', value: 'yes' },
            { key: '_mentora_test_answers', value: answersText },
            { key: '_mentora_test_submitted_at', value: submittedAt },
          ],
        }),
      }
    )

    // 2. Email bhejo WordPress hook se
    await fetch(`${WC_URL}/wp-json/mentora/v1/send-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        customerName,
        customerEmail,
        adminEmail: ADMIN_EMAIL,
        testType,
        answers: answersText,
        submittedAt,
      }),
    })

    return { success: true }
  } catch (err) {
    console.error('Submit error:', err)
    return { success: false, error: err.message }
  }
}
