const STORAGE_KEY = "doceMariaDataV2";
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

function loadData() {
  try {
    return { ...defaultData, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return structuredClone(defaultData);
  }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function renderTabs() {
  const container = document.getElementById("tabs");
  container.innerHTML = tabs.map((t) => `<button class="tab-btn" data-tab="${t.id}">${t.label}</button>`).join("");
  container.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    showTab(b.dataset.tab);
  });
}
function showTab(id) {
  tabs.forEach((t) => {
    document.querySelector(`#${t.id}-panel`).classList.toggle("hidden", t.id !== id);
    document.querySelector(`[data-tab="${t.id}"]`)?.classList.toggle("active", t.id === id);
  });
}

function renderAll() {
  renderDashboard();
  renderCustos();
  renderIngredientes();
  renderFichas();
  renderVendas();
  saveData();
}

function renderDashboard() {
  const p = document.getElementById("dashboard-panel");
  const fixos = state.custos.reduce((a, c) => a + Number(c.valor), 0);
  const custoFichas = state.fichas.reduce((a, f) => a + Number(f.custoTotal || 0), 0);
  const lucroTotal = state.vendas.reduce((a, v) => a + (Number(v.precoPraticado) - Number(v.custo)), 0);
  const margemMedia = state.vendas.length
    ? state.vendas.reduce((a, v) => a + Number(v.margemPct || 0), 0) / state.vendas.length
    : 0;

  p.innerHTML = `
    <h2>Dashboard</h2>
    <div class="grid">
      ${card("Custos fixos", BRL(fixos), "Soma dos custos e taxas")}
      ${card("Custo total das fichas", BRL(custoFichas), "Total de custo de produção")}
      ${card("Lucro total projetado", BRL(lucroTotal), "Soma do lucro dos itens vendidos")}
      ${card("Margem média", `${margemMedia.toFixed(1)}%`, "Média das margens praticadas")}
    </div>
    <h3>Resumo operacional</h3>
    <ul>
      <li>Custos cadastrados: <b>${state.custos.length}</b></li>
      <li>Ingredientes cadastrados: <b>${state.ingredientes.length}</b></li>
      <li>Fichas técnicas cadastradas: <b>${state.fichas.length}</b></li>
      <li>Produtos à venda cadastrados: <b>${state.vendas.length}</b></li>
    </ul>`;
}
function card(t, v, s) { return `<article class="card"><h3>${t}</h3><p class="value">${v}</p><small>${s}</small></article>`; }

function renderCustos() {
  const p = document.getElementById("custos-panel");
  p.innerHTML = `
    <h2>Cadastro de Custos e Taxas</h2>
    <form id="f-custos">
      <input required name="descricao" placeholder="Ex.: Aluguel" />
      <input required name="categoria" placeholder="Categoria (fixo/taxa/imposto)" />
      <input required type="number" min="0" step="0.01" name="valor" placeholder="Valor" />
      <button type="submit">Cadastrar custo</button>
    </form>
    <table>
      <thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Ações</th></tr></thead>
      <tbody>
      ${state.custos.map((c) => `<tr><td>${c.descricao}</td><td>${c.categoria}</td><td>${BRL(c.valor)}</td><td><button class="secondary" data-del-custo="${c.id}">Excluir</button></td></tr>`).join("") || `<tr><td colspan="4">Nenhum custo cadastrado.</td></tr>`}
      </tbody>
    </table>`;
  p.querySelector("#f-custos").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    state.custos.push({ id: uid(), descricao: fd.get("descricao"), categoria: fd.get("categoria"), valor: Number(fd.get("valor")) });
    renderAll();
    e.target.reset();
  };
  p.querySelectorAll("[data-del-custo]").forEach((b) => b.onclick = () => { state.custos = state.custos.filter((c) => c.id !== b.dataset.delCusto); renderAll(); });
}

function renderIngredientes() {
  const p = document.getElementById("ingredientes-panel");
  p.innerHTML = `
    <h2>Cadastro de Ingredientes</h2>
    <form id="f-ing">
      <input required name="produto" placeholder="Produto" />
      <input required name="unidade" placeholder="Unidade (ml, g, kg, un)" />
      <input required type="number" min="0.01" step="0.01" name="quantidade" placeholder="Quantidade da compra" />
      <input required type="number" min="0" step="0.01" name="valor" placeholder="Valor da compra" />
      <button type="submit">Cadastrar ingrediente</button>
    </form>
    <table>
      <thead><tr><th>Produto</th><th>Unid.</th><th>Qtd compra</th><th>Valor compra</th><th>Valor unitário</th><th>Ações</th></tr></thead>
      <tbody>
      ${state.ingredientes.map((i) => `<tr><td>${i.produto}</td><td>${i.unidade}</td><td>${i.quantidade}</td><td>${BRL(i.valorCompra)}</td><td>${BRL(i.valorUnitario)}</td><td><button class="secondary" data-del-ing="${i.id}">Excluir</button></td></tr>`).join("") || `<tr><td colspan="6">Nenhum ingrediente cadastrado.</td></tr>`}
      </tbody>
    </table>`;
  p.querySelector("#f-ing").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const quantidade = Number(fd.get("quantidade"));
    const valorCompra = Number(fd.get("valor"));
    state.ingredientes.push({ id: uid(), produto: fd.get("produto"), unidade: fd.get("unidade"), quantidade, valorCompra, valorUnitario: valorCompra / quantidade });
    renderAll();
    e.target.reset();
  };
  p.querySelectorAll("[data-del-ing]").forEach((b) => b.onclick = () => { state.ingredientes = state.ingredientes.filter((i) => i.id !== b.dataset.delIng); renderAll(); });
}

function renderFichas() {
  const p = document.getElementById("fichas-panel");
  const ingredientesOpts = state.ingredientes.map((i) => `<option value="${i.id}">${i.produto} (${i.unidade}) - ${BRL(i.valorUnitario)}/${i.unidade}</option>`).join("");
  p.innerHTML = `
    <h2>Cadastro de Ficha Técnica</h2>
    <form id="f-ficha-produto">
      <input required name="nome" placeholder="Produto final (ex.: Cupcake de baunilha)" />
      <button type="submit">Criar ficha</button>
    </form>
    <form id="f-ficha-item">
      <select name="fichaId" required>
        <option value="">Selecione a ficha</option>
        ${state.fichas.map((f) => `<option value="${f.id}">${f.nome}</option>`).join("")}
      </select>
      <select name="ingredienteId" required>
        <option value="">Selecione o ingrediente</option>
        ${ingredientesOpts}
      </select>
      <input required type="number" min="0.01" step="0.01" name="quantidadeUso" placeholder="Quantidade usada" />
      <button type="submit">Adicionar ingrediente na ficha</button>
    </form>
    <table>
      <thead><tr><th>Produto final</th><th>Ingredientes da ficha</th><th>Custo total</th><th>Ações</th></tr></thead>
      <tbody>
      ${state.fichas.map((f) => `<tr>
        <td>${f.nome}</td>
        <td>${f.itens.length ? `<div class="list-inline">${f.itens.map((i) => `<span class="pill">${i.produto} (${i.qtd}${i.unidade})</span>`).join("")}</div>` : "Sem itens"}</td>
        <td>${BRL(f.custoTotal)}</td>
        <td><button class="secondary" data-del-ficha="${f.id}">Excluir</button></td>
      </tr>`).join("") || `<tr><td colspan="4">Nenhuma ficha técnica cadastrada.</td></tr>`}
      </tbody>
    </table>`;

  p.querySelector("#f-ficha-produto").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    state.fichas.push({ id: uid(), nome: fd.get("nome"), itens: [], custoTotal: 0 });
    renderAll();
    e.target.reset();
  };

  p.querySelector("#f-ficha-item").onsubmit = (e) => {
    e.preventDefault();
    if (!state.ingredientes.length) return alert("Cadastre ingredientes antes de montar a ficha técnica.");
    if (!state.fichas.length) return alert("Crie uma ficha técnica antes de adicionar ingredientes.");
    const fd = new FormData(e.target);
    const ficha = state.fichas.find((f) => f.id === fd.get("fichaId"));
    const ingrediente = state.ingredientes.find((i) => i.id === fd.get("ingredienteId"));
    const qtd = Number(fd.get("quantidadeUso"));
    const custoItem = qtd * ingrediente.valorUnitario;
    ficha.itens.push({ ingredienteId: ingrediente.id, produto: ingrediente.produto, unidade: ingrediente.unidade, qtd, custo: custoItem });
    ficha.custoTotal = ficha.itens.reduce((acc, it) => acc + Number(it.custo), 0);
    renderAll();
    e.target.reset();
  };
  p.querySelectorAll("[data-del-ficha]").forEach((b) => b.onclick = () => { state.fichas = state.fichas.filter((f) => f.id !== b.dataset.delFicha); state.vendas = state.vendas.filter((v) => v.fichaId !== b.dataset.delFicha); renderAll(); });
}

function renderVendas() {
  const p = document.getElementById("vendas-panel");
  p.innerHTML = `
    <h2>Cadastro de Venda</h2>
    <form id="f-venda">
      <select required name="fichaId">
        <option value="">Selecione o produto final</option>
        ${state.fichas.map((f) => `<option value="${f.id}">${f.nome}</option>`).join("")}
      </select>
      <input required type="number" min="0" step="0.01" name="lucroDesejadoPct" placeholder="Lucro desejado (%)" />
      <input required type="number" min="0" step="0.01" name="precoPraticado" placeholder="Preço de venda praticado" />
      <button type="submit">Cadastrar venda</button>
    </form>
    <table>
      <thead><tr><th>Produto</th><th>Preço sugerido</th><th>Praticado</th><th>Status</th><th>Lucro</th><th>Ficha técnica</th><th>Ações</th></tr></thead>
      <tbody>
      ${state.vendas.map((v) => `<tr>
        <td>${v.produto}</td>
        <td>${BRL(v.precoSugerido)}</td>
        <td>${BRL(v.precoPraticado)}</td>
        <td>${statusBadge(v.status)}</td>
        <td>${BRL(v.lucro)}</td>
        <td><button class="secondary" data-open-ficha="${v.fichaId}">Acessar ficha</button></td>
        <td><button class="secondary" data-del-venda="${v.id}">Excluir</button></td>
      </tr>`).join("") || `<tr><td colspan="7">Nenhuma venda cadastrada.</td></tr>`}
      </tbody>
    </table>`;

  p.querySelector("#f-venda").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const ficha = state.fichas.find((f) => f.id === fd.get("fichaId"));
    if (!ficha) return alert("Selecione uma ficha válida.");
    const lucroDesejadoPct = Number(fd.get("lucroDesejadoPct"));
    const precoSugerido = ficha.custoTotal * (1 + lucroDesejadoPct / 100);
    const precoPraticado = Number(fd.get("precoPraticado"));
    const lucro = precoPraticado - ficha.custoTotal;
    const margemPct = ficha.custoTotal > 0 ? (lucro / ficha.custoTotal) * 100 : 0;
    const status = margemPct < 20 ? "margem curta" : margemPct < 50 ? "ajustar" : "alta margem";
    state.vendas.push({ id: uid(), fichaId: ficha.id, produto: ficha.nome, custo: ficha.custoTotal, lucroDesejadoPct, precoSugerido, precoPraticado, lucro, margemPct, status });
    renderAll();
    e.target.reset();
  };

  p.querySelectorAll("[data-del-venda]").forEach((b) => b.onclick = () => { state.vendas = state.vendas.filter((v) => v.id !== b.dataset.delVenda); renderAll(); });
  p.querySelectorAll("[data-open-ficha]").forEach((b) => b.onclick = () => { showTab("fichas"); const s = document.querySelector('#f-ficha-item select[name="fichaId"]'); if (s) s.value = b.dataset.openFicha; });
}

function statusBadge(status) {
  const cls = status === "alta margem" ? "high" : status === "ajustar" ? "warn" : "ok";
  return `<span class="badge ${cls}">${status}</span>`;
}
