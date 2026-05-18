const STORAGE_KEY = "doceMariaDataV1";
const defaultData = { custos: [], ingredientes: [], fichas: [], vendas: [] };
const tabs = [
  { id: "dashboard", label: "📊 Dashboard" },
  { id: "custos", label: "💸 Custos e Taxas" },
  { id: "ingredientes", label: "🥛 Ingredientes" },
  { id: "fichas", label: "🧾 Ficha Técnica" },
  { id: "vendas", label: "🛍️ Venda" },
];

const state = loadData();
renderTabs();
showTab("dashboard");
renderAll();

function loadData() { try { return { ...defaultData, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return structuredClone(defaultData); } }
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function renderTabs() {
  const container = document.getElementById("tabs");
  container.innerHTML = tabs.map((t) => `<button class="tab-btn" data-tab="${t.id}">${t.label}</button>`).join("");
  container.addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (!b) return; showTab(b.dataset.tab); });
}
function showTab(id) {
  tabs.forEach((t) => {
    document.querySelector(`#${t.id}-panel`).classList.toggle("hidden", t.id !== id);
    document.querySelector(`[data-tab="${t.id}"]`)?.classList.toggle("active", t.id === id);
  });
}

function renderAll() { renderDashboard(); renderCustos(); renderIngredientes(); renderFichas(); renderVendas(); saveData(); }

function renderDashboard() {
  const p = document.getElementById("dashboard-panel");
  const fixos = state.custos.reduce((a, c) => a + Number(c.valor), 0);
  const custoFicha = state.fichas.reduce((a, f) => a + f.custo, 0);
  const lucroPrevisto = state.vendas.reduce((a, v) => a + (v.precoPraticado - v.custo), 0);
  p.innerHTML = `<h2>Dashboard</h2><div class="grid" id="cards"></div><h3>Visão rápida</h3>
  <ul><li>Total de ingredientes cadastrados: <b>${state.ingredientes.length}</b></li>
  <li>Produtos finais (fichas técnicas): <b>${state.fichas.length}</b></li>
  <li>Itens em venda: <b>${state.vendas.length}</b></li></ul>`;
  const cards = [
    ["Custos fixos", BRL(fixos), "Soma de custos e taxas da operação"],
    ["Custo acumulado das fichas", BRL(custoFicha), "Quanto custa produzir os itens cadastrados"],
    ["Lucro potencial", BRL(lucroPrevisto), "Preço praticado - custo dos produtos em venda"],
    ["Ticket médio sugerido", BRL(state.vendas.length ? state.vendas.reduce((a,v)=>a+v.precoSugerido,0)/state.vendas.length : 0), "Média dos preços sugeridos"]
  ];
  document.getElementById("cards").innerHTML = cards.map(([t,v,s])=>`<article class="card"><h3>${t}</h3><p class="value">${v}</p><small>${s}</small></article>`).join("");
}

function renderCustos() {
  const p = document.getElementById("custos-panel");
  p.innerHTML = `<h2>Custos e Taxas</h2><form id="f-custos"><input required name="descricao" placeholder="Descrição"/><input required min="0" step="0.01" name="valor" type="number" placeholder="Valor"/><button>Adicionar</button></form>
  <table><thead><tr><th>Descrição</th><th>Valor</th></tr></thead><tbody>${state.custos.map(c=>`<tr><td>${c.descricao}</td><td>${BRL(c.valor)}</td></tr>`).join("")}</tbody></table>`;
  p.querySelector("#f-custos").onsubmit = (e) => { e.preventDefault(); const fd=new FormData(e.target); state.custos.push({descricao:fd.get("descricao"), valor:Number(fd.get("valor"))}); renderAll(); e.target.reset(); };
}

function renderIngredientes() {
  const p = document.getElementById("ingredientes-panel");
  p.innerHTML = `<h2>Ingredientes</h2><form id="f-ing"><input required name="produto" placeholder="Produto"/><input required name="unidade" placeholder="Unidade (ml, g, kg...)"/><input required min="0.01" step="0.01" name="quantidade" type="number" placeholder="Qtd compra"/><input required min="0" step="0.01" name="valor" type="number" placeholder="Valor compra"/><button>Cadastrar</button></form>
  <table><thead><tr><th>Produto</th><th>Unidade</th><th>Qtd compra</th><th>Valor compra</th><th>Valor unitário</th></tr></thead><tbody>
  ${state.ingredientes.map(i=>`<tr><td>${i.produto}</td><td>${i.unidade}</td><td>${i.quantidade}</td><td>${BRL(i.valorCompra)}</td><td>${BRL(i.valorUnitario)}</td></tr>`).join("")}
  </tbody></table>`;
  p.querySelector("#f-ing").onsubmit = (e) => { e.preventDefault(); const fd=new FormData(e.target); const qtd=Number(fd.get("quantidade")); const val=Number(fd.get("valor")); state.ingredientes.push({produto:fd.get("produto"), unidade:fd.get("unidade"), quantidade:qtd, valorCompra:val, valorUnitario:val/qtd}); renderAll(); e.target.reset(); };
}

function renderFichas() {
  const p = document.getElementById("fichas-panel");
  const opts = state.ingredientes.map((i, idx)=>`<option value="${idx}">${i.produto} (${i.unidade})</option>`).join("");
  p.innerHTML = `<h2>Ficha Técnica</h2><form id="f-ficha"><input required name="nome" placeholder="Produto final"/><select required name="ingrediente">${opts}</select><input required type="number" step="0.01" min="0.01" name="uso" placeholder="Qtd utilizada"/><button>Adicionar ficha</button></form>
  <table><thead><tr><th>Produto final</th><th>Ingredientes</th><th>Custo</th></tr></thead><tbody>
  ${state.fichas.map(f=>`<tr><td>${f.nome}</td><td><div class="list-inline">${f.itens.map(i=>`<span class="pill">${i.produto}: ${i.uso}${i.unidade}</span>`).join("")}</div></td><td>${BRL(f.custo)}</td></tr>`).join("")}
  </tbody></table>`;
  p.querySelector("#f-ficha").onsubmit = (e) => { e.preventDefault(); if (!state.ingredientes.length) return alert("Cadastre ingredientes antes."); const fd=new FormData(e.target); const ing=state.ingredientes[Number(fd.get("ingrediente"))]; const uso=Number(fd.get("uso")); const item={produto:ing.produto, unidade:ing.unidade, uso, custo:uso*ing.valorUnitario}; state.fichas.push({nome:fd.get("nome"), itens:[item], custo:item.custo}); renderAll(); e.target.reset(); };
}

function renderVendas() {
  const p = document.getElementById("vendas-panel");
  const fichaOpts = state.fichas.map((f,idx)=>`<option value="${idx}">${f.nome}</option>`).join("");
  p.innerHTML = `<h2>Venda</h2><form id="f-venda"><select required name="ficha">${fichaOpts}</select><input required type="number" step="0.01" min="0" name="lucro" placeholder="Lucro desejado (%)"/><input required type="number" step="0.01" min="0" name="praticado" placeholder="Preço praticado"/><button>Lançar venda</button></form>
  <table><thead><tr><th>Produto</th><th>Preço sugerido</th><th>Praticado</th><th>Status</th><th>Lucro</th><th>Ficha</th></tr></thead><tbody>
  ${state.vendas.map(v=>`<tr><td>${v.produto}</td><td>${BRL(v.precoSugerido)}</td><td>${BRL(v.precoPraticado)}</td><td>${statusBadge(v.status)}</td><td>${BRL(v.precoPraticado-v.custo)}</td><td>${v.produto}</td></tr>`).join("")}
  </tbody></table>`;
  p.querySelector("#f-venda").onsubmit = (e) => { e.preventDefault(); if (!state.fichas.length) return alert("Cadastre ficha técnica antes."); const fd=new FormData(e.target); const f=state.fichas[Number(fd.get("ficha"))]; const margem=Number(fd.get("lucro"))/100; const sugerido=f.custo*(1+margem); const praticado=Number(fd.get("praticado")); const ratio=praticado/f.custo; const status=ratio<1.2?"margem curta":ratio<1.6?"ajustar":"alta margem"; state.vendas.push({produto:f.nome,custo:f.custo,lucroDesejado:margem,lucroDesejadoPct:Number(fd.get("lucro")),precoSugerido:sugerido,precoPraticado:praticado,status}); renderAll(); e.target.reset(); };
}

function statusBadge(status) {
  const cls = status === "alta margem" ? "high" : status === "ajustar" ? "warn" : "ok";
  return `<span class="badge ${cls}">${status}</span>`;
}
