import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { ConnectionRecord, HoldingRecord, LiabilityRecord } from '../types/domain'

interface RealtimeState {
  holdings: HoldingRecord[]
  connections: ConnectionRecord[]
  liabilities: LiabilityRecord[]
  loading: boolean
}

export function useDashboardRealtime(userId?: string | null): RealtimeState {
  const [state, setState] = useState<RealtimeState>({
    holdings: [],
    connections: [],
    liabilities: [],
    loading: true,
  })

  useEffect(() => {
    if (!userId) {
      setState({ holdings: [], connections: [], liabilities: [], loading: false })
      return
    }

    const holdingsQuery = query(collection(db, 'users', userId, 'holdings'), orderBy('updatedAt', 'desc'))
    const connectionsQuery = query(collection(db, 'users', userId, 'connections'))
    const liabilitiesQuery = query(collection(db, 'users', userId, 'liabilities'), orderBy('updatedAt', 'desc'))

    const unsubHoldings = onSnapshot(holdingsQuery, (snapshot) => {
      setState((current) => ({
        ...current,
        holdings: snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<HoldingRecord, 'id'>) })),
        loading: false,
      }))
    })

    const unsubConnections = onSnapshot(connectionsQuery, (snapshot) => {
      setState((current) => ({
        ...current,
        connections: snapshot.docs.map((doc) => ({ provider: doc.id as ConnectionRecord['provider'], ...(doc.data() as Omit<ConnectionRecord, 'provider'>) })),
      }))
    })

    const unsubLiabilities = onSnapshot(liabilitiesQuery, (snapshot) => {
      setState((current) => ({
        ...current,
        liabilities: snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<LiabilityRecord, 'id'>) })),
      }))
    })

    return () => {
      unsubHoldings()
      unsubConnections()
      unsubLiabilities()
    }
  }, [userId])

  return state
}
