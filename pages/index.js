import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push('/dashboard')
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#08090F',color:'#555C78',fontSize:'0.875rem',fontFamily:'Inter,sans-serif'}}>Loading...</div>
  )

  return (
    <Head>
      <meta httpEquiv="refresh" content="0;url=/signup" />
      <title>Loopback</title>
    </Head>
  )
}
