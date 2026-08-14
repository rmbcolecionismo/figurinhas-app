import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    setMessage('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  async function handleSubmit(
  event: React.FormEvent<HTMLFormElement>
) {
    event.preventDefault()

    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        })

        if (error) {
          throw error
        }

        setMessage(
          'Conta criada com sucesso. Verifique o seu e-mail para confirmar a conta.'
        )

        setPassword('')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }

        navigate('/dashboard')
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Ocorreu um erro. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  function toggleMode() {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError('')
    setMessage('')
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div>
          <div className="brand-mark">
            <span>✦</span>
          </div>

          <span className="eyebrow">
            COLECIONE • ORGANIZE • COMPLETE
          </span>

          <h1>
            A sua coleção de figurinhas,
            sempre consigo.
          </h1>

          <p>
            Guarde os seus álbuns, controle as repetidas
            e descubra exatamente o que falta.
          </p>
        </div>

        <div className="visual-card">
          <div className="mini-sticker">001</div>
          <div className="mini-sticker">002</div>
          <div className="mini-sticker">003</div>
          <div className="mini-sticker">004</div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-box">
          <span className="eyebrow">
            BEM-VINDO
          </span>

          <h2>
            {mode === 'login'
              ? 'Entrar na sua coleção'
              : 'Criar a sua conta'}
          </h2>

          <p className="muted">
            Use o seu e-mail ou a sua conta Google.
          </p>

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <span className="google-g">G</span>

            {loading
              ? 'A processar...'
              : 'Continuar com Google'}
          </button>

          <div className="divider">
            <span>ou</span>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>
                Nome

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="O seu nome"
                  required
                />
              </label>
            )}

            <label>
              E-mail

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="voce@email.com"
                required
                autoComplete="email"
              />
            </label>

            <label>
              Palavra-passe

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                minLength={6}
                required
                autoComplete={
                  mode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
              />
            </label>

            {error && (
              <div className="alert error">
                {error}
              </div>
            )}

            {message && (
              <div className="alert success">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="primary-button full"
              disabled={loading}
            >
              {loading
                ? 'A processar...'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Criar conta'}
            </button>
          </form>

          <p className="switch">
            {mode === 'login'
              ? 'Ainda não tem conta?'
              : 'Já tem uma conta?'}

            <button
              type="button"
              onClick={toggleMode}
            >
              {mode === 'login'
                ? 'Criar conta'
                : 'Entrar'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
