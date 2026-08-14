import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Album = {
  id: string
  nome: string
  ano?: number | null
  capa_url?: string | null
  total_stickers?: number | null
  ativo?: boolean | null
}

type Selection = {
  id: string
  nome: string
  tipo?: string | null
  logo_url?: string | null
}

type Sticker = {
  id: string
  album_id: string
  codigo: string
  nome: string
  selection_id?: string | null
  type_id?: string | null
  foto_url?: string | null
  ordem?: number | null
}

type UserSticker = {
  id: string
  user_id: string
  sticker_id: string
  quantidade: number
}

type Filter = 'todas' | 'tenho' | 'faltam' | 'repetidas'

export default function Collection() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [albums, setAlbums] = useState<Album[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [userStickers, setUserStickers] = useState<Record<string, number>>({})
  const [selections, setSelections] = useState<Record<string, Selection>>({})

  const [selectedAlbumId, setSelectedAlbumId] = useState(
    searchParams.get('album') || ''
  )
  const [filter, setFilter] = useState<Filter>('todas')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) || null,
    [albums, selectedAlbumId]
  )

  useEffect(() => {
    loadAlbums()
  }, [])

  useEffect(() => {
    if (selectedAlbumId) {
      setSearchParams({ album: selectedAlbumId }, { replace: true })
      loadCollection(selectedAlbumId)
    }
  }, [selectedAlbumId])

  async function loadAlbums() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate('/')
        return
      }

      const { data, error: albumError } = await supabase
  .from('albums')
  .select(
    'id, nome, ano, capa_url, total_stickers, ativo, created_at, updated_at'
  )
        .eq('ativo', true)
        .order('ano', { ascending: false })
        .order('nome', { ascending: true })

      if (albumError) throw albumError

      setAlbums((data ?? []) as Album[])

      if (!selectedAlbumId && data && data.length > 0) {
        setSelectedAlbumId(data[0].id)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os álbuns.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadCollection(albumId: string) {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate('/')
        return
      }

      const { data: stickerData, error: stickerError } = await supabase
        .from('stickers')
        .select(
          'id, album_id, codigo, nome, selection_id, type_id, foto_url, ordem'
        )
        .eq('album_id', albumId)
        .order('ordem', { ascending: true })
        .order('codigo', { ascending: true })

      if (stickerError) throw stickerError

      const stickerList = (stickerData ?? []) as Sticker[]
      setStickers(stickerList)

      const { data: userStickerData, error: userStickerError } =
        await supabase
          .from('user_stickers')
          .select('id, user_id, sticker_id, quantidade')
          .eq('user_id', user.id)
          .in(
            'sticker_id',
            stickerList.length > 0 ? stickerList.map((sticker) => sticker.id) : ['00000000-0000-0000-0000-000000000000']
          )

      if (userStickerError) throw userStickerError

      const quantities: Record<string, number> = {}

      for (const item of (userStickerData ?? []) as UserSticker[]) {
        quantities[item.sticker_id] = Number(item.quantidade) || 0
      }

      setUserStickers(quantities)

      const selectionIds = Array.from(
        new Set(
          stickerList
            .map((sticker) => sticker.selection_id)
            .filter((id): id is string => Boolean(id))
        )
      )

      if (selectionIds.length > 0) {
        const { data: selectionData, error: selectionError } =
          await supabase
            .from('selections')
            .select('id, nome, tipo, logo_url, created_at')
            .in('id', selectionIds)

        if (selectionError) throw selectionError

        const selectionMap: Record<string, Selection> = {}

        for (const selection of (selectionData ?? []) as Selection[]) {
          selectionMap[selection.id] = selection
        }

        setSelections(selectionMap)
      } else {
        setSelections({})
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar a coleção.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function updateQuantity(sticker: Sticker, change: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/')
      return
    }

    const current = userStickers[sticker.id] || 0
    const next = Math.max(0, current + change)

    if (next === current) return

    setSavingId(sticker.id)
    setError('')

    setUserStickers((previous) => ({
      ...previous,
      [sticker.id]: next,
    }))

    try {
      if (next === 0) {
        const { error: deleteError } = await supabase
          .from('user_stickers')
          .delete()
          .eq('user_id', user.id)
          .eq('sticker_id', sticker.id)

        if (deleteError) throw deleteError
      } else {
        const { error: upsertError } = await supabase
          .from('user_stickers')
          .upsert(
            {
              user_id: user.id,
              sticker_id: sticker.id,
              quantidade: next,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,sticker_id',
            }
          )

        if (upsertError) throw upsertError
      }
    } catch (err) {
      setUserStickers((previous) => ({
        ...previous,
        [sticker.id]: current,
      }))

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível guardar a quantidade.'
      )
    } finally {
      setSavingId(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const filteredStickers = useMemo(() => {
    const term = search.trim().toLowerCase()

    return stickers.filter((sticker) => {
      const quantity = userStickers[sticker.id] || 0

      if (filter === 'tenho' && quantity < 1) return false
      if (filter === 'faltam' && quantity > 0) return false
      if (filter === 'repetidas' && quantity < 2) return false

      if (!term) return true

      return (
        sticker.codigo.toLowerCase().includes(term) ||
        sticker.nome.toLowerCase().includes(term)
      )
    })
  }, [stickers, userStickers, filter, search])

  const totalStickers = stickers.length

  const ownedUnique = useMemo(
    () =>
      stickers.filter(
        (sticker) => (userStickers[sticker.id] || 0) > 0
      ).length,
    [stickers, userStickers]
  )

  const missing = Math.max(0, totalStickers - ownedUnique)

  const repeated = useMemo(
    () =>
      stickers.reduce(
        (total, sticker) =>
          total + Math.max((userStickers[sticker.id] || 0) - 1, 0),
        0
      ),
    [stickers, userStickers]
  )

  const progress =
    totalStickers > 0
      ? Math.round((ownedUnique / totalStickers) * 100)
      : 0

  return (
    <main className="collection-page">
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
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Sair
          </button>
        </div>
      </header>

      <section className="collection-content">
        <div className="collection-top">
          <button
            type="button"
            className="back-button"
            onClick={() => navigate('/dashboard')}
          >
            ← Dashboard
          </button>

          <div>
            <span className="eyebrow">MINHA COLEÇÃO</span>
            <h1>Figurinhas</h1>
          </div>
        </div>

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        <section className="collection-toolbar">
          <label className="album-select-label">
            Álbum

            <select
              value={selectedAlbumId}
              onChange={(event) =>
                setSelectedAlbumId(event.target.value)
              }
              disabled={loading || albums.length === 0}
            >
              {albums.length === 0 ? (
                <option value="">Nenhum álbum disponível</option>
              ) : (
                albums.map((album) => (
                  <option value={album.id} key={album.id}>
                    {album.nome}
                    {album.ano ? ` — ${album.ano}` : ''}
                  </option>
                ))
              )}
            </select>
          </label>

          {selectedAlbum && (
            <div className="collection-progress">
              <div className="progress-text">
                <span>
                  {ownedUnique} de {totalStickers} figurinhas
                </span>
                <strong>{progress}%</strong>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-value"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {selectedAlbum && (
          <section className="collection-stats">
            <button
              type="button"
              className={filter === 'todas' ? 'filter-card active' : 'filter-card'}
              onClick={() => setFilter('todas')}
            >
              <strong>{totalStickers}</strong>
              <span>Todas</span>
            </button>

            <button
              type="button"
              className={filter === 'tenho' ? 'filter-card active' : 'filter-card'}
              onClick={() => setFilter('tenho')}
            >
              <strong>{ownedUnique}</strong>
              <span>Tenho</span>
            </button>

            <button
              type="button"
              className={filter === 'faltam' ? 'filter-card active' : 'filter-card'}
              onClick={() => setFilter('faltam')}
            >
              <strong>{missing}</strong>
              <span>Faltam</span>
            </button>

            <button
              type="button"
              className={filter === 'repetidas' ? 'filter-card active' : 'filter-card'}
              onClick={() => setFilter('repetidas')}
            >
              <strong>{repeated}</strong>
              <span>Repetidas</span>
            </button>
          </section>
        )}

        <section className="collection-list-header">
          <div>
            <h2>
              {selectedAlbum?.nome || 'Coleção'}
            </h2>
            <span>
              {filteredStickers.length} figurinha(s)
            </span>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar código ou nome..."
            className="sticker-search"
          />
        </section>

        {!loading && albums.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">📚</div>
            <h3>Nenhum álbum disponível</h3>
            <p>
              O administrador ainda não cadastrou nenhum álbum ativo.
            </p>
          </div>
        ) : !loading && filteredStickers.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">🔎</div>
            <h3>Nenhuma figurinha encontrada</h3>
            <p>
              Tente mudar o filtro ou pesquisar outro código/nome.
            </p>
          </div>
        ) : (
          <section className="stickers-grid">
            {filteredStickers.map((sticker) => {
              const quantity = userStickers[sticker.id] || 0
              const selection = sticker.selection_id
                ? selections[sticker.selection_id]
                : undefined

              return (
                <article
                  className={
                    quantity > 1
                      ? 'sticker-card repeated'
                      : quantity > 0
                        ? 'sticker-card owned'
                        : 'sticker-card missing'
                  }
                  key={sticker.id}
                >
                  <div className="sticker-image-wrapper">
                    {sticker.foto_url ? (
                      <img
                        src={sticker.foto_url}
                        alt={`${sticker.codigo} - ${sticker.nome}`}
                        className="sticker-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="sticker-image placeholder">
                        <span>🖼️</span>
                        <small>Sem foto</small>
                      </div>
                    )}

                    <span className="sticker-code">
                      {sticker.codigo}
                    </span>

                    {quantity > 1 && (
                      <span className="repeated-badge">
                        🔁 {quantity}
                      </span>
                    )}
                  </div>

                  <div className="sticker-info">
                    <h3>{sticker.nome}</h3>

                    {selection && (
                      <div className="selection-info">
                        {selection.logo_url && (
                          <img
                            src={selection.logo_url}
                            alt=""
                            className="selection-logo"
                          />
                        )}

                        <span>{selection.nome}</span>
                      </div>
                    )}

                    <div className="quantity-row">
                      <span>
                        {quantity === 0
                          ? 'Faltando'
                          : quantity === 1
                            ? 'Tenho 1'
                            : `Tenho ${quantity}`}
                      </span>

                      <div className="quantity-controls">
                        <button
                          type="button"
                          onClick={() => updateQuantity(sticker, -1)}
                          disabled={
                            quantity === 0 ||
                            savingId === sticker.id
                          }
                          aria-label={`Diminuir quantidade de ${sticker.nome}`}
                        >
                          −
                        </button>

                        <strong>{quantity}</strong>

                        <button
                          type="button"
                          onClick={() => updateQuantity(sticker, 1)}
                          disabled={savingId === sticker.id}
                          aria-label={`Aumentar quantidade de ${sticker.nome}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </section>
    </main>
  )
}
