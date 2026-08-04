import { createContext, useContext } from 'react'
import { useDashScope } from '../hooks/useDashScope'

const AIContext = createContext(null)

export function AIProvider({ children }) {
  const dashScope = useDashScope()
  
  return (
    <AIContext.Provider value={dashScope}>
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  const context = useContext(AIContext)
  if (!context) {
    throw new Error('useAI must be used within AIProvider')
  }
  return context
}
