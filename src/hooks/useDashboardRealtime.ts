import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  ConnectionRecord,
  HoldingRecord,
  LiabilityRecord,
  StatementRecord,
} from '../types/domain'

interface RealtimeState {
  holdings: HoldingRecord[]
  connections: ConnectionRecord[]
  liabilities: LiabilityRecord[]
  statements: StatementRecord[]
  loading: boolean
  error: string | null
  holdingsLoaded: boolean
  liabilitiesLoaded: boolean
  connectionsLoaded: boolean
  statementsLoaded: boolean
}

export function useDashboardRealtime(userId?: string | null): RealtimeState {
  const [state, setState] = useState<RealtimeState>({
    holdings: [],
    connections: [],
    liabilities: [],
    statements: [],
    loading: true,
    error: null,
    holdingsLoaded: false,
    liabilitiesLoaded: false,
    connectionsLoaded: false,
    statementsLoaded: false,
  })

  useEffect(() => {
    if (!userId) {
      setState({
        holdings: [],
        connections: [],
        liabilities: [],
        statements: [],
        loading: false,
        error: null,
        holdingsLoaded: false,
        liabilitiesLoaded: false,
        connectionsLoaded: false,
        statementsLoaded: false,
      })
      return
    }

    setState({
      holdings: [],
      connections: [],
      liabilities: [],
      statements: [],
      loading: true,
      error: null,
      holdingsLoaded: false,
      liabilitiesLoaded: false,
      connectionsLoaded: false,
      statementsLoaded: false,
    })

    const holdingsQuery = query(
      collection(db, 'users', userId, 'holdings'),
      orderBy('updatedAt', 'desc')
    )

    const connectionsQuery = query(collection(db, 'users', userId, 'connections'))

    const liabilitiesQuery = query(
      collection(db, 'users', userId, 'liabilities'),
      orderBy('updatedAt', 'desc')
    )

    const statementsQuery = query(
      collection(db, 'users', userId, 'statements'),
      orderBy('createdAt', 'desc')
    )

    const getLoading = (
      holdingsLoaded: boolean,
      liabilitiesLoaded: boolean,
      connectionsLoaded: boolean,
      statementsLoaded: boolean
    ) => !(
      holdingsLoaded &&
      liabilitiesLoaded &&
      connectionsLoaded &&
      statementsLoaded
    )

    const unsubHoldings = onSnapshot(
      holdingsQuery,
      (snapshot) => {
        setState((current) => {
          const holdings = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<HoldingRecord, 'id'>),
          }))

          return {
            ...current,
            holdings,
            holdingsLoaded: true,
            loading: getLoading(
              true,
              current.liabilitiesLoaded,
              current.connectionsLoaded,
              current.statementsLoaded
            ),
            error: current.error,
          }
        })
      },
      (error) => {
        console.error('Holdings snapshot error', error)
        setState((current) => ({
          ...current,
          holdings: [],
          holdingsLoaded: true,
          loading: getLoading(
            true,
            current.liabilitiesLoaded,
            current.connectionsLoaded,
            current.statementsLoaded
          ),
          error: current.error ?? 'Failed to load holdings from Firebase.',
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

          return {
            ...current,
            connections,
            connectionsLoaded: true,
            loading: getLoading(
              current.holdingsLoaded,
              current.liabilitiesLoaded,
              true,
              current.statementsLoaded
            ),
            error: current.error,
          }
        })
      },
      (error) => {
        console.error('Connections snapshot error', error)
        setState((current) => ({
          ...current,
          connections: [],
          connectionsLoaded: true,
          loading: getLoading(
            current.holdingsLoaded,
            current.liabilitiesLoaded,
            true,
            current.statementsLoaded
          ),
          error: current.error ?? 'Failed to load connections from Firebase.',
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

          return {
            ...current,
            liabilities,
            liabilitiesLoaded: true,
            loading: getLoading(
              current.holdingsLoaded,
              true,
              current.connectionsLoaded,
              current.statementsLoaded
            ),
            error: current.error,
          }
        })
      },
      (error) => {
        console.error('Liabilities snapshot error', error)
        setState((current) => ({
          ...current,
          liabilities: [],
          liabilitiesLoaded: true,
          loading: getLoading(
            current.holdingsLoaded,
            true,
            current.connectionsLoaded,
            current.statementsLoaded
          ),
          error: current.error ?? 'Failed to load liabilities from Firebase.',
        }))
      }
    )

    const unsubStatements = onSnapshot(
      statementsQuery,
      (snapshot) => {
        setState((current) => {
          const statements = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<StatementRecord, 'id'>),
          }))

          return {
            ...current,
            statements,
            statementsLoaded: true,
            loading: getLoading(
              current.holdingsLoaded,
              current.liabilitiesLoaded,
              current.connectionsLoaded,
              true
            ),
            error: current.error,
          }
        })
      },
      (error) => {
        console.error('Statements snapshot error', error)
        setState((current) => ({
          ...current,
          statements: [],
          statementsLoaded: true,
          loading: getLoading(
            current.holdingsLoaded,
            current.liabilitiesLoaded,
            current.connectionsLoaded,
            true
          ),
          error: current.error ?? 'Failed to load statements from Firebase.',
        }))
      }
    )

    return () => {
      unsubHoldings()
      unsubConnections()
      unsubLiabilities()
      unsubStatements()
    }
  }, [userId])

  return state
}