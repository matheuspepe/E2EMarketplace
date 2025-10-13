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

// Replace native field validation tooltips with app toasts (Portuguese)
function validationMessageForInput(el) {
  if (!el) return 'Preencha o campo corretamente.';
  const v = el.validity;
  if (v.valueMissing) return 'Preencha este campo.';
  if (v.typeMismatch) {
    if (el.type === 'email') return 'Informe um e-mail válido.';
    return 'Valor com formato inválido.';
  }
  if (v.patternMismatch) return 'Formato inválido.';
  if (v.tooShort) return `Valor muito curto (mínimo ${el.getAttribute('minlength') || ''}).`;
  if (v.tooLong) return `Valor muito longo (máximo ${el.getAttribute('maxlength') || ''}).`;
  if (v.rangeUnderflow) return `Valor muito baixo (mínimo ${el.getAttribute('min') || ''}).`;
  if (v.rangeOverflow) return `Valor muito alto (máximo ${el.getAttribute('max') || ''}).`;
  if (v.stepMismatch) return 'Valor inválido.';
  return 'Preencha o campo corretamente.';
}

// Intercept invalid events (capture phase) and show toast instead of browser bubble
// Global inline error helpers (used by invalid handler and presentError)
function clearFieldError(el) {
  if (!el || !el.parentNode) return;
  const next = el.nextSibling;
  if (next && next.classList && next.classList.contains('field-error')) next.remove();
  el.classList.remove('input-invalid');
}

function showFieldError(el, message) {
  if (!el) return showToast(message, 'error');
  clearFieldError(el);
  const span = document.createElement('div');
  span.className = 'field-error';
  span.style.color = '#e74c3c';
  span.style.fontSize = '0.9em';
  span.style.marginTop = '4px';
  span.textContent = message;
  el.classList.add('input-invalid');
  if (el.parentNode) el.parentNode.insertBefore(span, el.nextSibling);
}

function showFormError(formEl, message) {
  if (!formEl) return showToast(message, 'error');
  let banner = formEl.querySelector('.form-error');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'form-error';
    banner.style.background = '#fee';
    banner.style.color = '#900';
    banner.style.padding = '8px';
    banner.style.marginBottom = '8px';
    formEl.insertBefore(banner, formEl.firstChild);
  }
  banner.textContent = message;
}

function clearFormError(formEl) {
  if (!formEl) return;
  const banner = formEl.querySelector('.form-error');
  if (banner) banner.remove();
}

document.addEventListener('invalid', (e) => {
  try {
    e.preventDefault();
    const el = e.target;
    const msg = validationMessageForInput(el);
    // prefer inline errors for login/register modals
    const loginModal = document.getElementById('modalLogin');
    const registerModal = document.getElementById('modalRegister');
    if (loginModal && !loginModal.hidden && el.form && el.form.id === 'loginForm') {
      showFieldError(el, msg);
      if (el && typeof el.focus === 'function') el.focus();
      return;
    }
    if (registerModal && !registerModal.hidden && el.form && el.form.id === 'registerForm') {
      showFieldError(el, msg);
      if (el && typeof el.focus === 'function') el.focus();
      return;
    }
    // fallback to toast
    showToast(msg, 'error');
    if (el && typeof el.focus === 'function') el.focus();
  } catch (err) {
    showToast('Dados inválidos.', 'error');
  }
}, true);

// Remove any visual invalid marker when user types
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLElement)) return;
  if (typeof el.checkValidity === 'function' && el.checkValidity()) {
    // clear any custom validity (if set elsewhere) and remove markers
    if (typeof el.setCustomValidity === 'function') el.setCustomValidity('');
    el.classList.remove('input-invalid');
  }
}, true);

// Clear inline errors for a whole form
function clearFormInlineErrors(formEl) {
  if (!formEl) return;
  const errors = formEl.querySelectorAll('.field-error');
  errors.forEach(e => e.remove());
  const banner = formEl.querySelector('.form-error'); if (banner) banner.remove();
  const inputs = formEl.querySelectorAll('.input-invalid'); inputs.forEach(i => i.classList.remove('input-invalid'));
}

// Clear inline errors when opening/closing modals
['modalLogin','modalRegister','modalPerfil'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('show', () => clearFormInlineErrors(el));
});

// Present user-friendly error messages in Portuguese
function presentError(err, fallback = 'Ocorreu um erro.') {
  const raw = err && err.message ? String(err.message) : '';
  const map = [
    { find: /failed to fetch/i, msg: 'Falha de rede. Verifique sua conexão.' },
    { find: /networkerror/i, msg: 'Erro de rede. Tente novamente.' },
    { find: /credentials/i, msg: 'Credenciais inválidas.' },
    { find: /email already/i, msg: 'E-mail já cadastrado.' },
    { find: /invalid/i, msg: 'Dados inválidos.' },
  ];
  for (const m of map) if (m.find.test(raw)) {
    const msg = m.msg;
    if (document.getElementById('modalLogin') && !document.getElementById('modalLogin').hidden) {
      clearFieldError(document.getElementById('loginEmail'));
      clearFieldError(document.getElementById('loginPassword'));
      if (/email/i.test(raw) || /email/i.test(msg)) return showFieldError(document.getElementById('loginEmail'), msg);
      if (/senha|password|credentials/i.test(raw) || /credenciais/i.test(msg)) return showFieldError(document.getElementById('loginPassword'), msg);
      return showFormError(document.getElementById('loginForm'), msg);
    }
    if (document.getElementById('modalRegister') && !document.getElementById('modalRegister').hidden) {
      clearFieldError(document.getElementById('regEmail'));
      clearFieldError(document.getElementById('regSenha'));
      if (/email/i.test(raw) || /email/i.test(msg)) return showFieldError(document.getElementById('regEmail'), msg);
      if (/senha|password/i.test(raw) || /senha/i.test(msg)) return showFieldError(document.getElementById('regSenha'), msg);
      return showFormError(document.getElementById('registerForm'), msg);
    }
    return showToast(m.msg, 'error');
  }
  const finalMsg = raw || fallback;
  // If a login/register modal is open, try to attach message to a reasonable field
  if (document.getElementById('modalLogin') && !document.getElementById('modalLogin').hidden) {
    clearFieldError(document.getElementById('loginEmail'));
    clearFieldError(document.getElementById('loginPassword'));
    if (/email/i.test(finalMsg)) return showFieldError(document.getElementById('loginEmail'), finalMsg);
    if (/senha|password|credenciais/i.test(finalMsg)) return showFieldError(document.getElementById('loginPassword'), finalMsg);
    return showFormError(document.getElementById('loginForm'), finalMsg);
  }
  if (document.getElementById('modalRegister') && !document.getElementById('modalRegister').hidden) {
    clearFieldError(document.getElementById('regEmail'));
    clearFieldError(document.getElementById('regSenha'));
    if (/email/i.test(finalMsg)) return showFieldError(document.getElementById('regEmail'), finalMsg);
    if (/senha|password/i.test(finalMsg)) return showFieldError(document.getElementById('regSenha'), finalMsg);
    return showFormError(document.getElementById('registerForm'), finalMsg);
  }
  // fallback: toast
  return showToast(finalMsg, 'error');
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

    // Products array - now populated from API only
    produtos = [];

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

// Função para validar nome completo
function validateFullName(name) {
  if (!name) return false;
  // Remove espaços extras e quebra em palavras
  const words = name.trim().split(/\s+/);
  // Precisa ter pelo menos 2 palavras (nome e sobrenome)
  if (words.length < 2) return false;
  // Cada palavra deve ter pelo menos 2 caracteres
  if (words.some(word => word.length < 2)) return false;
  // Regex que aceita letras (incluindo acentuadas) mas não números ou símbolos
  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ]+$/;
  // Cada palavra deve passar no regex
  if (!words.every(word => nameRegex.test(word))) return false;
  // Garante que tem pelo menos um nome e um sobrenome com mais de 2 caracteres cada
  const [firstName, lastName] = words;
  if (firstName.length < 2 || lastName.length < 2) return false;
  return true;
}

// Função para validar email com verificação de domínio
async function validateEmail(email) {
  if (!email) return false;
  
  // Verifica formato básico do email
  // - A extensão deve ter entre 2 e 6 caracteres
  // - Aceita múltiplos níveis de domínio (.com.br, .edu.br, etc)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}(\.[a-zA-Z]{2,6})?$/;
  if (!emailRegex.test(email)) return false;
  
  // Extrai o domínio do email
  const [, domain] = email.split('@');
  
  try {
    // Verifica se o domínio existe usando DNS lookup
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
    const data = await response.json();
    
    // Se o domínio tem registros MX, é provavelmente válido
    return data.Answer && data.Answer.length > 0;
  } catch (error) {
    // Em caso de erro na verificação, aceita o email se o formato básico estiver correto
    console.warn('Erro na verificação de domínio:', error);
    return emailRegex.test(email);
  }
  return emailRegex.test(email);
}

async function registerUser({ nome, email, senha, perfil }) {
  if (!nome || !email || !senha || !perfil) throw new Error('Preencha todos os campos.');
  if (!validateFullName(nome)) throw new Error('Nome inválido');
  const strong = /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;
  if (!strong.test(senha)) throw new Error('Senha deve ter no mínimo 10 caracteres, com número, letra e caractere especial.');
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
// External products API
const EXTERNAL_PRODUCTS_API = 'https://catalogo-products.pages.dev/api/products?page=1&pageSize=50';
let _apiProductsLoaded = false;
// Categories allowed by the external API
const ALLOWED_API_CATEGORIES = new Set(['moda','esportes','casa','eletronicos']);

// Mapeamento de imagens por categoria e palavras-chave
const PRODUCT_IMAGES = {
  'eletronicos': {
    default: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=500&q=80',
    subcategories: {
      'TV': {
        default: 'https://media.istockphoto.com/id/2164710012/pt/foto/new-smart-tv.jpg?s=612x612&w=0&k=20&c=q6vmEzC99LZP54tL7Vb8N_zEtmFjvibf7P30a2IHlZk=',
        keywords: {
          'lenovo': 'https://media.stockinthechannel.com/pic/88_Oh7AffUaposy0snCmOw.r.jpg'
        }
      },
      'smartphone': {
        default: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'iphone': 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=500&q=80',
          'samsung': 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?auto=format&fit=crop&w=500&q=80',
          'lenovo': 'https://www.droid-life.com/wp-content/uploads/2017/08/lenovo-k8-note2.jpg'
        }
      },
      'computadores': {
        default: 'https://images.unsplash.com/photo-1537498425277-c283d32ef9db?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'notebook acer': 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=500&q=80',
          'notebook xiaomi': 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fgazettereview.com%2Fwp-content%2Fuploads%2F2017%2F06%2FScreen-Shot-2017-06-05-at-1.52.35-PM.png&f=1&nofb=1&ipt=b5b785fead3bafd40f94ba57ce2d80b1b978c28e5191d56f0c4470c8615cd857',
          'macbook': 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=500&q=80',
          'desktop': 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=500&q=80',
          'monitor dell': 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.bhphotovideo.com%2Fimages%2Fimages2500x2500%2Fdell_u2417h_24_16_9_ips_1222870.jpg&f=1&nofb=1&ipt=96fb9694041d73b64d9b3c1c1e436b299ea5f16cb044a5e5d5e2ec58f1d4648d',
          'monitor sony': 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fimages.expertreviews.co.uk%2Fwp-content%2Fuploads%2Fimages%2Fdir_410%2Fer_photo_205444.png&f=1&nofb=1&ipt=177c2ef8f43fa40cc120255ec28aedc80fcaac212ac7518a3d6650a50a574db4',
          'monitor philips': 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.cultofmac.com%2Fwp-content%2Fuploads%2F2023%2F08%2FPhilips-Creator-Series-27E2F7901-1536x1021.jpg&f=1&nofb=1&ipt=b2699e2202ecfefb6151d51ef2348de85b1b579b2b66b5c47ff1eb599e1afe87',
          'monitor': 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=500&q=80',
        }
      },
      'audio': {
        default: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'fone': 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=500&q=80',
          'headphone': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80',
          'airpods': 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=500&q=80',
          'caixa som': 'https://images.unsplash.com/photo-1612444530582-fc66183b16f7?auto=format&fit=crop&w=500&q=80',
          'bluetooth': 'https://images.unsplash.com/photo-1578319439584-104c94d37305?auto=format&fit=crop&w=500&q=80',
          'wireless': 'https://images.unsplash.com/photo-1563627806991-23c83d95eb92?auto=format&fit=crop&w=500&q=80',
          'xiaomi': 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=500&q=80'
        }
      }
    }
  },
  'moda': {
    default: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=500&q=80',
    subcategories: {
      'roupas': {
        default: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'camiseta': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=80',
          'camisa': 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=500&q=80',
          'calca': 'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=500&q=80',
          'jeans': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=500&q=80',
          'vestido': 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?auto=format&fit=crop&w=500&q=80',
          'blusa': 'https://images.unsplash.com/photo-1551048632-24e444b48a3e?auto=format&fit=crop&w=500&q=80',
          'jaqueta': 'https://media.istockphoto.com/id/1366575695/pt/foto/blank-black-windbreaker-mock-up-front-and-back-view.jpg?s=612x612&w=0&k=20&c=bkLfDpu5EY2MT_D-m7xhhgAb-TZqN98PLnVJVJd9DOg='
        }
      },
      'calcados': {
        default: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'tenis': 'https://images.unsplash.com/photo-1597248881519-db089d3744a5?auto=format&fit=crop&w=500&q=80',
          'nike': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80',
          'adidas': 'https://images.unsplash.com/photo-1617689563472-c66767966822?auto=format&fit=crop&w=500&q=80',
          'sapato': 'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=500&q=80'
        }
      },
      'acessorios': {
        default: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'relogio': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=500&q=80',
          'apple watch': 'https://images.unsplash.com/photo-1551816230-ef5deaed4a26?auto=format&fit=crop&w=500&q=80',
          'bolsa': 'https://images.unsplash.com/photo-1601369447437-c1c7e604de70?auto=format&fit=crop&w=500&q=80',
          'colar': 'https://images.unsplash.com/photo-1615655114865-4cc1bda5901e?auto=format&fit=crop&w=500&q=80',
          'anel': 'https://images.unsplash.com/photo-1598560917807-1bae44bd2be8?auto=format&fit=crop&w=500&q=80'
        }
      }
    }
  },
  'esportes': {
    default: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=500&q=80',
    subcategories: {
      'fitness': {
        default: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'peso': 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?auto=format&fit=crop&w=500&q=80',
          'halter': 'https://images.unsplash.com/photo-1574108397771-54bac27968ea?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          'elastico': 'https://images.unsplash.com/photo-1620188467120-5042ed1eb5da?auto=format&fit=crop&w=500&q=80',
          'yoga': 'https://images.unsplash.com/photo-1588286840104-8957b019727f?auto=format&fit=crop&w=500&q=80',
          'skate': 'https://plus.unsplash.com/premium_photo-1673378963667-fac1c7be88ca?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        }
      },
      'esportes coletivos': {
        default: 'https://images.unsplash.com/photo-1577471489310-ba3c0811f89c?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'bola futebol': 'https://images.unsplash.com/photo-1552318965-6e6be7484ada?auto=format&fit=crop&w=500&q=80',
          'bola basquete': 'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=500&q=80',
          'bola volei': 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=500&q=80'
        }
      },
      'ciclismo': {
        default: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'bike': 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=500&q=80',
          'bicicleta': 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=500&q=80',
          'capacete': 'https://images.unsplash.com/photo-1606986632257-22e3c82a7c8a?auto=format&fit=crop&w=500&q=80',
          'mountain bike': 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=500&q=80'
        }
      }
    }
  },
  'casa': {
    default: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=500&q=80',
    subcategories: {
      'moveis': {
        default: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'sofa': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80',
          'mesa jantar': 'https://images.unsplash.com/photo-1615066390804-d1d0562f1df5?auto=format&fit=crop&w=500&q=80',
          'mesa centro': 'https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=500&q=80',
          'cadeira': 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=500&q=80',
          'poltrona': 'https://images.unsplash.com/photo-1619472351888-f106a150d965?auto=format&fit=crop&w=500&q=80',
          'guarda roupa': 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=500&q=80'
        }
      },
      'cozinha': {
        default: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'panela': 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=500&q=80',
          'liquidificador': 'https://plus.unsplash.com/premium_photo-1681826671576-8d612accc77a?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          'philco': 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=500&q=80',
          'air fryer': 'https://media.istockphoto.com/id/1201141649/photo/airfryer-isolated.jpg?s=612x612&w=0&k=20&c=ekL_tqETdNKm5oV1U_Q5h3fjXQXWWt7XCFWYrf4HRxs=',
          'airfryer': 'https://media.istockphoto.com/id/1201141649/photo/airfryer-isolated.jpg?s=612x612&w=0&k=20&c=ekL_tqETdNKm5oV1U_Q5h3fjXQXWWt7XCFWYrf4HRxs=',
          'mixer': 'https://images.unsplash.com/photo-1612181346599-a6bffc4e9915?auto=format&fit=crop&w=500&q=80',
          'cafeteira': 'https://market-resized.envatousercontent.com/photodune.net/EVA/TRX/b7/90/3b/ca/8d/v1_E10/E106DWTL.jpg?auto=format&q=94&mark=https%3A%2F%2Fassets.market-storefront.envato-static.com%2Fwatermarks%2Fphoto-260724.png&opacity=0.2&cf_fit=cover&w=590&s=74772d3c435d8cd6c00941deb7d79c99d97f6a0ba04a5d08c8238056d822806d'
        }
      },
      'decoracao': {
        default: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=500&q=80',
        keywords: {
          'luminaria': 'https://images.unsplash.com/photo-1573148164257-4f4b5873b075?auto=format&fit=crop&w=500&q=80',
          'tapete': 'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=500&q=80',
          'cortina': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=500&q=80',
          'almofada': 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=500&q=80'
        }
      },
        'eletrônicos': {
        default: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Flistastops.com.br%2Fwp-content%2Fuploads%2F2023%2F07%2F3-eletrodomesticos-praticos-para-ter-em-casa-1-jpg.webp&f=1&nofb=1&ipt=939f6dcd9deaa37ead3f8fe93562709e0fa9b940ebeec9d0d0b2b113ead22e8c',
        keywords: {
          'aspirador robô': 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.shutterstock.com%2Fimage-photo%2Ffloor-washing-robot-interior-600nw-1514321564.jpg&f=1&nofb=1&ipt=516ecf1a1c23c63c3aff0e91da432b43c0eba8337e3c52995859b3ac74fa65e4'
        }
      }
    }
  }
};

// Função para encontrar a melhor imagem para um produto
function findProductImage(product) {
  const category = normalizeCategory(product.categoria);
  const categoryImages = PRODUCT_IMAGES[category];
  
  if (!categoryImages) return PRODUCT_IMAGES['eletronicos'].default; // Fallback para categoria padrão
  
  const nome = product.nome.toLowerCase();
  // Remove acentos para melhor correspondência
  const nomeNormalized = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Helper: find a matching subcategory key from aliases (keeps original key casing)
  const getSubcatKeyByAliases = (aliases = []) => {
    if (!categoryImages.subcategories) return null;
    const keys = Object.keys(categoryImages.subcategories);
    const norm = s => String(s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
    for (const a of aliases) {
      const aNorm = norm(a);
      for (const k of keys) {
        const kNorm = norm(k);
        if (kNorm === aNorm || kNorm.includes(aNorm) || aNorm.includes(kNorm)) return k;
      }
    }
    return null;
  };

  // Prioridade especial: para eletrônicos, se o nome indicar 'smartphone'/'celular'/'phone',
  // force a imagem a partir da subcategoria 'smartphone' quando disponível.
  if (category === 'eletronicos') {
    if (/smartphone|smart phone|smartfone|celular|phone|mobile/.test(nomeNormalized)) {
      const phoneKey = getSubcatKeyByAliases(['smartphone','smartphones','celular','celulares','phone','mobile']);
      if (phoneKey) {
        const sub = categoryImages.subcategories[phoneKey];
        if (sub) {
          // Try brand-specific keyword image first (e.g., 'lenovo' inside sub.keywords)
          if (sub.keywords) {
            for (const [kw, img] of Object.entries(sub.keywords)) {
              const kNorm = String(kw || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '');
              if (!kNorm) continue;
              if (nomeNormalized.includes(kNorm) || nomeNormalized.includes(kNorm.replace(/\s+/g, ''))) return img;
            }
          }
          // Fallback to subcategory default image
          if (sub.default) return sub.default;
        }
      }
    }
  }
  
  // Função auxiliar para verificar correspondência de palavra-chave
  const matchesKeyword = (keyword, text) => {
    const keywordNorm = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Verifica variações comuns (com/sem espaços, plural/singular)
    const variations = [
      keywordNorm,
      keywordNorm.replace(/\s+/g, ''),
      keywordNorm + 's',
      keywordNorm.replace(/s$/, '')
    ];
    return variations.some(v => text.includes(v));
  };
  
  // Procura nas subcategorias
  for (const [subcat, subcatData] of Object.entries(categoryImages.subcategories)) {
    // Primeiro tenta encontrar palavras-chave específicas dentro da subcategoria
    for (const [keyword, image] of Object.entries(subcatData.keywords)) {
      if (matchesKeyword(keyword, nomeNormalized)) {
        return image;
      }
    }
    
    // Se o nome do produto contém o nome da subcategoria, usa a imagem padrão da subcategoria
    if (matchesKeyword(subcat, nomeNormalized) || 
        Object.keys(subcatData.keywords).some(k => matchesKeyword(k, nomeNormalized))) {
      return subcatData.default;
    }
  }
  
  // Se não encontrou nada específico, procura por palavras parciais nas keywords
  for (const subcatData of Object.values(categoryImages.subcategories)) {
    for (const [keyword, image] of Object.entries(subcatData.keywords)) {
      // Verifica se qualquer parte do nome corresponde à palavra-chave
      if (nomeNormalized.split(/\s+/).some(word => matchesKeyword(keyword, word))) {
        return image;
      }
    }
  }
  
  // Se ainda não encontrou nada, usa a imagem padrão da categoria
  return categoryImages.default;
}

// Helper to normalize category strings (remove accents, lowercase)
function normalizeCategory(s) {
  if (!s) return '';
  return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

// Display labels for known categories
const CATEGORY_LABELS = {
  'eletronicos': 'Eletrônicos',
  'moda': 'Moda',
  'esportes': 'Esportes',
  'casa': 'Casa'
};

function categoriesFromProducts() {
  // Return only the categories allowed by the external API (fixed list)
  return Array.from(ALLOWED_API_CATEGORIES).sort();
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
  if (state.category) {
  const sel = normalizeCategory(state.category);
  list = list.filter(p => normalizeCategory(p.categoria) === sel);
  }
  return sortProducts(list, state.sortBy);
}

function renderCategories() {
  const sel = document.getElementById('filterCategory');
  const cats = categoriesFromProducts();
  sel.innerHTML = '<option value="">Todas</option>' + cats.map(c => {
    const label = CATEGORY_LABELS[c] || (c.charAt(0).toUpperCase() + c.slice(1));
    return `<option value="${c}">${label}</option>`;
  }).join('');
}

async function renderProductsGrid() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  // If not loaded from API yet, fetch and map into internal `produtos` array
  if (!_apiProductsLoaded) {
    grid.innerHTML = '<div class="muted">Carregando produtos da API...</div>';
    try {
      const resp = await fetch(EXTERNAL_PRODUCTS_API, { headers: { accept: '*/*' } });
      if (!resp.ok) throw new Error(`API retornou ${resp.status}`);
      const data = await resp.json();
      if (!Array.isArray(data.products)) throw new Error('Resposta da API sem campo products');

      // Mapear formato da API para o formato interno usado pela aplicação
      produtos = data.products.map(p => {
        const rawCat = normalizeCategory(p.category || p.categoria || '');
        const displayCat = CATEGORY_LABELS[rawCat] || (rawCat ? (rawCat.charAt(0).toUpperCase() + rawCat.slice(1)) : '');
        // Calcular preços e desconto
        const price = p.price || {};
        const precoOriginal = price.original || 0;
        const precoFinal = price.final ?? precoOriginal;
        const descontoPercent = price.discount_percent || (precoOriginal && precoFinal < precoOriginal ? 
          Math.round((1 - precoFinal/precoOriginal) * 100) : 0);
        
        return {
          id: p.id,
          nome: p.title || p.name || (`Produto ${p.id}`),
          categoria: displayCat,
          preco: precoFinal,
          precoOriginal: precoOriginal,
          descontoPercent: descontoPercent,
          estoque: (p.stock && (p.stock.quantity ?? p.stock.qtd)) || 0,
          descricao: p.description || p.descricao || '',
          imagem: findProductImage({ nome: p.title || p.name || `Produto ${p.id}`, categoria: displayCat }),
          ativo: true,
          fornecedorId: null,
        };
      });

      _apiProductsLoaded = true;
      // Do not persist to localStorage to avoid overwriting seeded data
    } catch (err) {
      grid.innerHTML = `<div class="muted">Erro ao carregar produtos da API: ${err.message}</div>`;
      return;
    }
  }

  // Now render using existing local filtering/pagination logic
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
        <div class="row">
          ${p.descontoPercent > 0 ? `
            <div class="price-info">
              <span class="original-price">${formatCurrency(p.precoOriginal)}</span>
              <span class="discount-tag">-${p.descontoPercent}%</span>
              <span class="price">${formatCurrency(p.preco)}</span>
            </div>
          ` : `
            <span class="price">${formatCurrency(p.preco)}</span>
          `}
          <span class="stock">Estoque: ${p.estoque}</span>
        </div>
        <div class="row">
          <button class="btn btn-accent" data-add="${p.id}">Adicionar</button>
          <button class="btn btn-dark" data-detail="${p.id}">Detalhes</button>
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

// Validação em tempo real para os campos do formulário de login
function setupLoginFormValidation() {
  const emailInput = document.getElementById('loginEmail');
  const senhaInput = document.getElementById('loginPassword');
  
  // Validação do e-mail em tempo real
  emailInput.addEventListener('input', () => {
    const email = emailInput.value.trim();
    clearFieldError(emailInput);
    if (email && !validateEmail(email)) {
      showFieldError(emailInput, 'E-mail inválido. Use um formato válido (exemplo@dominio.com)');
    }
  });

  // Validação da senha em tempo real
  senhaInput.addEventListener('input', () => {
    clearFieldError(senhaInput);
    if (senhaInput.value.length === 0) {
      showFieldError(senhaInput, 'A senha é obrigatória');
    }
  });
}

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const senhaInput = document.getElementById('loginPassword');
  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  // Limpa erros anteriores
  clearFieldError(emailInput);
  clearFieldError(senhaInput);

  // Validações antes de tentar login
  if (!validateEmail(email)) {
    showFieldError(emailInput, 'E-mail inválido. Use um formato válido (exemplo@dominio.com)');
    return;
  }

  if (!senha) {
    showFieldError(senhaInput, 'A senha é obrigatória');
    return;
  }

  try {
    const user = await login({ email, senha });
    closeModal('modalLogin');
    renderAuthUI();
    if (user.perfil === 'cliente') { showToast('Bem-vindo à loja!', 'success'); }
    else if (user.perfil === 'vendedor') { showToast('Bem-vindo, vendedor!', 'success'); }
    else { showToast('Bem-vindo, admin!', 'success'); }
  } catch (err) { 
    showFieldError(senhaInput, 'E-mail ou senha incorretos');
  }
});

// Validação em tempo real para os campos do formulário de registro
function setupRegisterFormValidation() {
  const nomeInput = document.getElementById('regNome');
  const emailInput = document.getElementById('regEmail');
  const senhaInput = document.getElementById('regSenha');
  
  // Validação do nome em tempo real
  nomeInput.addEventListener('input', () => {
    const nome = nomeInput.value.trim();
    clearFieldError(nomeInput);
    if (nome && !validateFullName(nome)) {
      showFieldError(nomeInput, 'Nome inválido. Digite nome e sobrenome, sem números ou caracteres especiais.');
    }
  });

  // Validação do e-mail em tempo real
  emailInput.addEventListener('input', async () => {
    const email = emailInput.value.trim();
    clearFieldError(emailInput);
    if (email) {
      const isValidEmail = await validateEmail(email);
      if (!isValidEmail) {
        showFieldError(emailInput, 'E-mail inválido. Use um domínio válido existente.');
      } else if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        showFieldError(emailInput, 'Este e-mail já está cadastrado.');
      }
    }
  });

  // Validação da senha em tempo real
  senhaInput.addEventListener('input', () => {
    const senha = senhaInput.value;
    clearFieldError(senhaInput);
    if (senha) {
      const strong = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;
      if (!strong.test(senha)) {
        showFieldError(senhaInput, 'Senha fraca. Use ao menos 10 caracteres com números e caracteres especiais.');
      }
    }
  });
}

// Register form
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nomeInput = document.getElementById('regNome');
  const emailInput = document.getElementById('regEmail');
  const senhaInput = document.getElementById('regSenha');
  const nome = nomeInput.value.trim();
  const email = emailInput.value.trim();
  const senha = senhaInput.value;
  const perfil = document.getElementById('regPerfil').value;
  
  // Limpa todos os erros anteriores
  clearFieldError(nomeInput);
  clearFieldError(emailInput);
  clearFieldError(senhaInput);
  
  try {
    // Validação do nome antes de tentar registrar
    if (!validateFullName(nome)) {
      showFieldError(nomeInput, 'Nome inválido. Digite nome e sobrenome, sem números ou caracteres especiais.');
      return;
    }
    
    // Validação completa do e-mail (formato e domínio)
    const isValidEmail = await validateEmail(email);
    if (!isValidEmail) {
      showFieldError(emailInput, 'E-mail inválido. Use um domínio válido existente.');
      return;
    }
    
    // Verifica se o e-mail já está cadastrado antes de tentar registrar
    if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      showFieldError(emailInput, 'Este e-mail já está cadastrado.');
      return;
    }
    
    await registerUser({ nome, email, senha, perfil });
    showToast('Conta criada. Faça login.', 'success');
    closeModal('modalRegister');
    openModal('modalLogin');
  } catch (err) {
    const errorMessage = err.message;
    if (errorMessage === 'Nome inválido') {
      showFieldError(document.getElementById('regNome'), 'Nome inválido. Digite nome e sobrenome, sem números ou caracteres especiais.');
    } else if (errorMessage === 'E-mail já cadastrado') {
      showFieldError(document.getElementById('regEmail'), 'Este e-mail já está cadastrado.');
    } else {
      presentError(err, 'Erro no cadastro.');
    }
  }
});

// Perfil form
document.getElementById('perfilForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('perfilNome').value.trim();
  const novaSenha = document.getElementById('perfilSenha').value;
  try { await updateProfile({ nome, novaSenha }); showToast('Perfil atualizado.', 'success'); closeModal('modalPerfil'); renderAuthUI(); }
  catch (err) { presentError(err, 'Erro ao salvar perfil.'); }
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
  catch (err) { presentError(err, 'Erro ao excluir conta.'); }
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
  
  // Configura validações em tempo real para os formulários
  setupRegisterFormValidation();
  setupLoginFormValidation();
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