import { useEffect, useState, type FormEvent } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import {
  BookOpen,
  Home,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'

import { supabase, supabaseConfigured } from './lib/supabase'
import Dashboard from './pages/Dashboard'
import Collection from './pages/Collection'
import Admin from './pages/Admin'

type Profile = {
  id: string
  nome: string | null
  avatar_url: string | null
  role: 'user' | 'admin' | null
  is_admin: boolean
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profileData, setProfileData] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (!active) return

      setSession(currentSession)

      if (currentSession) {
        await loadProfile(currentSession.user)
      }

      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)

      if (newSession) {
        await loadProfile(newSession.user)
      } else {
        setProfileData(null)
      }

      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(user: User) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, avatar_url, role, is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Erro ao carregar perfil:', error)
      setProfileData(null)
      return
    }

    setProfileData(data as Profile | null)
  }

  if (loading) {
    return (
      <div className="splash">
        <Sparkles />
        <h1>Figurinhas</h1>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return <Shell profile={profileData} />
}

function Auth() {
  const [signup, setSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function google() {
    if (!supabaseConfigured) {
      setErr('Configure o .env com as credenciais do Supabase.')
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) setErr(error.message)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErr('')
    setMsg('')

    if (!supabaseConfigured) {
      setErr('Configure o .env com as credenciais do Supabase.')
      return
    }

    const result = signup
      ? await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              full_name: name,
            },
          },
        })
      : await supabase.auth.signInWithPassword({
          email,
          password: pass,
        })

    if (result.error) {
      setErr(result.error.message)
    } else if (signup) {
      setMsg(
        'Conta criada. Verifique o seu e-mail se a confirmação estiver ativa.'
      )
    }
  }

  return (
    <main className="auth">
      <section>
        <span className="brand">
          <Sparkles />
        </span>
        <small>COLECIONE • ORGANIZE • COMPLETE</small>
        <h1>A sua coleção de figurinhas.</h1>
        <p>
          Controle álbuns, figurinhas, faltas e repetidas num só lugar.
        </p>
      </section>

      <div className="authbox">
        <small>BEM-VINDO</small>
        <h2>{signup ? 'Criar conta' : 'Entrar'}</h2>

        <button onClick={google} className="google" type="button">
          G &nbsp; Continuar com Google
        </button>

        <div className="or">ou</div>

        <form onSubmit={submit}>
          {signup && (
            <input
              placeholder="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Palavra-passe"
            minLength={6}
            value={pass}
            onChange={(event) => setPass(event.target.value)}
            required
          />

          {err && <div className="error">{err}</div>}
          {msg && <div className="success">{msg}</div>}

          <button className="primary" type="submit">
            {signup ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p>
          {signup ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
          <button
            className="link"
            type="button"
            onClick={() => {
              setSignup(!signup)
              setErr('')
              setMsg('')
            }}
          >
            {signup ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </div>
    </main>
  )
}

function Shell({ profile }: { profile: Profile | null }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const isAdmin = profile?.is_admin === true || profile?.role === 'admin'

  async function logout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="layout">
      <aside className={open ? 'open' : ''}>
        <div className="logo">
          <span className="brand small">
            <Sparkles />
          </span>

          <b>Figurinhas</b>

          <button
            onClick={() => setOpen(false)}
            className="close"
            type="button"
            aria-label="Fechar menu"
          >
            <X />
          </button>
        </div>

        <div className="who">
          <UserRound />
          <span>
            {profile?.nome || 'Colecionador'}
            <small>
              {isAdmin ? 'Administrador' : 'Colecionador'}
            </small>
          </span>
        </div>

        <nav>
          <Link to="/dashboard" onClick={() => setOpen(false)}>
            <Home /> Início
          </Link>

          <Link to="/colecao" onClick={() => setOpen(false)}>
            <BookOpen /> Minha coleção
          </Link>

          {isAdmin && (
            <Link to="/admin" onClick={() => setOpen(false)}>
              <Shield /> Painel admin
            </Link>
          )}
        </nav>

        <button className="logout" onClick={logout} type="button">
          <LogOut /> Sair
        </button>
      </aside>

      {open && (
        <div
          className="overlay"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="main">
        <header>
          <button
            className="menu"
            onClick={() => setOpen(true)}
            type="button"
            aria-label="Abrir menu"
          >
            <Menu />
          </button>

          <b>Figurinhas</b>
        </header>

        <Routes>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

        <Route
  path="/dashboard"
  element={<Dashboard />}
/>

          <Route
            path="/colecao"
            element={<Collection />}
          />

          <Route
            path="/admin"
            element={
              isAdmin ? (
                <Admin />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </div>
    </div>
  )
}
