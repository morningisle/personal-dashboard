import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'korean-mistake-book'

export function useMistakeBook() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item) => {
    // 检查是否已存在
    const exists = items.some(i => i.id === item.id)
    if (exists) return
    setItems(prev => [...prev, { ...item, createdAt: Date.now(), reviewCount: 0, lastReview: null }])
  }, [items])

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const isSaved = useCallback((id) => {
    return items.some(i => i.id === id)
  }, [items])

  const markReviewed = useCallback((id) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, reviewCount: i.reviewCount + 1, lastReview: Date.now() } : i
    ))
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
  }, [])

  return {
    items,
    addItem,
    removeItem,
    isSaved,
    markReviewed,
    clearAll,
    count: items.length,
  }
}
