import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TESTS } from '../data/testsData'
import { submitResponses } from '../utils/submitResponses'
import { markTokenUsed } from '../utils/verifyToken'
import './QuizPage.css'

// Har test ke liye time (minutes mein)
const TEST_DURATION = {
  'class7-8': 30,
  'class9-10': 35,
  'class11-12-science': 40,
  'class11-12-commerce': 35,
  'class11-12-arts': 35,
  'graduate': 40,
  'professional': 40,
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function QuizPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [allQuestions, setAllQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const cardRef = useRef(null)
  const submitRef = useRef(false) // double-submit guard

  useEffect(() => {
    const data = sessionStorage.getItem('mentora_session')
    if (!data) { navigate('/invalid', { replace: true }); return }
    const sess = JSON.parse(data)
    setSession(sess)

    // Flatten all questions with section info
    const test = TESTS[sess.testType]
    if (!test) { navigate('/invalid', { replace: true }); return }

    const flat = []
    test.sections.forEach(section => {
      section.questions.forEach(q => {
        flat.push({ ...q, sectionId: section.id, sectionTitle: section.title, sectionInstruction: section.instruction })
      })
    })
    setAllQuestions(flat)

    // Timer set karo
    const duration = (TEST_DURATION[sess.testType] || 40) * 60
    setTimeLeft(duration)

    // Test shuru hote hi token mark karo — yahan se wapas nahi ja sakte
    markTokenUsed(sess.orderId)
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) {
      handleSubmit()
      return
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLeft])

  if (!session || allQuestions.length === 0) return null

  const total = allQuestions.length
  const current = allQuestions[currentIndex]
  const progress = ((currentIndex) / total) * 100
  const isLast = currentIndex === total - 1
  const selectedAnswer = answers[currentIndex]

  function animateNext(fn) {
    if (cardRef.current) {
      cardRef.current.classList.add('slide-out')
      setTimeout(() => {
        fn()
        if (cardRef.current) cardRef.current.classList.remove('slide-out')
      }, 250)
    } else {
      fn()
    }
  }

  function handleAnswer(value) {
    setAnswers(prev => ({ ...prev, [currentIndex]: value }))
  }

  function handleNext() {
    if (selectedAnswer === undefined) return
    if (isLast) {
      handleSubmit()
    } else {
      animateNext(() => setCurrentIndex(i => i + 1))
    }
  }

  function handleBack() {
    if (currentIndex > 0) {
      animateNext(() => setCurrentIndex(i => i - 1))
    }
  }

  async function handleSubmit() {
    if (submitRef.current) return
    submitRef.current = true
    setSubmitting(true)
    const result = await submitResponses({
      orderId: session.orderId,
      customerName: session.customerName,
      customerEmail: session.customerEmail,
      testType: session.testType,
      answers,
      questions: allQuestions,
    })
    sessionStorage.removeItem('mentora_session')
    navigate('/result', { replace: true, state: { success: result.success, customerName: session.customerName } })
  }

  // Check if new section
  const prevQuestion = currentIndex > 0 ? allQuestions[currentIndex - 1] : null
  const isNewSection = !prevQuestion || prevQuestion.sectionId !== current.sectionId

  return (
    <div className="quiz-page">
      {/* Top bar */}
      <div className="quiz-topbar">
        <div className="quiz-logo">MB</div>
        <div className="quiz-progress-wrap">
          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="quiz-count">{currentIndex + 1} / {total}</span>
        </div>
        {timeLeft !== null && (
          <div className={`quiz-timer ${timeLeft <= 60 ? 'timer-warning' : ''}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="quiz-content">
        {/* Section label */}
        {isNewSection && (
          <div className="section-label">
            <span className="section-badge">Module {current.sectionId}</span>
            <h3>{current.sectionTitle}</h3>
            <p>{current.sectionInstruction}</p>
          </div>
        )}

        {/* Question Card */}
        <div className="question-card" ref={cardRef}>
          <div className="question-number">Question {currentIndex + 1}</div>
          <div className="question-text">{current.text}</div>

          {/* Rating (1-5) */}
          {current.type === 'rating' && (
            <div className="rating-options">
              <div className="rating-labels">
                <span>Not at all</span>
                <span>Very much</span>
              </div>
              <div className="rating-buttons">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`rating-btn ${selectedAnswer === n ? 'selected' : ''}`}
                    onClick={() => handleAnswer(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MCQ */}
          {current.type === 'mcq' && (
            <div className="mcq-options">
              {Object.entries(current.options).map(([key, label]) => (
                <button
                  key={key}
                  className={`mcq-btn ${selectedAnswer === key ? 'selected' : ''}`}
                  onClick={() => handleAnswer(key)}
                >
                  <span className="mcq-key">{key}</span>
                  <span className="mcq-label">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="quiz-nav">
          {currentIndex > 0 && (
            <button className="nav-back" onClick={handleBack}>← Back</button>
          )}
          <button
            className={`nav-next ${selectedAnswer !== undefined ? 'active' : ''}`}
            disabled={selectedAnswer === undefined || submitting}
            onClick={handleNext}
          >
            {submitting ? 'Submitting...' : isLast ? 'Submit Test ✓' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
