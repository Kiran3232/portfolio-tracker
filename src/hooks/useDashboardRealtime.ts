import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  ConnectionRecord,
  FixedDepositRecord,
  HoldingRecord,
  LiabilityRecord,
  StatementRecord,
} from '../types/domain'

interface RealtimeState {
  holdings: HoldingRecord[]
  connections: ConnectionRecord[]
  liabilities: LiabilityRecord[]
  statements: StatementRecord[]
  fixedDeposits: FixedDepositRecord[]
  loading: boolean
  error: string | null
  holdingsLoaded: boolean
  liabilitiesLoaded: boolean
  connectionsLoaded: boolean
  statementsLoaded: boolean
  fixedDepositsLoaded: boolean
}

function getLoadingState(flags: {
  holdingsLoaded: boolean
  liabilitiesLoaded: boolean
  connectionsLoaded: boolean
  statementsLoaded: boolean
  fixedDepositsLoaded: boolean
}) {
  return !(
    flags.holdingsLoaded &&
    flags.liabilitiesLoaded &&
    flags.connectionsLoaded &&
    flags.statementsLoaded &&
    flags.fixedDepositsLoaded
  )
}

export function useDashboardRealtime(userId?: string | null): RealtimeState {
  const [state, setState] = useState<RealtimeState>({
    holdings: [],
    connections: [],
    liabilities: [],
    statements: [],
    fixedDeposits: [],
    loading: true,
    error: null,
    holdingsLoaded: false,
    liabilitiesLoaded: false,
    connectionsLoaded: false,
    statementsLoaded: false,
    fixedDepositsLoaded: false,
  })

  useEffect(() => {
    if (!userId) {
      setState({
        holdings: [],
        connections: [],
        liabilities: [],
        statements: [],
        fixedDeposits: [],
        loading: false,
        error: null,
        holdingsLoaded: false,
        liabilitiesLoaded: false,
        connectionsLoaded: false,
        statementsLoaded: false,
        fixedDepositsLoaded: false,
      })
      return
    }

    setState({
      holdings: [],
      connections: [],
      liabilities: [],
      statements: [],
      fixedDeposits: [],
      loading: true,
      error: null,
      holdingsLoaded: false,
      liabilitiesLoaded: false,
      connectionsLoaded: false,
      statementsLoaded: false,
      fixedDepositsLoaded: false,
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

    const fixedDepositsQuery = collection(db, 'users', userId, 'fixed_deposits')

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
            loading: getLoadingState({
              holdingsLoaded: true,
              liabilitiesLoaded: current.liabilitiesLoaded,
              connectionsLoaded: current.connectionsLoaded,
              statementsLoaded: current.statementsLoaded,
              fixedDepositsLoaded: current.fixedDepositsLoaded,
            }),
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
          loading: getLoadingState({
            holdingsLoaded: true,
            liabilitiesLoaded: current.liabilitiesLoaded,
            connectionsLoaded: current.connectionsLoaded,
            statementsLoaded: current.statementsLoaded,
            fixedDepositsLoaded: current.fixedDepositsLoaded,
          }),
          error: current.error ?? 'Failed to load holdings from Firebase.',
        }))
      }
    )

    const unsubConnections = onSnapshot(
      connectionsQuery,
      (snapshot) => {
        setState((current) => {
          const connections = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<ConnectionRecord, 'id'>),
          })) as ConnectionRecord[]

          return {
            ...current,
            connections,
            connectionsLoaded: true,
            loading: getLoadingState({
              holdingsLoaded: current.holdingsLoaded,
              liabilitiesLoaded: current.liabilitiesLoaded,
              connectionsLoaded: true,
              statementsLoaded: current.statementsLoaded,
              fixedDepositsLoaded: current.fixedDepositsLoaded,
            }),
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
          loading: getLoadingState({
            holdingsLoaded: current.holdingsLoaded,
            liabilitiesLoaded: current.liabilitiesLoaded,
            connectionsLoaded: true,
            statementsLoaded: current.statementsLoaded,
            fixedDepositsLoaded: current.fixedDepositsLoaded,
          }),
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
            loading: getLoadingState({
              holdingsLoaded: current.holdingsLoaded,
              liabilitiesLoaded: true,
              connectionsLoaded: current.connectionsLoaded,
              statementsLoaded: current.statementsLoaded,
              fixedDepositsLoaded: current.fixedDepositsLoaded,
            }),
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
          loading: getLoadingState({
            holdingsLoaded: current.holdingsLoaded,
            liabilitiesLoaded: true,
            connectionsLoaded: current.connectionsLoaded,
            statementsLoaded: current.statementsLoaded,
            fixedDepositsLoaded: current.fixedDepositsLoaded,
          }),
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
            loading: getLoadingState({
              holdingsLoaded: current.holdingsLoaded,
              liabilitiesLoaded: current.liabilitiesLoaded,
              connectionsLoaded: current.connectionsLoaded,
              statementsLoaded: true,
              fixedDepositsLoaded: current.fixedDepositsLoaded,
            }),
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
          loading: getLoadingState({
            holdingsLoaded: current.holdingsLoaded,
            liabilitiesLoaded: current.liabilitiesLoaded,
            connectionsLoaded: current.connectionsLoaded,
            statementsLoaded: true,
            fixedDepositsLoaded: current.fixedDepositsLoaded,
          }),
          error: current.error ?? 'Failed to load statements from Firebase.',
        }))
      }
    )

    const unsubFixedDeposits = onSnapshot(
      fixedDepositsQuery,
      (snapshot) => {
        setState((current) => {
          const fixedDeposits = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...(doc.data() as Omit<FixedDepositRecord, 'id'>),
            }))
            .sort((a, b) => {
              const aTime = new Date(String(a.updatedAt ?? a.createdAt ?? 0)).getTime() || 0
              const bTime = new Date(String(b.updatedAt ?? b.createdAt ?? 0)).getTime() || 0
              return bTime - aTime
            })

          return {
            ...current,
            fixedDeposits,
            fixedDepositsLoaded: true,
            loading: getLoadingState({
              holdingsLoaded: current.holdingsLoaded,
              liabilitiesLoaded: current.liabilitiesLoaded,
              connectionsLoaded: current.connectionsLoaded,
              statementsLoaded: current.statementsLoaded,
              fixedDepositsLoaded: true,
            }),
            error:
              current.error === 'Failed to load fixed deposits from Firebase.'
                ? null
                : current.error,
          }
        })
      },
      (error) => {
        console.error('Fixed deposits snapshot error', error)
        setState((current) => ({
          ...current,
          fixedDeposits: [],
          fixedDepositsLoaded: true,
          loading: getLoadingState({
            holdingsLoaded: current.holdingsLoaded,
            liabilitiesLoaded: current.liabilitiesLoaded,
            connectionsLoaded: current.connectionsLoaded,
            statementsLoaded: current.statementsLoaded,
            fixedDepositsLoaded: true,
          }),
          error: current.error ?? 'Failed to load fixed deposits from Firebase.',
        }))
      }
    )

    return () => {
      unsubHoldings()
      unsubConnections()
      unsubLiabilities()
      unsubStatements()
      unsubFixedDeposits()
    }
  }, [userId])

  return state
}