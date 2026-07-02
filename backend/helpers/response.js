const ok = (res, data) => res.json({ success: true, data })

const err = (res, message, code = 500) => {
  const isProd = process.env.NODE_ENV === 'production'
  const displayMsg = isProd && code === 500 ? 'An internal server error occurred' : message
  res.status(code).json({ success: false, error: displayMsg, code })
}

module.exports = { ok, err }
