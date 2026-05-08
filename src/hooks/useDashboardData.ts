import { useEffect, useState } from 'react'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { ConnectionRecord, HoldingRecord, LiabilityRecord } from '../types/domain'

interface DashboardState {
  holdings: HoldingRecord[]
  connections: ConnectionRecord[]
  liabilities: LiabilityRecord[]
  loading: boolean
}

export function useDashboardData(userId?: string | null): DashboardState {
  const [state, setState] = useState<DashboardState>({
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

    async function load(currentUserId: string) {
      try {
        const [holdingsSnap, connectionsSnap, liabilitiesSnap] = await Promise.all([
          getDocs(query(collection(db, 'users', currentUserId, 'holdings'), limit(50))),
          getDocs(query(collection(db, 'users', currentUserId, 'connections'), limit(20))),
          getDocs(query(collection(db, 'users', currentUserId, 'liabilities'), limit(20))),
        ])

        setState({
          holdings: holdingsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<HoldingRecord, 'id'>) })),
          connections: connectionsSnap.docs.map((doc) => ({ provider: doc.id as ConnectionRecord['provider'], ...(doc.data() as Omit<ConnectionRecord, 'provider'>) })),
          liabilities: liabilitiesSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<LiabilityRecord, 'id'>) })),
          loading: false,
        })
      } catch {
        setState({ holdings: [], connections: [], liabilities: [], loading: false })
      }
    }

    load(userId)
  }, [userId])

  return state
}
