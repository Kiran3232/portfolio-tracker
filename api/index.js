import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import admin from 'firebase-admin'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { google } from 'googleapis'
import multer from 'multer'
import xlsx from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8')
)

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })
}

const db = admin.firestore()
db.settings({
  ignoreUndefinedProperties: true,
})

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  })
)
app.use(express.json())

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

const ZERODHA_API_KEY = requireEnv('ZERODHA_API_KEY')
const ZERODHA_API_SECRET = requireEnv('ZERODHA_API_SECRET')
const ZERODHA_REDIRECT_URL = requireEnv('ZERODHA_REDIRECT_URL')

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_REDIRECT_URL =
  process.env.GOOGLE_REDIRECT_URL || 'http://localhost:4000/api/gmail/callback'

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000

function nowTs() {
  return Date.now()
}

function buildNonce(size = 16) {
  return crypto.randomBytes(size).toString('hex')
}

function buildState(provider, uid) {
  const nonce = buildNonce()
  const payload = {
    uid,
    provider,
    nonce,
    ts: nowTs(),
  }

  return {
    stateId: `${provider}_${nonce}`,
    payload: Buffer.from(JSON.stringify(payload)).toString('base64url'),
  }
}

function parseStatePayload(rawState) {
  try {
    const decoded = Buffer.from(String(rawState), 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded)

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.uid ||
      !parsed.provider ||
      !parsed.nonce ||
      !parsed.ts
    ) {
      return null
    }

    return {
      uid: String(parsed.uid),
      provider: String(parsed.provider),
      nonce: String(parsed.nonce),
      ts: Number(parsed.ts),
      stateId: `${parsed.provider}_${parsed.nonce}`,
    }
  } catch {
    return null
  }
}

async function createOAuthState(provider, uid) {
  const { stateId, payload } = buildState(provider, uid)

  await db.collection('oauth_state').doc(stateId).set({
    uid,
    provider,
    state: payload,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: nowTs(),
    consumed: false,
  })

  return payload
}

async function consumeOAuthState(rawState, expectedProvider) {
  const parsed = parseStatePayload(rawState)

  if (!parsed) {
    throw new Error('Invalid OAuth state payload')
  }

  if (parsed.provider !== expectedProvider) {
    throw new Error('OAuth state provider mismatch')
  }

  if (nowTs() - parsed.ts > OAUTH_STATE_TTL_MS) {
    throw new Error('OAuth state expired')
  }

  const docRef = db.collection('oauth_state').doc(parsed.stateId)
  const docSnap = await docRef.get()

  if (!docSnap.exists) {
    throw new Error('OAuth state not found')
  }

  const data = docSnap.data()

  if (data?.consumed) {
    throw new Error('OAuth state already used')
  }

  if (data?.uid !== parsed.uid || data?.provider !== expectedProvider) {
    throw new Error('OAuth state validation failed')
  }

  await docRef.set(
    {
      consumed: true,
      consumedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return {
    uid: parsed.uid,
    stateId: parsed.stateId,
  }
}

async function upsertConnection(uid, provider, payload) {
  await db
    .collection('users')
    .doc(uid)
    .collection('connections')
    .doc(provider)
    .set(
      {
        provider,
        ...payload,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
}

function getGmailOAuthClient() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment'
    )
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URL
  )
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : ''

    if (!token) {
      return res.status(401).json({ error: 'Missing token' })
    }

    const decoded = await admin.auth().verifyIdToken(token)
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
    }

    next()
  } catch (error) {
    console.error('Auth error', error)
    return res.status(401).json({ error: 'Invalid token' })
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

function inferAssetType(h) {
  const segment = h.segment ?? ''
  const tradingsymbol = (h.tradingsymbol || '').toUpperCase()
  const isin = h.isin ?? ''
  const product = h.product ?? ''

  const ETF_PATTERNS = [
    'BEES',
    'NIFTY',
    'BANKBEES',
    'GOLDBEES',
    'SILVERBEES',
    'LIQUIDBEES',
    'ETF',
    'METAL',
    'BOND',
    'GILT',
  ]

  if (
    segment === 'NSE' &&
    ETF_PATTERNS.some((p) => tradingsymbol.includes(p))
  ) {
    return 'ETF'
  }

  if (
    segment === 'CDS' ||
    tradingsymbol.includes('GSEC') ||
    tradingsymbol.includes('GLT')
  ) {
    return 'Bond'
  }

  if (isin && isin.startsWith('INE') && tradingsymbol.includes('CORP')) {
    return 'Bond'
  }

  if (
    segment === 'NSE' ||
    segment === 'BSE' ||
    product === 'DELIVERY' ||
    product === 'CNC'
  ) {
    return 'Stock'
  }

  return 'Stock'
}

app.get('/api/zerodha/login', authMiddleware, async (req, res) => {
  try {
    const statePayload = await createOAuthState('zerodha', req.user.uid)

    await upsertConnection(req.user.uid, 'zerodha', {
      status: 'syncing',
      accountLabel: 'Zerodha',
      metadata: {
        description: 'Kite Connect holdings and positions sync',
      },
    })

    const url =
      `https://kite.zerodha.com/connect/login?v=3&api_key=${encodeURIComponent(
        ZERODHA_API_KEY
      )}` +
      `&redirect_params=${encodeURIComponent(`state=${statePayload}`)}`

    return res.json({
      url,
      state: statePayload,
      redirectUrl: ZERODHA_REDIRECT_URL,
    })
  } catch (error) {
    console.error('Zerodha login error', error)
    return res
      .status(500)
      .json({ error: 'Failed to create Zerodha login URL' })
  }
})

app.get('/api/zerodha/callback', async (req, res) => {
  let uid = null

  try {
    const requestToken = req.query.request_token
    const rawState = req.query.state

    if (!requestToken) {
      return res.status(400).send('Missing request_token')
    }

    if (!rawState) {
      return res
        .status(400)
        .send('Missing OAuth state. Please reconnect from the app.')
    }

    const consumed = await consumeOAuthState(rawState, 'zerodha')
    uid = consumed.uid

    const checksum = crypto
      .createHash('sha256')
      .update(`${ZERODHA_API_KEY}${requestToken}${ZERODHA_API_SECRET}`)
      .digest('hex')

    const tokenRes = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Kite-Version': '3',
      },
      body: new URLSearchParams({
        api_key: ZERODHA_API_KEY,
        request_token: requestToken,
        checksum,
      }),
    })

    const data = await tokenRes.json()

    if (!tokenRes.ok || data.status !== 'success') {
      console.error('Zerodha token exchange failed', data)

      await upsertConnection(uid, 'zerodha', {
        status: 'error',
        accountLabel: 'Zerodha',
        metadata: {
          description: 'Token exchange failed',
        },
      })

      return res
        .status(400)
        .send(`Zerodha token exchange failed: ${JSON.stringify(data)}`)
    }

    const session = data.data

    await db.collection('zerodha_sessions').add({
      uid,
      user_id: session.user_id || null,
      user_name: session.user_name || null,
      email: session.email || null,
      broker: 'zerodha',
      api_key: ZERODHA_API_KEY,
      access_token: session.access_token,
      public_token: session.public_token || null,
      refresh_token: session.refresh_token || null,
      enctoken: session.enctoken || null,
      login_time: session.login_time || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      raw: session,
    })

    await db
      .collection('users')
      .doc(uid)
      .collection('provider_tokens')
      .doc('zerodha')
      .set(
        {
          provider: 'zerodha',
          accessToken: session.access_token,
          publicToken: session.public_token || null,
          refreshToken: session.refresh_token || null,
          enctoken: session.enctoken || null,
          userId: session.user_id || null,
          userName: session.user_name || null,
          email: session.email || null,
          loginTime: session.login_time || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

    await upsertConnection(uid, 'zerodha', {
      status: 'connected',
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      accountLabel: session.user_name || session.user_id || 'Zerodha',
      metadata: {
        description: 'Kite Connect holdings and positions sync',
        email: session.email || null,
      },
    })

    return res.send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Zerodha Connected</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #0f172a;
              color: #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .card {
              background: #111827;
              border: 1px solid #334155;
              border-radius: 12px;
              padding: 24px;
              max-width: 520px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.35);
            }
            h1 { margin-top: 0; font-size: 24px; }
            p { line-height: 1.6; color: #cbd5e1; }
            code {
              background: #1e293b;
              padding: 2px 6px;
              border-radius: 6px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Zerodha connected successfully</h1>
            <p>Your access token was created and stored by the backend.</p>
            <p>You can close this tab and return to your app.</p>
            <p><code>User ID: ${session.user_id || 'unknown'}</code></p>
          </div>
        </body>
      </html>
    `)
  } catch (error) {
    console.error('Zerodha callback error', error)

    if (uid) {
      await upsertConnection(uid, 'zerodha', {
        status: 'error',
        accountLabel: 'Zerodha',
        metadata: {
          description: 'Zerodha callback failed',
        },
      })
    }

    return res.status(500).send('Zerodha callback failed')
  }
})

app.get('/api/zerodha/holdings', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.uid

    await upsertConnection(uid, 'zerodha', {
      status: 'syncing',
      accountLabel: 'Zerodha',
      metadata: {
        description: 'Fetching holdings from Kite Connect',
      },
    })

    const tokenDoc = await db
      .collection('users')
      .doc(uid)
      .collection('provider_tokens')
      .doc('zerodha')
      .get()

    if (!tokenDoc.exists) {
      await upsertConnection(uid, 'zerodha', {
        status: 'error',
        accountLabel: 'Zerodha',
        metadata: {
          description: 'No Zerodha token found. Reconnect required.',
        },
      })

      return res.status(400).json({ error: 'No Zerodha session found' })
    }

    const tokenData = tokenDoc.data()
    const accessToken = tokenData?.accessToken

    if (!accessToken) {
      await upsertConnection(uid, 'zerodha', {
        status: 'error',
        accountLabel: 'Zerodha',
        metadata: {
          description: 'Missing access token. Reconnect required.',
        },
      })

      return res.status(400).json({ error: 'Missing Zerodha access token' })
    }

    const userHoldingsRef = db
      .collection('users')
      .doc(uid)
      .collection('holdings')

    const batch = db.batch()
    const allNormalizedHoldings = []

    const holdingsRes = await fetch(
      'https://api.kite.trade/portfolio/holdings',
      {
        method: 'GET',
        headers: {
          Authorization: `token ${ZERODHA_API_KEY}:${accessToken}`,
          'X-Kite-Version': '3',
        },
      }
    )

    const holdingsData = await holdingsRes.json()

    if (!holdingsRes.ok || holdingsData.status !== 'success') {
      console.error('Holdings fetch failed', holdingsData)

      await upsertConnection(uid, 'zerodha', {
        status: 'error',
        accountLabel: tokenData?.userName || tokenData?.userId || 'Zerodha',
        metadata: {
          description: 'Failed to fetch holdings from Zerodha',
        },
      })

      return res
        .status(400)
        .json({ error: 'Failed to fetch holdings', details: holdingsData })
    }

    const equityHoldings = holdingsData.data || []

    for (const h of equityHoldings) {
      const quantity = Number(h.quantity ?? 0)
      const avgBuyPrice = Number(h.average_price ?? 0)
      const currentPrice = Number(h.last_price ?? 0)
      const currentValue =
        Number(h.current_value ?? 0) || quantity * currentPrice || 0

      const uiType = inferAssetType(h)
      const normalizedType =
        uiType === 'ETF'
          ? 'etf'
          : uiType === 'Bond'
            ? 'etf'
            : 'stock'

      const norm = {
        userId: uid,
        instrumentId: String(h.instrument_token),
        instrumentToken: h.instrument_token,
        symbol: h.tradingsymbol,
        exchange: h.exchange,
        segment: h.segment,
        isin: h.isin ?? null,
        product: h.product ?? null,
        name: h.tradingsymbol || 'Unknown asset',
        type: normalizedType,
        source: 'zerodha',
        quantity,
        avgBuyPrice,
        currentPrice,
        currentValue,
        currency: 'INR',
        pnl: Number(h.pnl ?? 0),
        dayChange: Number(h.day_change ?? 0),
        dayChangePercentage: Number(h.day_change_percentage ?? 0),
        openedAt: h.authorised_date ?? null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      const docId = String(h.instrument_token || h.tradingsymbol)
      batch.set(userHoldingsRef.doc(docId), norm, { merge: true })
      allNormalizedHoldings.push(norm)
    }

    const mfHoldingsRes = await fetch('https://api.kite.trade/mf/holdings', {
      method: 'GET',
      headers: {
        Authorization: `token ${ZERODHA_API_KEY}:${accessToken}`,
        'X-Kite-Version': '3',
      },
    })

    const mfData = await mfHoldingsRes.json()

    if (mfData.status === 'success') {
      const mfHoldings = mfData.data || []

      for (const mf of mfHoldings) {
        const avgBuyPrice = Number(mf.average_price ?? 0)
        const currentPrice = Number(mf.last_price ?? 0)
        const quantity = Number(mf.quantity ?? 0)
        const currentValue = quantity * currentPrice

        const norm = {
          userId: uid,
          instrumentId: String(
            mf.tradingsymbol ??
            mf.folio ??
            mf.fund ??
            crypto.randomUUID()
          ),
          instrumentToken: null,
          folio: mf.folio ?? null,
          schemeCode: null,
          schemeName: mf.fund ?? 'Unknown Fund',
          amfiCode: null,
          fundHouse: null,
          symbol: mf.tradingsymbol ?? mf.fund ?? 'Unknown Fund',
          exchange: 'MF',
          segment: 'MF',
          name: mf.fund ?? 'Unknown Fund',
          type: 'mutual_fund',
          source: 'zerodha',
          quantity,
          avgBuyPrice,
          currentPrice,
          currentValue,
          currency: 'INR',
          pnl: Number(mf.pnl ?? 0),
          openedAt: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }

        const docId = String(mf.tradingsymbol ?? mf.folio ?? mf.fund)

        batch.set(userHoldingsRef.doc(docId), norm, { merge: true })
        allNormalizedHoldings.push(norm)
      }
    } else {
      console.warn('MF holdings fetch returned non-success status', mfData)
    }

    await batch.commit()

    await upsertConnection(uid, 'zerodha', {
      status: 'connected',
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      accountLabel: tokenData?.userName || tokenData?.userId || 'Zerodha',
      metadata: {
        description: `Imported ${allNormalizedHoldings.length} holdings`,
        email: tokenData?.email || null,
      },
    })

    return res.json({
      imported: allNormalizedHoldings.length,
      holdings: allNormalizedHoldings,
    })
  } catch (error) {
    console.error('Holdings error', error)

    await upsertConnection(req.user.uid, 'zerodha', {
      status: 'error',
      accountLabel: 'Zerodha',
      metadata: {
        description: 'Failed to sync Zerodha holdings',
      },
    })

    return res.status(500).json({ error: 'Failed to fetch holdings' })
  }
})


function normalizeProviderKey(provider = '') {
  return String(provider).toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function getHeader(headers = [], name) {
  return (
    headers.find(
      (header) => String(header.name).toLowerCase() === name.toLowerCase()
    )?.value || ''
  )
}

function collectAttachments(parts = [], acc = []) {
  for (const part of parts || []) {
    if (part.filename && part.body?.attachmentId) {
      acc.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        attachmentId: part.body.attachmentId,
        size: part.body.size || 0,
      })
    }

    if (part.parts?.length) {
      collectAttachments(part.parts, acc)
    }
  }

  return acc
}

function inferStatementProvider(subject = '', from = '', filename = '') {
  const text = `${subject} ${from} ${filename}`.toLowerCase()

  if (text.includes('hdfc')) return 'HDFC Bank'
  if (text.includes('american express') || text.includes('amex')) return 'American Express'
  if (text.includes('icici')) return 'ICICI Bank'
  if (text.includes('sbi card') || text.includes('sbi cards') || text.includes('sbicard')) return 'SBI Card'
  if (text.includes('axis')) return 'Axis Bank'
  if (text.includes('indusind')) return 'IndusInd Bank'
  if (text.includes('kotak')) return 'Kotak Mahindra Bank'
  if (text.includes('idfc')) return 'IDFC First Bank'
  if (text.includes('standard chartered')) return 'Standard Chartered'
  if (text.includes('hsbc')) return 'HSBC'
  if (text.includes('yes bank')) return 'Yes Bank'
  if (text.includes('rbl')) return 'RBL Bank'
  if (text.includes('onecard') || text.includes('one card')) return 'OneCard'
  if (text.includes('au small finance')) return 'AU Bank'

  return 'Unknown Provider'
}

function looksLikeCreditCardStatement({ subject = '', from = '', snippet = '', attachmentNames = [] }) {
  const haystack = `${subject} ${from} ${snippet} ${attachmentNames.join(' ')}`.toLowerCase()

  const positiveSignals = [
    'credit card',
    'card statement',
    'statement of account',
    'monthly statement',
    'total amount due',
    'minimum amount due',
    'payment due',
    'amount due',
    'credit card statement',
    'card ending',
    'xxxx',
    'statement',
  ]

  const negativeSignals = [
    'debit card',
    'savings account',
    'current account',
    'bank statement',
    'transaction alert',
    'upi',
    'imps',
    'neft',
    'rtgs',
    'cash withdrawal',
    'salary',
    'credited',
    'debited',
    'utr',
    'avl bal',
    'available balance',
    'loan statement',
    'mutual fund',
    'demat',
    'brokerage',
  ]

  const positiveCount = positiveSignals.filter((signal) => haystack.includes(signal)).length
  const hasNegative = negativeSignals.some((signal) => haystack.includes(signal))

  return positiveCount >= 2 && !hasNegative
}

function extractStatementSummary(text = '') {
  const normalized = text.replace(/\s+/g, ' ')
  const dueDateMatch =
    normalized.match(/due date[:\s-]*([A-Za-z0-9,\-/ ]{6,24})/i) ||
    normalized.match(/payment due[:\s-]*([A-Za-z0-9,\-/ ]{6,24})/i)

  const totalDueMatch =
    normalized.match(/total amount due[:\s-]*₹?\$?\s?([0-9,]+(?:\.\d{1,2})?)/i) ||
    normalized.match(/amount due[:\s-]*₹?\$?\s?([0-9,]+(?:\.\d{1,2})?)/i) ||
    normalized.match(/total due[:\s-]*₹?\$?\s?([0-9,]+(?:\.\d{1,2})?)/i)

  const minimumDueMatch =
    normalized.match(/minimum amount due[:\s-]*₹?\$?\s?([0-9,]+(?:\.\d{1,2})?)/i) ||
    normalized.match(/minimum due[:\s-]*₹?\$?\s?([0-9,]+(?:\.\d{1,2})?)/i)

  const parseAmount = (value) =>
    value ? Number(String(value).replace(/,/g, '')) : undefined

  return {
    dueDate: dueDateMatch?.[1]?.trim(),
    totalDue: parseAmount(totalDueMatch?.[1]),
    minimumDue: parseAmount(minimumDueMatch?.[1]),
  }
}

async function listAllMatchingMessages(gmail, query) {
  const allMessages = []
  let pageToken = undefined

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
      pageToken,
      includeSpamTrash: false,
    })

    const messages = response.data.messages || []
    allMessages.push(...messages)
    pageToken = response.data.nextPageToken || undefined
  } while (pageToken)

  return allMessages
}

async function rebuildLiabilitiesFromStatements(uid) {
  const statementsRef = db.collection('users').doc(uid).collection('statements')
  const liabilitiesRef = db.collection('users').doc(uid).collection('liabilities')

  const statementsSnap = await statementsRef.where('type', '==', 'credit_card').get()
  const batch = db.batch()
  const liabilityMap = new Map()

  for (const doc of statementsSnap.docs) {
    const data = doc.data() || {}
    const provider = data.provider || 'Unknown Provider'
    const paymentStatus = data.paymentStatus || 'unpaid'
    const totalDue = Number(data?.statementSummary?.totalDue || 0)
    const paidAmount = Number(data.paidAmount || 0)
    const dueDate = data?.statementSummary?.dueDate || ''
    const currency = data.currency || 'INR'

    if (!totalDue || provider === 'Unknown Provider') continue

    const outstanding =
      paymentStatus === 'paid'
        ? 0
        : paymentStatus === 'partial'
          ? Math.max(0, totalDue - paidAmount)
          : totalDue

    if (outstanding <= 0) continue

    const key = normalizeProviderKey(provider)
    const existing = liabilityMap.get(key) || {
      userId: uid,
      type: 'credit_card',
      provider,
      accountNumberMasked: '',
      currentOutstanding: 0,
      dueAmount: 0,
      dueDate,
      utilization: 0,
      source: 'gmail',
      currency,
      statementIds: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    existing.currentOutstanding += outstanding
    existing.dueAmount += outstanding
    existing.statementIds.push(doc.id)
    if (!existing.dueDate || (dueDate && String(dueDate) < String(existing.dueDate))) {
      existing.dueDate = dueDate
    }

    liabilityMap.set(key, existing)
  }

  const existingLiabilitiesSnap = await liabilitiesRef.where('source', '==', 'gmail').get()
  for (const doc of existingLiabilitiesSnap.docs) {
    if (!liabilityMap.has(doc.id)) {
      batch.delete(doc.ref)
    }
  }

  for (const [id, payload] of liabilityMap.entries()) {
    batch.set(liabilitiesRef.doc(id), payload, { merge: true })
  }

  await batch.commit()
  return { liabilitiesImported: liabilityMap.size }
}

app.get('/api/gmail/login', authMiddleware, async (req, res) => {
  try {
    const client = getGmailOAuthClient()
    const statePayload = await createOAuthState('gmail', req.user.uid)

    await upsertConnection(req.user.uid, 'gmail', {
      status: 'syncing',
      accountLabel: 'Gmail',
      metadata: {
        description: 'Credit card statement scan',
      },
    })

    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      state: statePayload,
    })

    return res.json({ url })
  } catch (error) {
    console.error('Gmail login error', error)
    return res.status(500).json({ error: 'Failed to start Gmail login' })
  }
})

app.get('/api/gmail/callback', async (req, res) => {
  let uid = null

  try {
    const code = String(req.query.code || '')
    const rawState = String(req.query.state || '')

    if (!code) {
      return res.status(400).send('Missing code')
    }

    if (!rawState) {
      return res
        .status(400)
        .send('Missing OAuth state. Please reconnect from the app.')
    }

    const consumed = await consumeOAuthState(rawState, 'gmail')
    uid = consumed.uid

    const client = getGmailOAuthClient()
    const { tokens } = await client.getToken(code)

    await db
      .collection('users')
      .doc(uid)
      .collection('provider_tokens')
      .doc('gmail')
      .set(
        {
          provider: 'gmail',
          accessToken: tokens.access_token || null,
          refreshToken: tokens.refresh_token || null,
          scope: tokens.scope || null,
          tokenType: tokens.token_type || null,
          expiryDate: tokens.expiry_date || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

    await upsertConnection(uid, 'gmail', {
      status: 'connected',
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      accountLabel: 'Gmail',
      metadata: {
        description: 'Credit card statement scan',
      },
    })

    return res.send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Gmail Connected</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #0f172a;
              color: #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .card {
              background: #111827;
              border: 1px solid #334155;
              border-radius: 12px;
              padding: 24px;
              max-width: 520px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.35);
            }
            h1 { margin-top: 0; font-size: 24px; }
            p { line-height: 1.6; color: #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Gmail connected successfully</h1>
            <p>Your Gmail access token was stored by the backend.</p>
            <p>You can close this tab and return to your app.</p>
          </div>
        </body>
      </html>
    `)
  } catch (error) {
    console.error('Gmail callback error', error)

    if (uid) {
      await upsertConnection(uid, 'gmail', {
        status: 'error',
        accountLabel: 'Gmail',
        metadata: {
          description: 'Gmail callback failed',
        },
      })
    }

    return res.status(500).send('Gmail callback failed')
  }
})

app.get('/api/gmail/statements', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.uid

    await upsertConnection(uid, 'gmail', {
      status: 'syncing',
      accountLabel: 'Gmail',
      metadata: {
        description: 'Scanning Gmail for credit card statements',
        phase: 'auth-check',
      },
    })

    const tokenDoc = await db
      .collection('users')
      .doc(uid)
      .collection('provider_tokens')
      .doc('gmail')
      .get()

    if (!tokenDoc.exists) {
      await upsertConnection(uid, 'gmail', {
        status: 'error',
        accountLabel: 'Gmail',
        metadata: {
          description: 'No Gmail token found. Reconnect required.',
        },
      })

      return res.status(400).json({ error: 'No Gmail token found' })
    }

    const tokenData = tokenDoc.data() || {}
    const refreshToken = tokenData.refreshToken || null
    const accessToken = tokenData.accessToken || null

    const client = getGmailOAuthClient()
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    const gmail = google.gmail({ version: 'v1', auth: client })

    await upsertConnection(uid, 'gmail', {
      status: 'syncing',
      accountLabel: 'Gmail',
      metadata: {
        description: 'Scanning Gmail for credit card statements',
        phase: 'searching',
      },
    })

    const query =
      'in:anywhere has:attachment subject:("credit card" OR "card statement" OR estatement OR e-statement OR "monthly statement") -in:spam -in:trash newer_than:365d'

    const messageRefs = await listAllMatchingMessages(gmail, query)
    const statementsRef = db.collection('users').doc(uid).collection('statements')

    let scanned = 0
    let imported = 0
    let skipped = 0

    const matchedStatementIds = new Set()

    for (const ref of messageRefs) {
      scanned += 1

      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: ref.id,
        format: 'full',
      })

      const payload = msg.data.payload || {}
      const headers = payload.headers || []
      const subject = getHeader(headers, 'Subject')
      const from = getHeader(headers, 'From')
      const internalDateMs = Number(msg.data.internalDate || Date.now())
      const attachments = collectAttachments(payload.parts || [])
      const attachmentNames = attachments.map((item) => item.filename)
      const snippet = msg.data.snippet || ''

      const normalizedSubject = String(subject || '').toLowerCase()

      const subjectLooksLikeCardStatement =
        normalizedSubject.includes('credit card') ||
        normalizedSubject.includes('card statement') ||
        normalizedSubject.includes('e-statement') ||
        normalizedSubject.includes('estatement') ||
        normalizedSubject.includes('monthly statement')

      if (!subjectLooksLikeCardStatement) {
        skipped += 1
        continue
      }

      const provider = inferStatementProvider(subject, from, attachmentNames.join(' '))
      const summary = extractStatementSummary(`${subject} ${snippet}`)
      const statementRef = statementsRef.doc(msg.data.id)
      const existingStatement = await statementRef.get()
      const existingData = existingStatement.data() || {}

      const statementDoc = {
        userId: uid,
        type: 'credit_card',
        provider,
        gmailMessageId: msg.data.id,
        threadId: msg.data.threadId || null,
        attachmentName: attachmentNames[0] || null,
        attachmentNames,
        subject,
        from,
        snippet,
        parsed: false,
        statementSummary: {
          totalDue: summary.totalDue,
          minimumDue: summary.minimumDue,
          dueDate: summary.dueDate,
          transactionCount: undefined,
        },
        paymentStatus: existingData.paymentStatus || 'unpaid',
        paidAmount: Number(existingData.paidAmount || 0),
        paidAt: existingData.paidAt || null,
        manuallyMarkedPaid: Boolean(existingData.manuallyMarkedPaid || false),
        hasAttachments: attachments.length > 0,
        attachmentCount: attachments.length,
        createdAt: admin.firestore.Timestamp.fromMillis(internalDateMs),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'gmail',
        currency: 'INR',
      }

      matchedStatementIds.add(msg.data.id)
      await statementRef.set(statementDoc, { merge: true })
      imported += 1
    }
    const existingStatementsSnap = await statementsRef
      .where('source', '==', 'gmail')
      .get()

    const cleanupBatch = db.batch()

    for (const doc of existingStatementsSnap.docs) {
      if (!matchedStatementIds.has(doc.id)) {
        cleanupBatch.delete(doc.ref)
      }
    }

    await cleanupBatch.commit()
    const { liabilitiesImported } = await rebuildLiabilitiesFromStatements(uid)

    await upsertConnection(uid, 'gmail', {
      status: 'connected',
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      accountLabel: 'Gmail',
      metadata: {
        description: `Imported ${imported} credit card statement emails`,
        phase: 'completed',
        scanned,
        skipped,
        statementsImported: imported,
        liabilitiesImported,
        query,
      },
    })

    return res.json({
      imported,
      liabilitiesImported,
      messages: scanned,
      skipped,
    })
  } catch (error) {
    console.error('Gmail statements sync error', error)

    await upsertConnection(req.user.uid, 'gmail', {
      status: 'error',
      accountLabel: 'Gmail',
      metadata: {
        description: 'Statement sync failed',
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return res.status(500).json({ error: 'Failed to sync Gmail statements' })
  }
})

app.post('/api/statements/:id/mark-paid', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.uid
    const statementId = String(req.params.id)
    const statementRef = db.collection('users').doc(uid).collection('statements').doc(statementId)
    const snapshot = await statementRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({ error: 'Statement not found' })
    }

    const data = snapshot.data() || {}
    const totalDue = Number(data?.statementSummary?.totalDue || 0)

    await statementRef.set(
      {
        paymentStatus: 'paid',
        paidAmount: totalDue,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        manuallyMarkedPaid: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    const rebuild = await rebuildLiabilitiesFromStatements(uid)
    return res.json({ ok: true, ...rebuild })
  } catch (error) {
    console.error('Mark paid failed', error)
    return res.status(500).json({ error: 'Failed to mark statement paid' })
  }
})

app.post('/api/statements/:id/mark-unpaid', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.uid
    const statementId = String(req.params.id)
    const statementRef = db.collection('users').doc(uid).collection('statements').doc(statementId)
    const snapshot = await statementRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({ error: 'Statement not found' })
    }

    await statementRef.set(
      {
        paymentStatus: 'unpaid',
        paidAmount: 0,
        paidAt: null,
        manuallyMarkedPaid: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    const rebuild = await rebuildLiabilitiesFromStatements(uid)
    return res.json({ ok: true, ...rebuild })
  } catch (error) {
    console.error('Mark unpaid failed', error)
    return res.status(500).json({ error: 'Failed to mark statement unpaid' })
  }
})

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const num = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(num) ? num : 0
}

function getSheetRows(buffer, sheetName) {
  const workbook = xlsx.read(buffer, { type: 'buffer' })
  const worksheet = workbook.Sheets[sheetName || workbook.SheetNames[0]]
  if (!worksheet) throw new Error(`Sheet not found: ${sheetName}`)
  return xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' })
}

function extractMetadata(rows) {
  const meta = {}
  for (const row of rows) {
    const key = String(row[0] || '').trim()
    if (!key || key === 'Stock Symbol' || key === 'Stock Name') break
    meta[key] = row[1]
  }
  return meta
}

function findHeaderRow(rows, firstHeader) {
  return rows.findIndex((row) => String(row[0] || '').trim() === firstHeader)
}

function inferUsAssetType(symbol = '', name = '') {
  const text = `${symbol} ${name}`.toUpperCase()
  const etfHints = [' ETF', 'FUND', 'QQQ', 'SPY', 'VOO', 'TECL', 'UPRO', 'IHF', 'RYE']
  return etfHints.some((hint) => text.includes(hint)) ? 'etf' : 'stock'
}

function parseHoldingsWorkbook(buffer) {
  const rows = getSheetRows(buffer, 'HOLDINGS_BOOK')
  const metadata = extractMetadata(rows)
  const headerRowIndex = findHeaderRow(rows, 'Stock Symbol')
  if (headerRowIndex === -1) {
    throw new Error('Holdings table header not found in HOLDINGS_BOOK sheet')
  }

  const headers = rows[headerRowIndex].map((h) => String(h).trim())
  const dataRows = rows.slice(headerRowIndex + 1).filter((row) => String(row[0] || '').trim())

  const holdings = dataRows.map((row) => {
    const obj = Object.fromEntries(headers.map((header, index) => [header, row[index]]))
    const symbol = String(obj['Stock Symbol'] || '').trim().toUpperCase()
    const quantity = toNumber(obj['Quantity'])
    const avgBuyPrice = toNumber(obj['Avg. Price ($)'])
    const currentValue = toNumber(obj['Total Value ($)'])
    const currentPrice = quantity > 0 ? currentValue / quantity : 0

    return {
      symbol,
      holdingSince: obj['Holding Since'] || null,
      quantity,
      avgBuyPrice,
      currentPrice,
      currentValue,
      currency: 'USD',
    }
  })

  return { metadata, holdings }
}

function parseOrdersWorkbook(buffer) {
  const rows = getSheetRows(buffer, 'ORDER_BOOK')
  const metadata = extractMetadata(rows)
  const headerRowIndex = findHeaderRow(rows, 'Stock Name')
  if (headerRowIndex === -1) {
    throw new Error('Orders table header not found in ORDER_BOOK sheet')
  }

  const headers = rows[headerRowIndex].map((h) => String(h).trim())
  const dataRows = rows.slice(headerRowIndex + 1).filter((row) => String(row[1] || '').trim())

  const transactions = dataRows.map((row) => {
    const obj = Object.fromEntries(headers.map((header, index) => [header, row[index]]))
    return {
      stockName: String(obj['Stock Name'] || '').trim(),
      symbol: String(obj['Stock Symbol'] || '').trim().toUpperCase(),
      orderPlacedTime: obj['Order Placed Time'] || null,
      orderExecutionTime: obj['Order Execution Time'] || null,
      brokerReferenceId: String(obj['Broker Reference Id'] || '').trim(),
      transactionType: String(obj['Transaction Type'] || '').trim().toUpperCase(),
      orderType: String(obj['Order Type'] || '').trim().toLowerCase(),
      quantity: toNumber(obj['Quantity']),
      price: toNumber(obj['Price ($)']),
      orderAmount: toNumber(obj['Order Amount ($)']),
      brokerage: toNumber(obj['Brokerage ($)']),
      currency: 'USD',
    }
  })

  return { metadata, transactions }
}

app.post(
  '/api/indmoney/import',
  authMiddleware,
  upload.fields([
    { name: 'holdings', maxCount: 1 },
    { name: 'orders', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const uid = req.user.uid
      const holdingsFile = req.files?.holdings?.[0]
      const ordersFile = req.files?.orders?.[0]

      if (!holdingsFile || !ordersFile) {
        return res
          .status(400)
          .json({ error: 'Both holdings and orders files are required' })
      }

      await upsertConnection(uid, 'indmoney', {
        status: 'syncing',
        accountLabel: 'INDmoney',
        metadata: {
          description: 'Importing uploaded US holdings and orders reports',
          mode: 'manual_upload',
        },
      })

      const holdingsData = parseHoldingsWorkbook(holdingsFile.buffer)
      const ordersData = parseOrdersWorkbook(ordersFile.buffer)

      const holdingsRef = db.collection('users').doc(uid).collection('holdings')
      const transactionsRef = db.collection('users').doc(uid).collection('transactions')
      const symbolNameMap = new Map()

      for (const tx of ordersData.transactions) {
        if (tx.symbol && tx.stockName && !symbolNameMap.has(tx.symbol)) {
          symbolNameMap.set(tx.symbol, tx.stockName)
        }
      }

      const batch = db.batch()

      for (const holding of holdingsData.holdings) {
        const name = symbolNameMap.get(holding.symbol) || holding.symbol
        const type = inferUsAssetType(holding.symbol, name)
        const docId = `indmoney-${holding.symbol}`

        batch.set(
          holdingsRef.doc(docId),
          {
            userId: uid,
            instrumentId: holding.symbol,
            symbol: holding.symbol,
            name,
            type,
            source: 'indmoney',
            provider: 'indmoney',
            exchange: 'US',
            segment: 'US_EQUITY',
            quantity: holding.quantity,
            avgBuyPrice: holding.avgBuyPrice,
            currentPrice: holding.currentPrice,
            currentValue: holding.currentValue,
            currency: 'USD',
            broker: holdingsData.metadata['Broker Name'] || null,
            brokerAccount: String(holdingsData.metadata['Broker Account'] || ''),
            importSource: 'manual_upload',
            asOfDate: holdingsData.metadata['Holdings as on'] || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
      }

      for (const tx of ordersData.transactions) {
        const txId = tx.brokerReferenceId || crypto.randomUUID()
        batch.set(
          transactionsRef.doc(`indmoney-${txId}`),
          {
            userId: uid,
            source: 'indmoney',
            provider: 'indmoney',
            broker: ordersData.metadata['Broker Name'] || null,
            brokerAccount: String(ordersData.metadata['Broker Account'] || ''),
            symbol: tx.symbol,
            name: tx.stockName || tx.symbol,
            transactionType: tx.transactionType,
            orderType: tx.orderType,
            quantity: tx.quantity,
            price: tx.price,
            amount: tx.orderAmount,
            brokerage: tx.brokerage,
            currency: tx.currency,
            orderPlacedAt: tx.orderPlacedTime || null,
            executedAt: tx.orderExecutionTime || null,
            brokerReferenceId: tx.brokerReferenceId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
      }

      batch.set(
        db.collection('users').doc(uid).collection('connections').doc('indmoney'),
        {
          provider: 'indmoney',
          status: 'connected',
          accountLabel: 'INDmoney',
          lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            description: `Imported ${holdingsData.holdings.length} holdings and ${ordersData.transactions.length} transactions`,
            mode: 'manual_upload',
            broker:
              holdingsData.metadata['Broker Name'] ||
              ordersData.metadata['Broker Name'] ||
              null,
            brokerAccount: String(
              holdingsData.metadata['Broker Account'] ||
              ordersData.metadata['Broker Account'] ||
              ''
            ),
            holdingsAsOn: holdingsData.metadata['Holdings as on'] || null,
            periodFrom: ordersData.metadata['Period From'] || null,
            periodTo: ordersData.metadata['Period To'] || null,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      await batch.commit()

      return res.json({
        importedHoldings: holdingsData.holdings.length,
        importedTransactions: ordersData.transactions.length,
        broker:
          holdingsData.metadata['Broker Name'] ||
          ordersData.metadata['Broker Name'] ||
          null,
        brokerAccount: String(
          holdingsData.metadata['Broker Account'] ||
          ordersData.metadata['Broker Account'] ||
          ''
        ),
      })
    } catch (error) {
      console.error('INDmoney import failed', error)

      await upsertConnection(req.user.uid, 'indmoney', {
        status: 'error',
        accountLabel: 'INDmoney',
        metadata: {
          description: 'Manual import failed',
          error: error instanceof Error ? error.message : String(error),
        },
      })

      return res.status(500).json({ error: 'Failed to import INDmoney reports' })
    }
  }
)

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})