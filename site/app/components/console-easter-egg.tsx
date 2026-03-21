'use client'

import { useEffect } from 'react'

export function ConsoleEasterEgg() {
  useEffect(() => {
    console.log(
      '%c⌂ Terrarium',
      'font-size: 24px; font-weight: bold; color: #8b5cf6;'
    )
    console.log(
      '%cSet your React components free.\nhttps://github.com/michellemayes/terrarium',
      'font-size: 13px; color: #a78bfa;'
    )
  }, [])

  return null
}
