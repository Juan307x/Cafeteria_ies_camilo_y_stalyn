import { useState, useEffect, useCallback, useMemo } from 'react'

/* ═══════════════════════════════════════════════
   API — usa proxy de Vite, sin problemas de CORS
   ═══════════════════════════════════════════════ */
const BASE = window.location.hostname === 'localhost' ? '/api' : 'https://cafeteria-backend-irn6.onrender.com/api'

async function getCookie(name) {
  return document.cookie.split(";").map(c=>c.trim()).find(c=>c.startsWith(name+"="))?.split("=")[1] || ""
}
async function req(path, opts = {}) {
  const csrftoken = getCookie("csrftoken")
  const r = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken, ...opts.headers },
    ...opts,
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || `Error ${r.status}`)
  }
  return r.json()
}

const api = {
  login:       (u, p) => req('/auth/login/', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }),
  logout:      ()     => req('/auth/logout/', { method: 'POST' }),
  me:          ()     => req('/auth/me/'),
  products:    ()     => req('/products/'),
  categories:  ()     => req('/categories/'),
  timeslots:   ()     => req('/timeslots/'),
  orders:      ()     => req('/orders/'),
  createOrder: (d)    => req('/orders/', { method: 'POST', body: JSON.stringify(d) }),
  updateOrder: (id,d) => req(`/orders/${id}/`, { method: 'PATCH', body: JSON.stringify(d) }),
  updateStock: (id,s) => req(`/products/${id}/stock/`, { method: 'POST', body: JSON.stringify({ stock: s }) }),
  favorites:   ()     => req('/favorites/'),
  toggleFav:   (id)   => req(`/favorites/${id}/toggle/`, { method: 'POST' }),
}

const fmt = (n) => Number(n).toFixed(2) + '€'

/* ═══════════════════════════════════════════════
   COMPONENTES PEQUEÑOS
   ═══════════════════════════════════════════════ */

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: type === 'error' ? '#c0392b' : '#27ae60',
      color: '#fff', padding: '13px 28px', borderRadius: 14, fontSize: 14,
      fontWeight: 600, zIndex: 9999, boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
      whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
      <div style={{
        width: 42, height: 42, border: '3px solid #f0e6d3',
        borderTop: '3px solid #c0392b', borderRadius: '50%',
        animation: 'spin .7s linear infinite',
      }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════
   LOGIN
   ═══════════════════════════════════════════════ */
function LoginPage({ onLogin, showToast }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!username || !password) { setError('Rellena todos los campos'); return }
    setLoading(true); setError('')
    try {
      const user = await api.login(username, password)
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.loginWrap}>
      <div style={s.loginCard}>
        <div style={{ fontSize: 64, marginBottom: 4 }}>☕</div>
        <h1 style={s.loginTitle}>Cafetería IES</h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>Sistema de pedidos online</p>

        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={submit} style={{ width: '100%' }}>
          <label style={s.label}>Usuario</label>
          <input style={s.input} value={username} autoFocus
            onChange={e => setUsername(e.target.value)} placeholder="admin / alumno" />

          <label style={s.label}>Contraseña</label>
          <input style={s.input} type="password" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••" />

          <button style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: '14px 16px', background: '#fdf6ee', borderRadius: 10, width: '100%' }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600 }}>CUENTAS DE PRUEBA</p>
          <p style={{ fontSize: 13, color: '#555' }}>👑 <strong>admin</strong> / admin123</p>
          <p style={{ fontSize: 13, color: '#555' }}>🎒 <strong>alumno</strong> / alumno123</p>
          <p style={{ fontSize: 13, color: '#555' }}>📚 <strong>profe</strong> / profe123</p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TOPBAR
   ═══════════════════════════════════════════════ */
function Topbar({ user, cartCount, view, setView, onLogout }) {
  const navItems = [
    { id: 'menu',   label: '🍽️ Menú' },
    { id: 'orders', label: '📋 Mis Pedidos' },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: '⚙️ Admin' }] : []),
  ]

  return (
    <header style={s.topbar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 24 }}>☕</span>
        <span style={s.topbarTitle}>Cafetería IES</span>
      </div>

      <nav style={s.topbarNav}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            style={{ ...s.navBtn, ...(view === item.id ? s.navBtnActive : {}) }}>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {cartCount > 0 && (
          <button onClick={() => setView('cart')} style={s.cartBtn}>
            🛒 <span style={s.cartBadge}>{cartCount}</span>
          </button>
        )}
        <div style={s.userChip}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#27ae60', display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f5d49a' }}>{user?.first_name || user?.username}</span>
          <span style={s.roleBadge}>{user?.role}</span>
        </div>
        <button onClick={onLogout} style={s.btnLogout}>Salir</button>
      </div>
    </header>
  )
}

/* ═══════════════════════════════════════════════
   MENÚ
   ═══════════════════════════════════════════════ */
function MenuPage({ cart, setCart, showToast }) {
  const [products, setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [favIds, setFavIds]       = useState(new Set())
  const [filter, setFilter]       = useState('Todos')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([api.products(), api.categories(), api.favorites()])
      .then(([prods, cats, favs]) => {
        setProducts(prods)
        setCategories(cats)
        setFavIds(new Set(favs.map(f => f.product.id)))
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const toggleFav = useCallback(async (id) => {
    try {
      const res = await api.toggleFav(id)
      setFavIds(prev => {
        const next = new Set(prev)
        res.favorited ? next.add(id) : next.delete(id)
        return next
      })
    } catch (e) { showToast(e.message, 'error') }
  }, [])

  const addToCart = useCallback((product) => {
    if (product.stock <= 0) return
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
    showToast(`${product.emoji} ${product.name} añadido al carrito`)
  }, [])

  const allFilters = useMemo(() => ['Todos', 'Saludable', ...categories.map(c => c.name)], [categories])

  const filtered = useMemo(() => products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'Todos'     ? true :
      filter === 'Saludable' ? p.healthy :
      p.category_name === filter
    return matchSearch && matchFilter
  }), [products, search, filter])

  const favProducts = useMemo(() => products.filter(p => favIds.has(p.id)), [products, favIds])

  if (loading) return <Spinner />

  return (
    <div style={s.page}>
      {/* Búsqueda */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...s.input, flex: 1, minWidth: 200, maxWidth: 320, marginBottom: 0 }}
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar producto…" />
        <span style={{ color: '#888', fontSize: 13 }}>{filtered.length} productos</span>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
        {allFilters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ ...s.chip, ...(filter === f ? s.chipActive : {}) }}>
            {f === 'Saludable' ? '🥦 Saludable' : f}
          </button>
        ))}
      </div>

      {/* Favoritos */}
      {favProducts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={s.sectionTitle}>⭐ Mis favoritos</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {favProducts.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} style={s.favChip}>
                <span>{p.emoji}</span>
                <span style={{ fontSize: 13 }}>{p.name}</span>
                <span style={{ color: '#c0392b', fontWeight: 700, fontSize: 13 }}>{fmt(p.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid de productos */}
      {filtered.length === 0
        ? <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>No hay productos que coincidan.</p>
        : (
          <div style={s.grid}>
            {filtered.map(p => {
              const inCart = cart.find(i => i.id === p.id)?.qty || 0
              return (
                <div key={p.id} style={{ ...s.productCard, opacity: p.stock === 0 ? 0.55 : 1 }}>
                  <div style={{ fontSize: 44, marginBottom: 4 }}>{p.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, textAlign: 'center', color: '#2c1810', lineHeight: 1.3 }}>{p.name}</div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', margin: '6px 0' }}>
                    {p.healthy && <span style={s.badgeGreen}>🥦 Saludable</span>}
                    {p.category_name && <span style={s.badgeGray}>{p.category_name}</span>}
                  </div>

                  <div style={{ fontSize: 11, color: p.stock === 0 ? '#c0392b' : p.stock <= 5 ? '#e67e22' : '#888' }}>
                    {p.stock === 0 ? '❌ Agotado' : p.stock <= 5 ? `⚠️ Solo ${p.stock} ud.` : `Stock: ${p.stock}`}
                  </div>

                  <div style={{ fontSize: 20, fontWeight: 800, color: '#c0392b', margin: '8px 0' }}>{fmt(p.price)}</div>

                  <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                    <button onClick={() => toggleFav(p.id)} style={s.btnFav} title={favIds.has(p.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
                      {favIds.has(p.id) ? '★' : '☆'}
                    </button>
                    <button onClick={() => addToCart(p)} disabled={p.stock === 0}
                      style={{ ...s.btnAdd, ...(p.stock === 0 ? { background: '#ccc', cursor: 'not-allowed' } : {}) }}>
                      {inCart > 0 ? `+1 (${inCart} en cesta)` : '+ Añadir'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CARRITO
   ═══════════════════════════════════════════════ */
function CartPage({ cart, setCart, showToast, setView }) {
  const [slots, setSlots]           = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    api.timeslots().then(setSlots).catch(e => showToast(e.message, 'error'))
  }, [])

  const remove    = useCallback((id) => setCart(prev => prev.filter(i => i.id !== id)), [])
  const changeQty = useCallback((id, delta) => setCart(prev =>
    prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
  ), [])

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart])

  const checkout = async () => {
    if (!selectedSlot) { showToast('Elige una franja horaria', 'error'); return }
    setLoading(true)
    try {
      const order = await api.createOrder({
        time_slot_id: selectedSlot,
        items: cart.map(i => ({ product_id: i.id, quantity: i.qty })),
      })
      setCart([])
      showToast(`✅ Pedido ${order.code} confirmado!`)
      setView('orders')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (cart.length === 0) return (
    <div style={{ ...s.page, textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🛒</div>
      <p style={{ color: '#888', marginBottom: 24, fontSize: 16 }}>Tu carrito está vacío</p>
      <button onClick={() => setView('menu')} style={{ ...s.btnPrimary, maxWidth: 220, margin: '0 auto' }}>
        Ver menú
      </button>
    </div>
  )

  return (
    <div style={s.page}>
      <h2 style={s.pageTitle}>🛒 Tu pedido</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {cart.map(item => (
          <div key={item.id} style={s.cartItem}>
            <span style={{ fontSize: 32 }}>{item.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#2c1810' }}>{item.name}</div>
              <div style={{ color: '#c0392b', fontWeight: 700, fontSize: 15 }}>{fmt(item.price * item.qty)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => changeQty(item.id, -1)} style={s.qtyBtn}>−</button>
              <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 800, fontSize: 16 }}>{item.qty}</span>
              <button onClick={() => changeQty(item.id, +1)} style={s.qtyBtn}>+</button>
            </div>
            <button onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 20, padding: '0 4px' }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'right', fontSize: 20, fontWeight: 800, color: '#2c1810', padding: '12px 0', borderTop: '2px solid #f0e6d3', marginBottom: 24 }}>
        Total: <span style={{ color: '#c0392b' }}>{fmt(total)}</span>
      </div>

      <h3 style={s.sectionTitle}>🕐 Elige franja de recogida</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
        {slots.map(slot => (
          <button key={slot.id} onClick={() => setSelectedSlot(slot.id)}
            style={{
              ...s.slotBtn,
              ...(selectedSlot === slot.id ? s.slotBtnActive : {}),
            }}>
            {slot.label}
          </button>
        ))}
      </div>

      <button onClick={checkout} disabled={loading || !selectedSlot}
        style={{ ...s.btnPrimary, opacity: (!selectedSlot || loading) ? 0.5 : 1 }}>
        {loading ? 'Procesando…' : `💳 Confirmar pedido · ${fmt(total)}`}
      </button>
      <button onClick={() => setView('menu')} style={s.btnSecondary}>← Seguir comprando</button>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MIS PEDIDOS
   ═══════════════════════════════════════════════ */
function OrdersPage({ showToast }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.orders()
      .then(setOrders)
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const STATUS_LABEL = { pending: 'Pendiente', paid: 'Pagado', ready: '✅ Listo para recoger', delivered: 'Entregado', cancelled: 'Cancelado' }
  const STATUS_COLOR = { pending: '#e67e22', paid: '#27ae60', ready: '#2980b9', delivered: '#95a5a6', cancelled: '#c0392b' }

  if (loading) return <Spinner />

  return (
    <div style={s.page}>
      <h2 style={s.pageTitle}>📋 Mis pedidos</h2>
      {orders.length === 0
        ? <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>📭</div>
            <p style={{ color: '#888' }}>Aún no tienes pedidos</p>
          </div>
        : orders.map(o => (
          <div key={o.id} style={s.orderCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'serif', fontSize: 20, fontWeight: 800, color: '#2c1810' }}>{o.code}</span>
              <span style={{ ...s.statusBadge, background: STATUS_COLOR[o.status] + '22', color: STATUS_COLOR[o.status] }}>
                {STATUS_LABEL[o.status]}
              </span>
              <span style={{ marginLeft: 'auto', color: '#c0392b', fontWeight: 800, fontSize: 18 }}>{fmt(o.total)}</span>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
              🕐 {o.time_slot_label} &nbsp;·&nbsp; {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {o.items.map(i => (
                <span key={i.id} style={s.itemChip}>{i.product_emoji} {i.quantity}× {i.product_name}</span>
              ))}
            </div>
          </div>
        ))
      }
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ADMIN
   ═══════════════════════════════════════════════ */
function AdminPage({ showToast }) {
  const [tab, setTab]           = useState('orders')
  const [orders, setOrders]     = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([api.orders(), api.products()])
      .then(([o, p]) => { setOrders(o); setProducts(p) })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const setStatus = async (id, status) => {
    try {
      const updated = await api.updateOrder(id, { status })
      setOrders(prev => prev.map(o => o.id === id ? updated : o))
      showToast('Estado actualizado')
    } catch (e) { showToast(e.message, 'error') }
  }

  const setStock = async (id, stock) => {
    try {
      const updated = await api.updateStock(id, stock)
      setProducts(prev => prev.map(p => p.id === id ? updated : p))
    } catch (e) { showToast(e.message, 'error') }
  }

  const STATUS_COLOR = { pending: '#e67e22', paid: '#27ae60', ready: '#2980b9', delivered: '#95a5a6', cancelled: '#c0392b' }
  const STATUS_LABEL = { pending: 'Pendiente', paid: 'Pagado', ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelar' }

  // Estadísticas rápidas
  const stats = useMemo(() => ({
    total:     orders.length,
    pendiente: orders.filter(o => o.status === 'pending').length,
    ingresos:  orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0),
    agotados:  products.filter(p => p.stock === 0).length,
  }), [orders, products])

  if (loading) return <Spinner />

  return (
    <div style={s.page}>
      <h2 style={s.pageTitle}>⚙️ Panel de Administración</h2>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total pedidos', value: stats.total, color: '#2980b9', icon: '📦' },
          { label: 'Pendientes', value: stats.pendiente, color: '#e67e22', icon: '⏳' },
          { label: 'Ingresos', value: fmt(stats.ingresos), color: '#27ae60', icon: '💰' },
          { label: 'Agotados', value: stats.agotados, color: '#c0392b', icon: '❌' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'white', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: `4px solid ${stat.color}` }}>
            <div style={{ fontSize: 24 }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['orders', '📦 Pedidos'], ['stock', '🗃️ Stock']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ ...s.tabBtn, ...(tab === id ? s.tabBtnActive : {}) }}>
            {label}
          </button>
        ))}
      </div>

      {/* Pedidos */}
      {tab === 'orders' && (
        <div>
          {orders.length === 0 && <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>No hay pedidos todavía.</p>}
          {orders.map(o => (
            <div key={o.id} style={s.orderCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'serif', fontSize: 18, fontWeight: 800, color: '#2c1810' }}>{o.code}</span>
                <span style={{ fontSize: 12, color: '#888' }}>👤 {o.user_username}</span>
                <span style={{ fontSize: 12, color: '#888' }}>🕐 {o.time_slot_label}</span>
                <span style={{ marginLeft: 'auto', color: '#c0392b', fontWeight: 800, fontSize: 16 }}>{fmt(o.total)}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {o.items.map(i => (
                  <span key={i.id} style={s.itemChip}>{i.product_emoji} {i.quantity}× {i.product_name}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(STATUS_LABEL).map(([st, label]) => (
                  <button key={st} onClick={() => setStatus(o.id, st)}
                    style={{
                      padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      background: o.status === st ? STATUS_COLOR[st] : '#f0e6d3',
                      color: o.status === st ? 'white' : '#555',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stock */}
      {tab === 'stock' && (
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 110px', padding: '14px 20px', background: '#2c1810', color: '#f5d49a', fontWeight: 700, fontSize: 13 }}>
            <span>Producto</span><span>Stock</span><span>Estado</span>
          </div>
          {products.map((p, idx) => {
            const color = p.stock === 0 ? '#c0392b' : p.stock <= 5 ? '#e67e22' : '#27ae60'
            return (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 110px', alignItems: 'center', padding: '12px 20px', borderBottom: idx < products.length - 1 ? '1px solid #f0e6d3' : 'none', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.emoji} {p.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setStock(p.id, p.stock - 1)} style={s.qtyBtn}>−</button>
                  <input type="number" value={p.stock} min="0"
                    style={{ width: 52, textAlign: 'center', border: '1px solid #ddd', borderRadius: 6, padding: '4px', fontSize: 14, fontWeight: 700 }}
                    onChange={e => setStock(p.id, parseInt(e.target.value) || 0)} />
                  <button onClick={() => setStock(p.id, p.stock + 1)} style={s.qtyBtn}>+</button>
                </div>
                <span style={{ background: color + '22', color, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
                  {p.stock === 0 ? 'Agotado' : p.stock <= 5 ? 'Stock bajo' : 'OK'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   APP PRINCIPAL
   ═══════════════════════════════════════════════ */
export default function App() {
  const [user, setUser]         = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [view, setView]         = useState('menu')
  const [cart, setCart]         = useState([])
  const [toast, setToast]       = useState(null)

  useEffect(() => {
    api.me().then(setUser).catch(() => {}).finally(() => setAuthLoading(false))
  }, [])

  const showToast = useCallback((message, type = 'ok') => setToast({ message, type }), [])

  const handleLogout = async () => {
    await api.logout().catch(() => {})
    setUser(null); setCart([]); setView('menu')
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fdf6ee' }}>
      <Spinner />
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #fdf6ee; color: #2c1810; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input, button { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #c0392b; border-radius: 3px; }
        button:hover { filter: brightness(1.05); }
      `}</style>

      {!user
        ? <LoginPage onLogin={setUser} showToast={showToast} />
        : (
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Topbar
              user={user}
              cartCount={cart.reduce((s, i) => s + i.qty, 0)}
              view={view} setView={setView}
              onLogout={handleLogout}
            />
            <main style={{ flex: 1 }}>
              {view === 'menu'   && <MenuPage cart={cart} setCart={setCart} showToast={showToast} />}
              {view === 'cart'   && <CartPage cart={cart} setCart={setCart} showToast={showToast} setView={setView} />}
              {view === 'orders' && <OrdersPage showToast={showToast} />}
              {view === 'admin'  && user.role === 'admin' && <AdminPage showToast={showToast} />}
            </main>
          </div>
        )
      }

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}

/* ═══════════════════════════════════════════════
   ESTILOS
   ═══════════════════════════════════════════════ */
const s = {
  // Login
  loginWrap: {
    minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
    background: 'linear-gradient(135deg, #c0392b 0%, #8b1a1a 50%, #2c1810 100%)',
    padding: 16,
  },
  loginCard: {
    background: 'white', padding: '44px 36px', borderRadius: 20,
    width: 400, maxWidth: '100%',
    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  loginTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 30,
    color: '#2c1810', marginBottom: 4,
  },

  // Topbar
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', height: 62, background: '#2c1810',
    boxShadow: '0 3px 16px rgba(0,0,0,0.3)', position: 'sticky', top: 0, zIndex: 100,
    gap: 12,
  },
  topbarTitle: {
    fontFamily: "'Playfair Display', serif", color: '#f5d49a', fontSize: 20, fontWeight: 800,
  },
  topbarNav: { display: 'flex', gap: 4, flex: 1, justifyContent: 'center', flexWrap: 'wrap' },
  navBtn: {
    background: 'transparent', border: 'none', color: '#c9a96e', cursor: 'pointer',
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  },
  navBtnActive: { background: '#c0392b', color: 'white' },
  cartBtn: {
    background: '#c0392b', border: 'none', color: 'white',
    cursor: 'pointer', padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: 15,
  },
  cartBadge: {
    background: '#f5d49a', color: '#2c1810', borderRadius: '50%',
    padding: '1px 7px', fontSize: 12, fontWeight: 800, marginLeft: 4,
  },
  userChip: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: '#3d2415', borderRadius: 8, padding: '5px 12px',
  },
  roleBadge: {
    background: '#c0392b', color: 'white', fontSize: 10, fontWeight: 700,
    padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase',
  },
  btnLogout: {
    background: 'transparent', border: '1px solid #c9a96e55', color: '#c9a96e',
    cursor: 'pointer', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  },

  // Página general
  page: { maxWidth: 940, margin: '0 auto', padding: '28px 16px' },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: 28, color: '#2c1810', marginBottom: 24 },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: 18, color: '#2c1810', marginBottom: 12 },

  // Filtros
  chip: {
    padding: '6px 14px', borderRadius: 999, border: '1.5px solid #e0d3c8',
    background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#555',
  },
  chipActive: { background: '#c0392b', color: 'white', border: '1.5px solid #c0392b' },

  // Grid productos
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: 16,
  },
  productCard: {
    background: 'white', borderRadius: 16, padding: '18px 14px',
    boxShadow: '0 2px 14px rgba(0,0,0,0.07)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    border: '1px solid #f0e6d3',
  },

  badgeGreen: {
    background: '#e8f8f0', color: '#27ae60', borderRadius: 6,
    padding: '2px 8px', fontSize: 11, fontWeight: 700,
  },
  badgeGray: {
    background: '#f0e6d3', color: '#7b5e52', borderRadius: 6,
    padding: '2px 8px', fontSize: 11, fontWeight: 600,
  },

  btnFav: {
    background: '#fff8f0', border: '1.5px solid #f0e6d3', cursor: 'pointer',
    padding: '6px 10px', borderRadius: 8, fontSize: 18, flexShrink: 0,
  },
  btnAdd: {
    flex: 1, background: '#c0392b', color: 'white', border: 'none',
    borderRadius: 8, cursor: 'pointer', padding: '8px 4px', fontSize: 12, fontWeight: 700,
  },

  // Favoritos
  favChip: {
    display: 'flex', alignItems: 'center', gap: 8, background: 'white',
    border: '1.5px solid #f0e6d3', borderRadius: 12, padding: '10px 14px',
    cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  },

  // Carrito
  cartItem: {
    display: 'flex', alignItems: 'center', gap: 14, background: 'white',
    borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    border: '1px solid #f0e6d3',
  },
  qtyBtn: {
    background: '#f0e6d3', border: 'none', cursor: 'pointer',
    width: 30, height: 30, borderRadius: 7, fontSize: 18, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  slotBtn: {
    border: '2px solid #e0d3c8', background: 'white', borderRadius: 12, padding: '14px 10px',
    cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#555',
  },
  slotBtnActive: { border: '2px solid #c0392b', background: '#c0392b', color: 'white' },

  // Pedidos
  orderCard: {
    background: 'white', borderRadius: 14, padding: '18px 22px',
    marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    border: '1px solid #f0e6d3',
  },
  statusBadge: { borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 700 },
  itemChip: {
    background: '#f0e6d3', color: '#2c1810', borderRadius: 7,
    padding: '4px 10px', fontSize: 12, fontWeight: 600,
  },

  // Admin
  tabBtn: {
    padding: '9px 22px', borderRadius: 8, border: '2px solid #f0e6d3',
    background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#555',
  },
  tabBtnActive: { border: '2px solid #c0392b', background: '#c0392b', color: 'white' },

  // Forms
  label: { fontSize: 12, fontWeight: 700, color: '#7b5e52', marginBottom: 5, display: 'block', width: '100%', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e0d3c8',
    borderRadius: 10, fontSize: 14, marginBottom: 14, background: '#fffaf5', display: 'block',
  },
  errorBox: {
    background: '#fdf0ee', border: '1px solid #e0b0a8', color: '#c0392b',
    borderRadius: 8, padding: '11px 16px', fontSize: 13, marginBottom: 14, width: '100%',
  },
  btnPrimary: {
    width: '100%', padding: '13px', background: '#c0392b', color: 'white',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700,
    marginBottom: 8, display: 'block',
  },
  btnSecondary: {
    width: '100%', padding: '11px', background: '#f0e6d3', color: '#2c1810',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
    marginBottom: 8,
  },
}
