import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Album = {
  id: string
  nome: string
  descricao?: string | null
  ano?: number | null
  capa_url?: string | null
  total_stickers?: number | null
  ativo?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

type AlbumForm = {
  nome: string
  ano: string
  descricao: string
  total_stickers: string
  capa_url: string
  ativo: boolean
}

export default function Admin() {
  const navigate = useNavigate()
  const [albums, setAlbums] = useState<Album[]>([])
  const [form, setForm] = useState<AlbumForm>({
    nome: '', ano: '', descricao: '', total_stickers: '0', capa_url: '', ativo: true,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => { checkAdmin() }, [])

  async function checkAdmin() {
    setLoading(true)
    setError('')
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) { navigate('/'); return }

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).single()
      if (profileError) throw profileError

      if (!profile?.is_admin) { setIsAdmin(false); return }
      setIsAdmin(true)
      await loadAlbums()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível verificar as permissões.')
    } finally {
      setLoading(false)
    }
  }

  async function loadAlbums() {
    const { data, error: albumsError } = await supabase
      .from('albums')
      .select('id, nome, ano, capa_url, total_stickers, ativo, created_at, updated_at')
      .order('created_at', { ascending: false })
    if (albumsError) throw albumsError
    setAlbums((data ?? []) as Album[])
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target
    setForm(previous => ({ ...previous, [name]: value }))
  }

  function resetForm() {
    setEditingId(null)
    setForm({ nome: '', ano: '', descricao: '', total_stickers: '0', capa_url: '', ativo: true })
  }

  function editAlbum(album: Album) {
    setEditingId(album.id)
    setForm({
      nome: album.nome || '',
      ano: album.ano ? String(album.ano) : '',
      descricao: album.descricao || '',
      total_stickers: album.total_stickers != null ? String(album.total_stickers) : '0',
      capa_url: album.capa_url || '',
      ativo: album.ativo !== false,
    })
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.nome.trim()) { setError('Informe o nome do álbum.'); return }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const albumData = {
        nome: form.nome.trim(),
        ano: form.ano ? Number(form.ano) : null,
        descricao: form.descricao.trim() || null,
        total_stickers: Math.max(0, Number(form.total_stickers) || 0),
        capa_url: form.capa_url.trim() || null,
        ativo: form.ativo,
        updated_at: new Date().toISOString(),
      }

      if (editingId) {
        const { error: updateError } = await supabase.from('albums').update(albumData).eq('id', editingId)
        if (updateError) throw updateError
        setMessage('Álbum atualizado com sucesso.')
      } else {
        const { error: insertError } = await supabase.from('albums').insert(albumData)
        if (insertError) throw insertError
        setMessage('Álbum criado com sucesso.')
      }

      resetForm()
      await loadAlbums()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar o álbum.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAlbum(album: Album) {
    setActionId(album.id)
    setMessage('')
    setError('')
    try {
      const { error: updateError } = await supabase.from('albums').update({
        ativo: !album.ativo, updated_at: new Date().toISOString(),
      }).eq('id', album.id)
      if (updateError) throw updateError
      setMessage(album.ativo ? 'Álbum desativado.' : 'Álbum ativado.')
      await loadAlbums()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o estado do álbum.')
    } finally {
      setActionId(null)
    }
  }

  async function deleteAlbum(album: Album) {
    if (!window.confirm(`Tem certeza que deseja excluir o álbum "${album.nome}"?`)) return
    setActionId(album.id)
    setMessage('')
    setError('')
    try {
      const { error: deleteError } = await supabase.from('albums').delete().eq('id', album.id)
      if (deleteError) throw deleteError
      setMessage('Álbum excluído com sucesso.')
      if (editingId === album.id) resetForm()
      await loadAlbums()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir o álbum.')
    } finally {
      setActionId(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) return (
    <main className="container"><div className="card"><h1>Verificando acesso...</h1><p>Aguarde enquanto verificamos as permissões.</p></div></main>
  )

  if (!isAdmin) return (
    <main className="container"><div className="card">
      <h1>Acesso negado</h1>
      <p>Sua conta não possui permissão para acessar o painel administrativo.</p>
      <div className="admin-actions">
        <button type="button" onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</button>
        <button type="button" onClick={handleLogout}>Sair</button>
      </div>
    </div></main>
  )

  return (
    <main className="container admin-page">
      <header className="admin-header">
        <div><span className="eyebrow">ADMINISTRAÇÃO</span><h1>Painel administrativo</h1><p>Gerencie os álbuns disponíveis para os colecionadores.</p></div>
        <div className="admin-actions">
          <button type="button" className="secondary-button" onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <button type="button" className="logout-button" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="admin-grid">
        <section className="card admin-form-card">
          <div className="section-heading">
            <div><span className="eyebrow">{editingId ? 'EDITAR' : 'NOVO'}</span><h2>{editingId ? 'Editar álbum' : 'Novo álbum'}</h2></div>
            {editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancelar</button>}
          </div>

          <form onSubmit={handleSubmit}>
            <label>Nome do álbum
              <input name="nome" value={form.nome} onChange={handleInputChange} placeholder="Ex.: FIFA 2026" required />
            </label>

            <div className="form-row">
              <label>Ano
                <input name="ano" type="number" min="1900" max="2100" value={form.ano} onChange={handleInputChange} placeholder="2026" />
              </label>
              <label>Total de figurinhas
                <input name="total_stickers" type="number" min="0" value={form.total_stickers} onChange={handleInputChange} placeholder="500" />
              </label>
            </div>

            <label>Descrição
              <textarea name="descricao" value={form.descricao} onChange={handleInputChange} placeholder="Descrição do álbum..." rows={5} />
            </label>

            <label>URL da capa
              <input name="capa_url" type="url" value={form.capa_url} onChange={handleInputChange} placeholder="https://..." />
            </label>

            <label className="checkbox-label">
              <input type="checkbox" checked={form.ativo} onChange={event => setForm(previous => ({ ...previous, ativo: event.target.checked }))} />
              <span>Álbum ativo</span>
            </label>

            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Salvar alterações' : 'Criar álbum'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="section-heading">
            <div><span className="eyebrow">CATÁLOGO</span><h2>Álbuns cadastrados</h2></div>
            <span className="admin-count">{albums.length}</span>
          </div>

          {albums.length === 0 ? (
            <div className="empty-card"><div className="empty-icon">📚</div><h3>Nenhum álbum cadastrado</h3><p>Use o formulário para criar o primeiro álbum.</p></div>
          ) : (
            <div className="admin-albums-list">
              {albums.map(album => (
                <article className="admin-album-row" key={album.id}>
                  <div className="admin-album-cover">
                    {album.capa_url ? <img src={album.capa_url} alt={album.nome} /> : <span>📖</span>}
                  </div>
                  <div className="admin-album-info">
                    <div className="album-title-line">
                      <h3>{album.nome}</h3>
                      <span className={album.ativo ? 'status-badge active' : 'status-badge inactive'}>{album.ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    <p>{album.ano || 'Ano não informado'} · {album.total_stickers || 0} figurinhas</p>
                    <div className="admin-row-actions">
                      <button type="button" className="secondary-button" onClick={() => editAlbum(album)} disabled={actionId === album.id}>Editar</button>
                      <button type="button" className="secondary-button" onClick={() => toggleAlbum(album)} disabled={actionId === album.id}>
                        {actionId === album.id ? 'Aguarde...' : album.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button type="button" className="danger-button" onClick={() => deleteAlbum(album)} disabled={actionId === album.id}>Excluir</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card admin-next-step">
        <div><span className="eyebrow">PRÓXIMO MÓDULO</span><h2>Cadastro de figurinhas</h2><p>Depois dos álbuns, vamos cadastrar as figurinhas, selecionar a seleção/escuderia, definir o tipo, ordem e adicionar as fotos.</p></div>
        <span className="next-icon">🖼️</span>
      </section>
    </main>
  )
}
