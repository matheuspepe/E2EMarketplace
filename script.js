// E2E Marketplace MVP - No backend. All data in-memory + localStorage.
// Auth, Products, Cart, Orders, Suppliers, Payments simulation.

// ------------------------------ Utilities ------------------------------
const Storage = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  del(key) { localStorage.removeItem(key); }
};

function formatCurrency(brlNumber) {
  return brlNumber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = type === 'error' ? '#e74c3c' : type === 'success' ? '#1fb97a' : '#1663ad';
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 3000);
}

let __booting = true;
function openModal(id) {
  if (__booting) return; // prevent accidental opens during boot
  document.getElementById('modalBackdrop').hidden = false;
  document.getElementById(id).hidden = false;
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
  document.getElementById('modalBackdrop').hidden = true;
}

function confirmDialog(message) {
  return new Promise(resolve => {
    document.getElementById('confirmMessage').textContent = message;
    openModal('modalConfirm');
    const yes = document.getElementById('confirmYes');
    const no = document.getElementById('confirmNo');
    const cleanup = () => {
      yes.onclick = null; no.onclick = null; closeModal('modalConfirm');
    };
    yes.onclick = () => { cleanup(); resolve(true); };
    no.onclick = () => { cleanup(); resolve(false); };
  });
}

// Simple SHA-256 hashing using Web Crypto
async function sha256(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ------------------------------ Data Models ------------------------------
let usuarios = Storage.get('usuarios', []);
let produtos = Storage.get('produtos', []);
let fornecedores = Storage.get('fornecedores', []);
let pedidos = Storage.get('pedidos', []);

let session = Storage.get('session', { userEmail: null, lastActivity: 0 });
let cart = Storage.get('cart', []); // [{productId, qty}]

function persistAll() {
  Storage.set('usuarios', usuarios);
  Storage.set('produtos', produtos);
  Storage.set('fornecedores', fornecedores);
  Storage.set('pedidos', pedidos);
  Storage.set('session', session);
  Storage.set('cart', cart);
}

function seedIfEmpty() {
  const seeded = Storage.get('seeded_v1', false);
  if (seeded) return;
  (async () => {
    // Users (3)
    usuarios = [
      { id: crypto.randomUUID(), nome: 'Ana Cliente', email: 'ana@e2e.com', senhaHash: await sha256('Ana@Cliente123!'), perfil: 'cliente' },
      { id: crypto.randomUUID(), nome: 'Vini Vendedor', email: 'vini@e2e.com', senhaHash: await sha256('Vini@Vendedor123!'), perfil: 'vendedor' },
      { id: crypto.randomUUID(), nome: 'Ada Admin', email: 'admin@e2e.com', senhaHash: await sha256('Admin@123456!'), perfil: 'admin' },
    ];

    // Suppliers (2)
    fornecedores = [
      { id: crypto.randomUUID(), nomeLoja: 'Tech Brasil LTDA', cnpj: '12.345.678/0001-90', contato: 'contato@techbr.com' },
      { id: crypto.randomUUID(), nomeLoja: 'Casa & Conforto ME', cnpj: '98.765.432/0001-10', contato: 'vendas@casaeconforto.com' },
    ];

    // Products (5)
    produtos = [
      { id: crypto.randomUUID(), nome: 'Smartphone 128GB', categoria: 'Eletrônicos', preco: 1799.90, estoque: 25, descricao: 'Tela 6.5", câmera dupla, bateria 5000mAh', imagem: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fget.pxhere.com%2Fphoto%2Fsmartphone-mobile-screen-technology-telephone-communication-gadget-mobile-phone-brand-product-electronics-digital-iphone6-multimedia-electronic-device-portable-communications-device-communication-device-feature-phone-1061929.jpg&f=1&nofb=1&ipt=78ea1a7a075c0a838a3e8ddccd85f2cafa29bac9a8af9dd5ce362e765fcff481', ativo: true, fornecedorId: fornecedores[0].id },
      { id: crypto.randomUUID(), nome: 'Notebook 15" i5', categoria: 'Informática', preco: 3499.00, estoque: 12, descricao: '8GB RAM, SSD 256GB, Windows 11', imagem: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fpicjumbo.com%2Fwp-content%2Fuploads%2Fmodern-laptop-on-wooden-desk-2210x1473.jpg&f=1&nofb=1&ipt=2dd11b93bbbfe22f64ce57f49577da255b803643824d8e1885168bf182df953f', ativo: true, fornecedorId: fornecedores[0].id },
      { id: crypto.randomUUID(), nome: 'Fone Bluetooth', categoria: 'Acessórios', preco: 299.90, estoque: 60, descricao: 'Cancelamento de ruído, 30h de bateria', imagem: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fthumbs.dreamstime.com%2Fb%2Fblack-bluetooth-headphone-white-background-374405027.jpg&f=1&nofb=1&ipt=779b62c6fb73831ccead87e7b0c42556eb68010a9e3555499ba44d96d6cae409', ativo: true, fornecedorId: fornecedores[0].id },
      { id: crypto.randomUUID(), nome: 'Liquidificador 900W', categoria: 'Eletroportáteis', preco: 219.00, estoque: 30, descricao: 'Copo de 2L, 12 velocidades', imagem: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fthumbs.dreamstime.com%2Fb%2Felectric-blender-25179381.jpg&f=1&nofb=1&ipt=8e4245fb3c3c34608b73f2a30f80e15865ffe8b12114e285f515b1c3c8829135', ativo: true, fornecedorId: fornecedores[1].id },
      { id: crypto.randomUUID(), nome: 'Travesseiro Ortopédico', categoria: 'Casa', preco: 149.90, estoque: 44, descricao: 'Espuma viscoelástica, antiácaro', imagem: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fthumbs.dreamstime.com%2Fb%2Forthopedic-pillow-bed-333745847.jpg&f=1&nofb=1&ipt=373033a37905a99b0958b0c051d1f3e591fde4743fd04e6a76cc6e4b31467cc3', ativo: true, fornecedorId: fornecedores[1].id },
    ];

    Storage.set('seeded_v1', true);
    persistAll();
    initUI();
    showToast('Dados iniciais carregados.', 'success');
  })();
}

// ------------------------------ Auth & Session ------------------------------
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function currentUser() {
  if (!session.userEmail) return null;
  return usuarios.find(u => u.email === session.userEmail) || null;
}

function touchSession() {
  session.lastActivity = Date.now();
  Storage.set('session', session);
}

function enforceSessionTimeout() {
  const now = Date.now();
  if (session.userEmail && now - session.lastActivity > SESSION_TIMEOUT_MS) {
    logout();
    showToast('Sessão expirada. Faça login novamente.', 'error');
  }
}
setInterval(enforceSessionTimeout, 60 * 1000);
['click', 'keydown', 'mousemove'].forEach(evt => document.addEventListener(evt, () => { if (session.userEmail) touchSession(); }));

async function registerUser({ nome, email, senha, perfil }) {
  if (!nome || !email || !senha || !perfil) throw new Error('Preencha todos os campos.');
  if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error('E-mail já cadastrado.');
  const strong = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;
  if (!strong.test(senha)) throw new Error('Senha fraca. Min. 10 c/ número e especial.');
  const senhaHash = await sha256(senha);
  const user = { id: crypto.randomUUID(), nome, email, senhaHash, perfil };
  usuarios.push(user);
  persistAll();
  return user;
}

async function login({ email, senha }) {
  const user = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('Credenciais inválidas.');
  const hash = await sha256(senha);
  if (hash !== user.senhaHash) throw new Error('Credenciais inválidas.');
  session.userEmail = user.email;
  touchSession();
  persistAll();
  return user;
}

function logout() {
  session = { userEmail: null, lastActivity: 0 };
  persistAll();
  renderAuthUI();
}

async function updateProfile({ nome, novaSenha }) {
  const user = currentUser();
  if (!user) throw new Error('Não autenticado.');
  user.nome = nome || user.nome;
  if (novaSenha) {
    const strong = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;
    if (!strong.test(novaSenha)) throw new Error('Senha fraca.');
    user.senhaHash = await sha256(novaSenha);
  }
  persistAll();
  return user;
}

function deleteCurrentUser() {
  const user = currentUser();
  if (!user) throw new Error('Não autenticado.');
  usuarios = usuarios.filter(u => u.id !== user.id);
  logout();
  persistAll();
}

// ------------------------------ Products ------------------------------
const PAGE_SIZE = 8;
let state = { query: '', category: '', sortBy: 'price_asc', page: 1 };

function categoriesFromProducts() {
  return Array.from(new Set(produtos.map(p => p.categoria))).sort();
}

function sortProducts(list, sortBy) {
  const arr = [...list];
  const map = {
    price_asc: (a,b) => a.preco - b.preco,
    price_desc: (a,b) => b.preco - a.preco,
    stock_desc: (a,b) => b.estoque - a.estoque,
    stock_asc: (a,b) => a.estoque - b.estoque,
  };
  return arr.sort(map[sortBy] || map.price_asc);
}

function filterProducts() {
  let list = produtos.filter(p => p.ativo);
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter(p => p.nome.toLowerCase().includes(q));
  }
  if (state.category) list = list.filter(p => p.categoria === state.category);
  return sortProducts(list, state.sortBy);
}

function renderCategories() {
  const sel = document.getElementById('filterCategory');
  sel.innerHTML = '<option value="">Todas</option>' + categoriesFromProducts().map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderProductsGrid() {
  const grid = document.getElementById('productGrid');
  const list = filterProducts();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);
  grid.innerHTML = pageItems.map(p => `
    <div class="card">
      <img src="${p.imagem}" alt="${p.nome}" />
      <div class="pad">
        <div>${p.nome}</div>
        <div class="muted">${p.categoria}</div>
        <div class="row"><span class="price">${formatCurrency(p.preco)}</span><span class="stock">Estoque: ${p.estoque}</span></div>
        <div class="row">
          <button class="btn btn-accent" data-add="${p.id}">Adicionar</button>
          <button class="btn btn-light" data-detail="${p.id}">Detalhes</button>
        </div>
      </div>
    </div>
  `).join('');

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const el = document.getElementById('pagination');
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  el.innerHTML = pages.map(p => `<button class="${p===state.page?'active':''}" data-page="${p}">${p}</button>`).join('');
}

function openProductModal(productId) {
  const p = produtos.find(x => x.id === productId);
  if (!p) return;
  document.getElementById('modalProductTitle').textContent = p.nome;
  document.getElementById('modalProductImg').src = p.imagem;
  document.getElementById('modalProductDesc').innerHTML = `<div style="color: #6b7a90; margin-bottom: 8px;">${p.categoria}</div>${p.descricao}`;
  document.getElementById('modalProductPrice').textContent = formatCurrency(p.preco);
  document.getElementById('modalProductStock').textContent = `Estoque: ${p.estoque}`;
  document.getElementById('modalQty').value = 1;
  document.getElementById('modalAddToCart').setAttribute('data-product', p.id);
  openModal('modalProduct');
}

// ------------------------------ Cart & Orders ------------------------------
function addToCart(productId, qty = 1) {
  const product = produtos.find(p => p.id === productId && p.ativo);
  if (!product) return showToast('Produto indisponível.', 'error');
  qty = Math.max(1, parseInt(qty, 10) || 1);
  const item = cart.find(i => i.productId === productId);
  if (item) item.qty += qty; else cart.push({ productId, qty });
  persistAll();
  renderCartCount();
  showToast('Adicionado ao carrinho', 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.productId !== productId);
  persistAll();
  renderCart();
  renderCartCount();
}

function updateCartQty(productId, qty) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  item.qty = Math.max(1, parseInt(qty, 10) || 1);
  persistAll();
  renderCart();
  renderCartCount();
}

function cartTotals() {
  let subtotal = 0;
  for (const item of cart) {
    const p = produtos.find(x => x.id === item.productId);
    if (p) subtotal += p.preco * item.qty;
  }
  return { subtotal };
}

function renderCartCount() {
  document.getElementById('cartCount').textContent = String(cart.reduce((a,i)=>a+i.qty,0));
}

function renderCart() {
  const itemsEl = document.getElementById('cartItems');
  if (!itemsEl) return;
  if (cart.length === 0) itemsEl.innerHTML = '<div class="muted">Seu carrinho está vazio</div>';
  else itemsEl.innerHTML = cart.map(i => {
    const p = produtos.find(x => x.id === i.productId);
    if (!p) return '';
    const subtotal = p.preco * i.qty;
    return `
      <div class="cart-item">
        <div>${p.nome}</div>
        <input type="number" min="1" value="${i.qty}" data-qty="${p.id}" />
        <div>${formatCurrency(subtotal)}</div>
        <button class="icon-btn" data-del="${p.id}">🗑️</button>
      </div>
    `;
  }).join('');

  const { subtotal } = cartTotals();
  document.getElementById('cartTotal').textContent = formatCurrency(subtotal);
}

function recomputeCheckout() {
  const { subtotal } = cartTotals();
  const tipo = document.getElementById('freteTipo').value;
  const frete = tipo === 'fixo' ? 19.9 : Math.min(39.9, Math.max(9.9, subtotal * 0.03));
  document.getElementById('ckSubtotal').textContent = formatCurrency(subtotal);
  document.getElementById('ckFrete').textContent = formatCurrency(frete);
  document.getElementById('ckTotal').textContent = formatCurrency(subtotal + frete);
}

function openCheckout() {
  if (!currentUser() || currentUser().perfil !== 'cliente') {
    showToast('Entre como cliente para finalizar.', 'error');
    return;
  }
  if (cart.length === 0) { showToast('Carrinho vazio.', 'error'); return; }
  openModal('modalCheckout');
  recomputeCheckout();
  updatePaymentVisibility();
  if (document.getElementById('pagTipo').value === 'pix') generateFakePix();
}

function updatePaymentVisibility() {
  const tipo = document.getElementById('pagTipo').value;
  document.getElementById('pagCartao').hidden = tipo !== 'cartao';
  document.getElementById('pagPix').hidden = tipo !== 'pix';
}

function validateCardForm() {
  const num = document.getElementById('cardNumber').value.replace(/\s+/g, '');
  const exp = document.getElementById('cardExpiry').value;
  const cvv = document.getElementById('cardCvv').value;
  const luhn = (s) => { let sum=0, dbl=false; for (let i=s.length-1;i>=0;i--){ let d=+s[i]; if(dbl){ d*=2; if(d>9)d-=9;} sum+=d; dbl=!dbl;} return sum%10===0; };
  const expOk = /^(0[1-9]|1[0-2])\/(\d{2})$/.test(exp);
  const cvvOk = /^\d{3,4}$/.test(cvv);
  return /^\d{13,19}$/.test(num) && luhn(num) && expOk && cvvOk;
}

function generateFakePix() {
  const code = `00020126360014BR.GOV.BCB.PIX0114+5599999999995204000053039865406${(Math.random()*100+10).toFixed(2)}5802BR5909E2E Store6009SAO PAULO`;
  document.getElementById('pixCode').textContent = code;
  const qr = document.getElementById('pixQr');
  qr.textContent = 'PIX';
}

function createOrder({ endereco, freteTipo, pagamentoTipo }) {
  const user = currentUser();
  const itens = cart.map(i => ({ productId: i.productId, qty: i.qty, price: produtos.find(p=>p.id===i.productId)?.preco || 0 }));
  const total = itens.reduce((a,i)=>a + i.qty * i.price, 0);
  const frete = freteTipo === 'fixo' ? 19.9 : Math.min(39.9, Math.max(9.9, total * 0.03));
  const pedido = {
    id: crypto.randomUUID(), userId: user.id, itens, endereco, freteTipo, pagamentoTipo,
    total: total + frete, status: 'Aguardando pagamento', criadoEm: Date.now(), avaliacao: null
  };
  pedidos.push(pedido);
  persistAll();
  return pedido;
}

function markOrderPaid(orderId) {
  const pedido = pedidos.find(p => p.id === orderId);
  if (!pedido) return;
  pedido.status = 'Pago';
  persistAll();
}

// ------------------------------ Seller Stock ------------------------------
let currentStockProductId = null;

function openStockModal(productId) {
  const user = currentUser();
  if (!user || (user.perfil !== 'vendedor' && user.perfil !== 'admin')) { showToast('Acesso negado.', 'error'); return; }
  const product = produtos.find(p => p.id === productId);
  if (!product || !product.ativo) { showToast('Produto inativo.', 'error'); return; }
  
  currentStockProductId = productId;
  document.getElementById('stockProductName').value = product.nome;
  document.getElementById('stockCurrent').value = product.estoque;
  document.getElementById('stockQty').value = '';
  openModal('modalStock');
}

async function applyStockChange() {
  if (!currentStockProductId) return;
  const product = produtos.find(p => p.id === currentStockProductId);
  if (!product) return;
  
  const qty = parseInt(document.getElementById('stockQty').value, 10);
  if (!Number.isFinite(qty) || qty <= 0 || qty % 10 !== 0) { 
    showToast('Valor inválido. Use múltiplos de 10 positivos.', 'error'); 
    return; 
  }
  
  const novo = product.estoque + qty;
  if (novo > 10000) { showToast('Estoque excede o limite máximo.', 'error'); return; }
  
  const ok = await confirmDialog(`Confirmar adição de ${qty} unidades ao estoque de "${product.nome}"?`);
  if (!ok) return;
  
  product.estoque = novo;
  persistAll();
  renderProductsGrid();
  renderSellerProducts();
  closeModal('modalStock');
  showToast('Estoque atualizado.', 'success');
}

function renderSellerProducts() {
  const wrap = document.getElementById('sellerProducts');
  if (!wrap) return;
  wrap.innerHTML = produtos.map(p => `
    <div class="card">
      <img src="${p.imagem}" alt="${p.nome}" />
      <div class="pad">
        <div>${p.nome}</div>
        <div class="row"><span class="price">${formatCurrency(p.preco)}</span><span class="stock">${p.ativo?'Ativo':'Inativo'} · ${p.estoque}</span></div>
        <button class="btn btn-primary" data-stock="${p.id}">Adicionar estoque</button>
      </div>
    </div>
  `).join('');
}

// ------------------------------ Suppliers (Admin) ------------------------------
function renderSuppliers() {
  const list = document.getElementById('supplierList');
  if (!list) return;
  list.innerHTML = fornecedores.map(f => `
    <div class="list-item">
      <div>
        <div><strong>${f.nomeLoja}</strong> · ${f.cnpj}</div>
        <div class="muted">${f.contato}</div>
      </div>
      <div class="row gap">
        <button class="btn btn-light" data-edit-sup="${f.id}">Editar</button>
        <button class="btn btn-outline" data-del-sup="${f.id}">Excluir</button>
      </div>
    </div>
  `).join('');
}

async function upsertSupplier(existingId = null) {
  const nomeLoja = prompt('Nome da loja:'); if (nomeLoja === null || nomeLoja.trim() === '') return;
  const cnpj = prompt('CNPJ:'); if (cnpj === null || cnpj.trim() === '') return;
  const contato = prompt('Contato (e-mail/telefone):'); if (contato === null || contato.trim() === '') return;
  if (existingId) {
    const f = fornecedores.find(x => x.id === existingId);
    if (!f) return;
    f.nomeLoja = nomeLoja; f.cnpj = cnpj; f.contato = contato;
  } else {
    fornecedores.push({ id: crypto.randomUUID(), nomeLoja, cnpj, contato });
  }
  persistAll();
  renderSuppliers();
  showToast('Fornecedor salvo.', 'success');
}

async function deleteSupplier(id) {
  const ok = await confirmDialog('Excluir este fornecedor?');
  if (!ok) return;
  // Unlink products
  produtos = produtos.map(p => (p.fornecedorId === id ? { ...p, fornecedorId: null } : p));
  fornecedores = fornecedores.filter(f => f.id !== id);
  persistAll();
  renderSuppliers();
  showToast('Fornecedor excluído.', 'success');
}

// ------------------------------ UI & Events ------------------------------
function renderAuthUI() {
  const user = currentUser();
  const loginBtn = document.getElementById('loginOpenBtn');
  const registerBtn = document.getElementById('registerOpenBtn');
  const menu = document.getElementById('userMenu');
  const hello = document.getElementById('helloUser');
  const roleNotice = document.getElementById('roleNotice');
  const sellerPanel = document.getElementById('sellerPanel');
  const adminPanel = document.getElementById('adminPanel');
  const perfilBtn = document.getElementById('btnPerfil');
  const logoutBtn = document.getElementById('btnLogout');

  if (user) {
    loginBtn.hidden = true; if (registerBtn) registerBtn.hidden = true; menu.hidden = false; menu.style.display = 'flex'; if (perfilBtn) perfilBtn.hidden = false; if (logoutBtn) logoutBtn.hidden = false; hello.textContent = `Olá, ${user.nome.split(' ')[0]} (${user.perfil})`;
    roleNotice.hidden = false;
    if (user.perfil === 'cliente') roleNotice.textContent = 'Você está na loja. Adicione produtos ao carrinho e finalize sua compra.';
    if (user.perfil === 'vendedor') roleNotice.textContent = 'Você está no painel do vendedor. Consulte produtos e gerencie estoque.';
    if (user.perfil === 'admin') roleNotice.textContent = 'Você está como admin. Gerencie fornecedores e consulte produtos.';
    sellerPanel.hidden = !(user.perfil === 'vendedor' || user.perfil === 'admin');
    adminPanel.hidden = user.perfil !== 'admin';
  } else {
    loginBtn.hidden = false; if (registerBtn) registerBtn.hidden = false; hello.textContent = ''; menu.hidden = true; menu.style.display = 'none'; if (perfilBtn) perfilBtn.hidden = true; if (logoutBtn) logoutBtn.hidden = true; roleNotice.hidden = true; sellerPanel.hidden = true; adminPanel.hidden = true;
  }

  renderSellerProducts();
  renderSuppliers();
}

function initSearchSuggest() {
  const input = document.getElementById('searchInput');
  const suggest = document.getElementById('searchSuggest');
  function update() {
    const q = input.value.trim().toLowerCase();
    if (!q) { suggest.hidden = true; return; }
    const list = produtos.filter(p => p.ativo && p.nome.toLowerCase().includes(q)).slice(0, 6);
    if (list.length === 0) { suggest.hidden = true; return; }
    suggest.innerHTML = list.map(p => `<div data-suggest="${p.id}">${p.nome}</div>`).join('');
    suggest.hidden = false;
  }
  input.addEventListener('input', update);
  input.addEventListener('blur', () => setTimeout(()=> suggest.hidden = true, 150));
}

function initUI() {
  renderCategories();
  renderProductsGrid();
  renderCartCount();
  renderCart();
  renderAuthUI();
  initSearchSuggest();
}

// Global Events
document.addEventListener('click', async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;

  // Close modals
  if (t.dataset.close) closeModal(t.dataset.close);

  // Open login/register
  if (t.id === 'loginOpenBtn') openModal('modalLogin');
  if (t.id === 'registerOpenBtn') { openModal('modalRegister'); }
  if (t.id === 'loginToRegisterLink') { e.preventDefault(); closeModal('modalLogin'); openModal('modalRegister'); }

  // Open cart
  if (t.id === 'cartOpenBtn') { renderCart(); openModal('modalCart'); }

  // Go home
  if (t.id === 'goHome') { state.page = 1; state.query=''; document.getElementById('searchInput').value=''; renderProductsGrid(); }

  // Add to cart
  if (t.dataset.add) addToCart(t.dataset.add, 1);

  // Details
  if (t.dataset.detail) openProductModal(t.dataset.detail);

  // Modal add to cart
  if (t.id === 'modalAddToCart') {
    const pid = t.getAttribute('data-product');
    const qty = parseInt(document.getElementById('modalQty').value, 10) || 1;
    addToCart(pid, qty);
  }

  // Pagination
  if (t.dataset.page) { state.page = parseInt(t.dataset.page, 10); renderProductsGrid(); }

  // Seller stock
  if (t.dataset.stock) openStockModal(t.dataset.stock);

  // Supplier actions
  if (t.id === 'btnNewSupplier') {
    const u = currentUser(); if (!u || u.perfil !== 'admin') { showToast('Acesso negado.', 'error'); return; }
    upsertSupplier();
  }
  if (t.dataset.editSup) { const u = currentUser(); if (!u || u.perfil !== 'admin') { showToast('Acesso negado.', 'error'); return; } upsertSupplier(t.dataset.editSup); }
  if (t.dataset.delSup) { const u = currentUser(); if (!u || u.perfil !== 'admin') { showToast('Acesso negado.', 'error'); return; } deleteSupplier(t.dataset.delSup); }

  // Cart delete
  if (t.dataset.del) removeFromCart(t.dataset.del);

  // Checkout
  if (t.id === 'btnCheckout') openCheckout();

  // Auth menu
  if (t.id === 'btnLogout') logout();
  if (t.id === 'btnPerfil') openModal('modalPerfil');
  if (t.id === 'btnDeleteUserMenu') {
    // Open profile modal and trigger delete action for convenience
    openModal('modalPerfil');
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  if (t.id === 'searchInput') { state.query = t.value.trim(); state.page = 1; renderProductsGrid(); }
  if (t.id === 'filterCategory') state.category = t.value;
  if (t.id === 'sortBy') state.sortBy = t.value;
  if (t.id === 'freteTipo') recomputeCheckout();
  if (t.dataset.qty) updateCartQty(t.dataset.qty, t.value);
  if (t.id === 'pagTipo') { updatePaymentVisibility(); if (t.value === 'pix') generateFakePix(); }
});

document.getElementById('applyFilters').addEventListener('click', () => { state.page = 1; renderProductsGrid(); });

// Search suggestion click
document.getElementById('searchSuggest').addEventListener('click', (e) => {
  const t = e.target; if (!(t instanceof HTMLElement)) return;
  if (t.dataset.suggest) { openProductModal(t.dataset.suggest); }
});

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginPassword').value;
  try {
    const user = await login({ email, senha });
    closeModal('modalLogin');
    renderAuthUI();
    if (user.perfil === 'cliente') { showToast('Bem-vindo à loja!', 'success'); }
    else if (user.perfil === 'vendedor') { showToast('Bem-vindo, vendedor!', 'success'); }
    else { showToast('Bem-vindo, admin!', 'success'); }
  } catch (err) { showToast(err.message || 'Erro ao entrar', 'error'); }
});

// Register form
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('regNome').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const senha = document.getElementById('regSenha').value;
  const perfil = document.getElementById('regPerfil').value;
  try { await registerUser({ nome, email, senha, perfil }); showToast('Conta criada. Faça login.', 'success'); closeModal('modalRegister'); openModal('modalLogin'); }
  catch (err) { showToast(err.message || 'Erro no cadastro', 'error'); }
});

// Perfil form
document.getElementById('perfilForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('perfilNome').value.trim();
  const novaSenha = document.getElementById('perfilSenha').value;
  try { await updateProfile({ nome, novaSenha }); showToast('Perfil atualizado.', 'success'); closeModal('modalPerfil'); renderAuthUI(); }
  catch (err) { showToast(err.message || 'Erro ao salvar perfil', 'error'); }
});

document.getElementById('perfilDeleteConfirm').addEventListener('input', () => {
  const v = document.getElementById('perfilDeleteConfirm').value.trim();
  document.getElementById('btnDeleteUser').disabled = v.toLowerCase() !== 'excluir';
});

document.getElementById('btnDeleteUser').addEventListener('click', async () => {
  if (document.getElementById('btnDeleteUser').disabled) return;
  const ok = await confirmDialog('Excluir sua conta? Esta ação é permanente.');
  if (!ok) return;
  try { deleteCurrentUser(); showToast('Conta excluída.', 'success'); closeModal('modalPerfil'); }
  catch (err) { showToast(err.message || 'Erro ao excluir conta', 'error'); }
});

// Checkout submit
document.getElementById('checkoutForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const endereco = document.getElementById('entregaEndereco').value.trim();
  const freteTipo = document.getElementById('freteTipo').value;
  const pagamentoTipo = document.getElementById('pagTipo').value;
  if (!endereco) { showToast('Informe o endereço.', 'error'); return; }
  if (pagamentoTipo === 'cartao' && !validateCardForm()) { showToast('Dados do cartão inválidos.', 'error'); return; }
  const pedido = createOrder({ endereco, freteTipo, pagamentoTipo });
  if (pagamentoTipo === 'cartao') { markOrderPaid(pedido.id); showToast('Pagamento aprovado!', 'success'); }
  else { showToast('Aguardando pagamento PIX...', 'info'); }
  // Deduzir estoque
  for (const item of cart) {
    const p = produtos.find(x => x.id === item.productId);
    if (p) p.estoque = Math.max(0, p.estoque - item.qty);
  }
  cart = [];
  persistAll();
  closeModal('modalCheckout');
  closeModal('modalCart');
  renderProductsGrid();
  renderCartCount();
});

// Profile modal populate on open
document.getElementById('btnPerfil').addEventListener('click', () => {
  const u = currentUser(); if (!u) return;
  document.getElementById('perfilNome').value = u.nome;
  document.getElementById('perfilEmail').value = u.email;
  document.getElementById('perfilSenha').value = '';
});

// Stock modal events
document.getElementById('stockCancel').addEventListener('click', () => closeModal('modalStock'));
document.getElementById('stockApply').addEventListener('click', () => applyStockChange());

// Modal backdrop click closes top-most modal (optional)
document.getElementById('modalBackdrop').addEventListener('click', () => {
  const open = Array.from(document.querySelectorAll('.modal')).find(m => !m.hidden);
  if (open) open.hidden = true;
  document.getElementById('modalBackdrop').hidden = true;
});

function hideAllModalsOnStart() {
  document.getElementById('modalBackdrop').hidden = true;
  ['modalLogin','modalRegister','modalPerfil','modalProduct','modalCart','modalCheckout','modalConfirm']
    .forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; });
}

// Apply initial state (avoid double init)
hideAllModalsOnStart();
if (Storage.get('seeded_v1', false)) {
  initUI();
  hideAllModalsOnStart();
  __booting = false;
} else {
  seedIfEmpty();
  // seedIfEmpty calls initUI asynchronously; ensure we finalize after a tick
  setTimeout(() => { hideAllModalsOnStart(); __booting = false; }, 0);
}


