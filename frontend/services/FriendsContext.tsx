import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import apiClient from './apiClient'
import { useAuth } from './AuthContext'

export interface FriendUser {
  user_id: string
  first_name: string
  last_name: string
  avatar?: string
}

export type FriendRequestStatus = 'accepted' | 'requested'

interface FriendsContextValue {
  friends: FriendUser[]
  incomingRequests: FriendUser[]
  outgoingRequests: FriendUser[]
  loading: boolean
  refresh: () => Promise<void>
  sendRequest: (userId: string) => Promise<FriendRequestStatus>
  cancelRequest: (userId: string) => Promise<void>
  acceptRequest: (userId: string) => Promise<void>
  declineRequest: (userId: string) => Promise<void>
  removeFriend: (userId: string) => Promise<void>
}

const FriendsContext = createContext<FriendsContextValue | null>(null)

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendUser[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendUser[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setFriends([])
      setIncomingRequests([])
      setOutgoingRequests([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [f, inc, out] = await Promise.all([
        apiClient.get<{ friends: FriendUser[] }>('/users/friends'),
        apiClient.get<{ requests: FriendUser[] }>('/users/friends/requests/incoming'),
        apiClient.get<{ requests: FriendUser[] }>('/users/friends/requests/outgoing'),
      ])
      setFriends(f.friends)
      setIncomingRequests(inc.requests)
      setOutgoingRequests(out.requests)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const sendRequest = useCallback(
    async (userId: string): Promise<FriendRequestStatus> => {
      const res = await apiClient.post<{ success: boolean; status: FriendRequestStatus }>(
        '/users/friends',
        { friend_user_id: userId },
      )
      await refresh()
      return res.status
    },
    [refresh],
  )

  const cancelRequest = useCallback(async (userId: string) => {
    await apiClient.delete(`/users/friends/requests/${userId}`)
    await refresh()
  }, [refresh])

  const acceptRequest = useCallback(async (userId: string) => {
    await apiClient.post(`/users/friends/requests/${userId}/accept`)
    await refresh()
  }, [refresh])

  const declineRequest = useCallback(async (userId: string) => {
    await apiClient.post(`/users/friends/requests/${userId}/decline`)
    await refresh()
  }, [refresh])

  const removeFriend = useCallback(async (userId: string) => {
    await apiClient.delete(`/users/friends/${userId}`)
    await refresh()
  }, [refresh])

  return (
    <FriendsContext.Provider
      value={{
        friends,
        incomingRequests,
        outgoingRequests,
        loading,
        refresh,
        sendRequest,
        cancelRequest,
        acceptRequest,
        declineRequest,
        removeFriend,
      }}
    >
      {children}
    </FriendsContext.Provider>
  )
}

export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext)
  if (!ctx) throw new Error('useFriends must be used inside FriendsProvider')
  return ctx
}
