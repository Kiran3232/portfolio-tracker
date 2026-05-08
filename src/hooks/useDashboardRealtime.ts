import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  ConnectionRecord,
  HoldingRecord,
  LiabilityRecord,
} from '../types/domain'

interface RealtimeState {
  holdings: HoldingRecord[]
  connections: ConnectionRecord[]
  liabilities: LiabilityRecord[]
  loading: boolean
  error: string | null
  holdingsLoaded: boolean
  liabilitiesLoaded: boolean
  connectionsLoaded: boolean
}

export function useDashboardRealtime(userId?: string | null): RealtimeState {
  const [state, setState] = useState<RealtimeState>({
    holdings: [],
    connections: [],
    liabilities: [],
    loading: true,
    error: null,
    holdingsLoaded: false,
    liabilitiesLoaded: false,
    connectionsLoaded: false,
  })

  useEffect(() => {
    if (!userId) {
      setState({
        holdings: [],
        connections: [],
        liabilities: [],
        loading: false,
        error: null,
        holdingsLoaded: false,
        liabilitiesLoaded: false,
        connectionsLoaded: false,
      })
      return
    }

    setState({
      holdings: [],
      connections: [],
      liabilities: [],
      loading: true,
      error: null,
      holdingsLoaded: false,
      liabilitiesLoaded: false,
      connectionsLoaded: false,
    })

    const holdingsQuery = query(
      collection(db, 'users', userId, 'holdings'),
      orderBy('updatedAt', 'desc')
    )

    const connectionsQuery = query(
      collection(db, 'users', userId, 'connections')
    )

    const liabilitiesQuery = query(
      collection(db, 'users', userId, 'liabilities'),
      orderBy('updatedAt', 'desc')
    )

    const unsubHoldings = onSnapshot(
      holdingsQuery,
      (snapshot) => {
        setState((current) => {
          const holdings = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<HoldingRecord, 'id'>),
          }))

          const holdingsLoaded = true
          const loading = !(
            holdingsLoaded &&
            current.liabilitiesLoaded &&
            current.connectionsLoaded
          )

          return {
            ...current,
            holdings,
            holdingsLoaded,
            loading,
            error: null,
          }
        })
      },
      (error) => {
        console.error('Holdings snapshot error', error)
        setState((current) => ({
          ...current,
          holdings: [],
          holdingsLoaded: true,
          loading: !(
            true &&
            current.liabilitiesLoaded &&
            current.connectionsLoaded
          ),
          error: 'Failed to load holdings from Firebase.',
        }))
      }
    )

    const unsubConnections = onSnapshot(
      connectionsQuery,
      (snapshot) => {
        setState((current) => {
          const connections = snapshot.docs.map((doc) => ({
            provider: doc.id as ConnectionRecord['provider'],
            ...(doc.data() as Omit<ConnectionRecord, 'provider'>),
          }))

          const connectionsLoaded = true
          const loading = !(
            current.holdingsLoaded &&
            current.liabilitiesLoaded &&
            connectionsLoaded
          )

          return {
            ...current,
            connections,
            connectionsLoaded,
            loading,
            error: null,
          }
        })
      },
      (error) => {
        console.error('Connections snapshot error', error)
        setState((current) => ({
          ...current,
          connections: [],
          connectionsLoaded: true,
          loading: !(
            current.holdingsLoaded &&
            current.liabilitiesLoaded &&
            true
          ),
          error: 'Failed to load connections from Firebase.',
        }))
      }
    )

    const unsubLiabilities = onSnapshot(
      liabilitiesQuery,
      (snapshot) => {
        setState((current) => {
          const liabilities = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<LiabilityRecord, 'id'>),
          }))

          const liabilitiesLoaded = true
          const loading = !(
            current.holdingsLoaded &&
            liabilitiesLoaded &&
            current.connectionsLoaded
          )

          return {
            ...current,
            liabilities,
            liabilitiesLoaded,
            loading,
            error: null,
          }
        })
      },
      (error) => {
        console.error('Liabilities snapshot error', error)
        setState((current) => ({
          ...current,
          liabilities: [],
          liabilitiesLoaded: true,
          loading: !(
            current.holdingsLoaded &&
            true &&
            current.connectionsLoaded
          ),
          error: 'Failed to load liabilities from Firebase.',
        }))
      }
    )

    return () => {
      unsubHoldings()
      unsubConnections()
      unsubLiabilities()
    }
  }, [userId])

  return state
}