import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Album = {
  id: string
  name: string
  cover_url?: string | null
}

type UserSticker = {
  id: string
  sticker_id: string
  quantity: number
}

export default function Dashboard() {
  const navigate = useNavigate()

  const [albums, setAlbums] = useState<Album[]>([])
  const [userStickers, setUserStickers] = useState<UserSticker[]>([])
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        navigate('/')
        return
      }

      const metadataName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : ''

      setUserName(metadataName || user.email?.split('@')[0] || 'Colecionador')

      const { data: albumData, error: albumError } = await supabase
        .from('user_albums')
        .select(`
          album_id,
          albums (
            id,
            name,
            cover_url
          )
        `)
        .eq('user_id', user.id)

      if (albumError) throw albumError

      const formattedAlbums: Album[] = (albumData ?? [])
        .map((item: any) => {
          const album = Array.isArray(item.albums)
            ? item.albums[0]
            : item.albums

          return album
            ? {
                id: album.id,
                name: album.name,
                cover_url: album.cover_url ?? null,
              }
            : null
        })
        .filter(Boolean) as Album[]

      setAlbums(formattedAlbums)

      const { data: stickerData, error: stickerError } = await supabase
        .from('user_stickers')
        .select('id, sticker_id, quantity')
        .eq('user_id', user.id)

      if (stickerError) throw stickerError

      setUserStickers((stickerData ?? []) as UserSticker[])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const totalOwned = useMemo(
    () =>
      userStickers.reduce(
        (total, sticker) => total + Math.max(sticker.quantity || 0, 0),
        0
      ),
    [userStickers]
  )

  const totalRepeated = useMemo(
    () =>
      userStickers.reduce(
        (total, sticker) =>
          total + Math.max((sticker.quantity || 0) - 1, 0),
        0
      ),
    [userStickers]
  )

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <button
          type="button"
          className="brand-button"
          onClick={() => navigate('/dashboard')}
        >
          <span className="brand-mark">✦</span>
          <span>FIGURINHAS</span>
        </button>

        <div className="header-actions">
          <span className="user-email">{userName}</span>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Sair
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="welcome">
          <div>
            <span className="eyebrow">MINHA COLEÇÃO</span>
            <h1>Olá, {userName}! 👋</h1>
            <p>Acompanhe a sua coleção de figurinhas.</p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate('/collection')}
          >
            Minha coleção
          </button>
        </div>

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon">📚</span>
            <span className="stat-label">Álbuns</span>
            <strong>{loading ? '—' : albums.length}</strong>
          </article>

          <article className="stat-card">
            <span className="stat-icon">⭐</span>
            <span className="stat-label">Figurinhas que tenho</span>
            <strong>{loading ? '—' : totalOwned}</strong>
          </article>

          <article className="stat-card">
            <span className="stat-icon">🔁</span>
            <span className="stat-label">Repetidas</span>
            <strong>{loading ? '—' : totalRepeated}</strong>
          </article>
        </section>

        <section className="albums-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">COLEÇÃO</span>
              <h2>Meus álbuns</h2>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate('/collection')}
            >
              Ver coleção
            </button>
          </div>

          {loading ? (
            <div className="empty-card">
              <p>Carregando a sua coleção...</p>
            </div>
          ) : albums.length === 0 ? (
            <div className="empty-card">
              <div className="empty-icon">📚</div>
              <h3>Nenhum álbum adicionado</h3>
              <p>
                Quando os álbuns forem cadastrados pelo administrador,
                eles aparecerão aqui.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => navigate('/collection')}
              >
                Ver álbuns disponíveis
              </button>
            </div>
          ) : (
            <div className="albums-grid">
              {albums.map((album) => (
                <button
                  type="button"
                  className="album-card"
                  key={album.id}
                  onClick={() => navigate(`/collection?album=${album.id}`)}
                >
                  {album.cover_url ? (
                    <img
                      src={album.cover_url}
                      alt={album.name}
                      className="album-cover"
                    />
                  ) : (
                    <div className="album-cover placeholder">
                      📖
                    </div>
                  )}

                  <div className="album-info">
                    <h3>{album.name}</h3>
                    <span>Ver coleção →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
