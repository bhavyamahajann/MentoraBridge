import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyToken } from '../utils/verifyToken'
import './VerifyPage.css'

export default function VerifyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | error

  useEffect(() => {
    const token = searchParams.get('token')
    const type = searchParams.get('type')

    async function verify() {
      const result = await verifyToken(token, type)

      if (result.valid) {
        // Session storage mein save karo — token abhi mark NAHI hoga
        sessionStorage.setItem('mentora_session', JSON.stringify({
          orderId: result.orderId,
          customerName: result.customerName,
          customerEmail: result.customerEmail,
          testType: result.testType,
          token,
        }))
        navigate('/terms', { replace: true })
      } else {
        navigate(`/${result.reason}`, { replace: true })
      }
    }

    if (!token || !type) {
      navigate('/invalid', { replace: true })
    } else {
      verify()
    }
  }, [])

  return (
    <div className="verify-screen">
      <div className="verify-card">
        <div className="verify-logo">
          <span>MB</span>
        </div>
        <div className="verify-spinner" />
        <h2>Verifying your access...</h2>
        <p>Please wait a moment</p>
      </div>
    </div>
  )
}
