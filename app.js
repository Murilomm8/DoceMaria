const STORAGE_KEY = "doceMariaDataV3";
const defaultData = { custos: [], ingredientes: [], fichas: [], vendas: [] };
const tabs = [
  { id: "dashboard", label: "📊 Dashboard" },
  { id: "custos", label: "💸 Custos e Taxas" },
  { id: "ingredientes", label: "🥛 Ingredientes" },
  { id: "fichas", label: "🧾 Ficha Técnica" },
  { id: "vendas", label: "🛍️ Venda" },
];
const uiState = { custosForm: false, ingredientesForm: false, fichasProdutoForm: false, fichasItemForm: false, vendasForm: false };

const state = loadData();
renderTabs();
showTab("dashboard");
renderAll();

function loadData() {
  try { return { ...defaultData, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
  catch { return structuredClone(defaultData); }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

function renderTabs() {
  const container = document.getElementById("tabs");
  container.innerHTML = tabs.map((t) => `<button class="tab-btn" data-tab="${t.id}">${t.label}</button>`).join("");
  container.addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b) showTab(b.dataset.tab); });
}
function showTab(id) {
  tabs.forEach((t) => {
    document.querySelector(`#${t.id}-panel`).classList.toggle("hidden", t.id !== id);
    document.querySelector(`[data-tab="${t.id}"]`)?.classList.toggle("active", t.id === id);
  });
}
function toggleForm(key) { uiState[key] = !uiState[key]; renderAll(); }

function renderAll() { renderDashboard(); renderCustos(); renderIngredientes(); renderFichas(); renderVendas(); saveData(); }

function renderDashboard() {
  const p = document.getElementById("dashboard-panel");
  const fixos = state.custos.reduce((a, c) => a + Number(c.valor), 0);
  const custoFichas = state.fichas.reduce((a, f) => a + Number(f.custoTotal || 0), 0);
  const receita = state.vendas.reduce((a, v) => a + Number(v.precoPraticado), 0);
  const lucroTotal = state.vendas.reduce((a, v) => a + Number(v.lucro || 0), 0);
  const margemMedia = state.vendas.length ? state.vendas.reduce((a, v) => a + Number(v.margemPct || 0), 0) / state.vendas.length : 0;
  const custosVsReceita = receita > 0 ? (fixos / receita) * 100 : 0;
  const lucroVsReceita = receita > 0 ? (lucroTotal / receita) * 100 : 0;

  p.innerHTML = `
    <h2>Dashboard Profissional</h2>
    <div class="grid">
      ${card("Receita total", BRL(receita), "Soma dos preços praticados")}
      ${card("Custos fixos", BRL(fixos), "Soma dos custos e taxas")}
      ${card("Lucro total", BRL(lucroTotal), "Resultado das vendas cadastradas")}
      ${card("Margem média", pct(margemMedia), "Margem média por produto")}
    </div>

    <h3>Gráficos e percentuais</h3>
    <div class="chart-box">
      ${progress("Custos fixos sobre receita", custosVsReceita, "warn")}
      ${progress("Lucro sobre receita", lucroVsReceita, "ok")}
      ${progress("Margem média dos produtos", margemMedia, "high")}
    </div>

    <h3>Resumo operacional</h3>
    <ul>
      <li>Custos cadastrados: <b>${state.custos.length}</b></li>
      <li>Ingredientes cadastrados: <b>${state.ingredientes.length}</b></li>
      <li>Fichas técnicas cadastradas: <b>${state.fichas.length}</b></li>
      <li>Produtos à venda cadastrados: <b>${state.vendas.length}</b></li>
      <li>Custo total das fichas: <b>${BRL(custoFichas)}</b></li>
    </ul>`;
}
function card(t, v, s) { return `<article class="card"><h3>${t}</h3><p class="value">${v}</p><small>${s}</small></article>`; }
function progress(label, value, tone) {
  const val = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="metric"><div class="metric-head"><span>${label}</span><b>${pct(val)}</b></div><div class="bar"><span class="fill ${tone}" style="width:${val}%"></span></div></div>`;
}

function renderCustos() {
  const p = document.getElementById("custos-panel");
  p.innerHTML = `<h2>Custos e Taxas</h2><button class="toggle-btn" id="toggle-custos">${uiState.custosForm ? "Fechar cadastro" : "+ Novo cadastro"}</button>
    ${uiState.custosForm ? `<form id="f-custos"><input required name="descricao" placeholder="Ex.: Aluguel"/><input required name="categoria" placeholder="Categoria"/><input required type="number" min="0" step="0.01" name="valor" placeholder="Valor"/><button type="submit">Cadastrar</button></form>` : ""}
    <table><thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${state.custos.map((c) => `<tr><td>${c.descricao}</td><td>${c.categoria}</td><td>${BRL(c.valor)}</td><td><button class="secondary" data-del-custo="${c.id}">Excluir</button></td></tr>`).join("") || `<tr><td colspan="4">Nenhum custo cadastrado.</td></tr>`}</tbody></table>`;
  p.querySelector('#toggle-custos').onclick = () => toggleForm('custosForm');
  p.querySelector('#f-custos')?.addEventListener('submit', (e)=>{e.preventDefault();const fd=new FormData(e.target);state.custos.push({id:uid(),descricao:fd.get('descricao'),categoria:fd.get('categoria'),valor:Number(fd.get('valor'))});renderAll();});
  p.querySelectorAll('[data-del-custo]').forEach((b)=>b.onclick=()=>{state.custos=state.custos.filter((c)=>c.id!==b.dataset.delCusto);renderAll();});
}

function renderIngredientes() { /* similar */
  const p = document.getElementById("ingredientes-panel");
  p.innerHTML = `<h2>Ingredientes</h2><button class="toggle-btn" id="toggle-ing">${uiState.ingredientesForm ? "Fechar cadastro" : "+ Novo cadastro"}</button>
    ${uiState.ingredientesForm ? `<form id="f-ing"><input required name="produto" placeholder="Produto"/><input required name="unidade" placeholder="Unidade (ml,g,kg,un)"/><input required type="number" min="0.01" step="0.01" name="quantidade" placeholder="Qtd compra"/><input required type="number" min="0" step="0.01" name="valor" placeholder="Valor compra"/><button type="submit">Cadastrar</button></form>` : ""}
    <table><thead><tr><th>Produto</th><th>Unid.</th><th>Qtd</th><th>Valor compra</th><th>Valor unitário</th><th>Ações</th></tr></thead><tbody>${state.ingredientes.map((i)=>`<tr><td>${i.produto}</td><td>${i.unidade}</td><td>${i.quantidade}</td><td>${BRL(i.valorCompra)}</td><td>${BRL(i.valorUnitario)}</td><td><button class="secondary" data-del-ing="${i.id}">Excluir</button></td></tr>`).join('') || `<tr><td colspan="6">Nenhum ingrediente cadastrado.</td></tr>`}</tbody></table>`;
  p.querySelector('#toggle-ing').onclick = () => toggleForm('ingredientesForm');
  p.querySelector('#f-ing')?.addEventListener('submit',(e)=>{e.preventDefault();const fd=new FormData(e.target);const q=Number(fd.get('quantidade'));const v=Number(fd.get('valor'));state.ingredientes.push({id:uid(),produto:fd.get('produto'),unidade:fd.get('unidade'),quantidade:q,valorCompra:v,valorUnitario:v/q});renderAll();});
  p.querySelectorAll('[data-del-ing]').forEach((b)=>b.onclick=()=>{state.ingredientes=state.ingredientes.filter((i)=>i.id!==b.dataset.delIng);renderAll();});
}

function renderFichas() {
  const p = document.getElementById("fichas-panel");
  p.innerHTML = `<h2>Ficha Técnica</h2><div class="actions-row"><button class="toggle-btn" id="toggle-ficha-prod">${uiState.fichasProdutoForm ? "Fechar cadastro produto" : "+ Cadastrar produto final"}</button><button class="toggle-btn" id="toggle-ficha-item">${uiState.fichasItemForm ? "Fechar cadastro item" : "+ Cadastrar ingrediente na ficha"}</button></div>
    ${uiState.fichasProdutoForm ? `<form id="f-ficha-produto"><input required name="nome" placeholder="Produto final"/><button type="submit">Criar ficha</button></form>` : ""}
    ${uiState.fichasItemForm ? `<form id="f-ficha-item"><select required name="fichaId"><option value="">Selecione a ficha</option>${state.fichas.map((f)=>`<option value="${f.id}">${f.nome}</option>`).join('')}</select><select required name="ingredienteId"><option value="">Selecione o ingrediente</option>${state.ingredientes.map((i)=>`<option value="${i.id}">${i.produto} (${i.unidade})</option>`).join('')}</select><input required type="number" min="0.01" step="0.01" name="quantidadeUso" placeholder="Qtd usada"/><button type="submit">Adicionar item</button></form>` : ""}
    <table><thead><tr><th>Produto final</th><th>Ingredientes</th><th>Custo total</th><th>Ações</th></tr></thead><tbody>${state.fichas.map((f)=>`<tr><td>${f.nome}</td><td>${f.itens.length?`<div class="list-inline">${f.itens.map((i)=>`<span class="pill">${i.produto}: ${i.qtd}${i.unidade}</span>`).join('')}</div>`:'Sem itens'}</td><td>${BRL(f.custoTotal)}</td><td><button class="secondary" data-del-ficha="${f.id}">Excluir</button></td></tr>`).join('') || `<tr><td colspan="4">Nenhuma ficha cadastrada.</td></tr>`}</tbody></table>`;
  p.querySelector('#toggle-ficha-prod').onclick = () => toggleForm('fichasProdutoForm');
  p.querySelector('#toggle-ficha-item').onclick = () => toggleForm('fichasItemForm');
  p.querySelector('#f-ficha-produto')?.addEventListener('submit',(e)=>{e.preventDefault();const fd=new FormData(e.target);state.fichas.push({id:uid(),nome:fd.get('nome'),itens:[],custoTotal:0});renderAll();});
  p.querySelector('#f-ficha-item')?.addEventListener('submit',(e)=>{e.preventDefault();const fd=new FormData(e.target);const f=state.fichas.find(x=>x.id===fd.get('fichaId'));const ing=state.ingredientes.find(x=>x.id===fd.get('ingredienteId'));if(!f||!ing) return alert('Selecione ficha e ingrediente válidos.');const qtd=Number(fd.get('quantidadeUso'));f.itens.push({ingredienteId:ing.id,produto:ing.produto,unidade:ing.unidade,qtd,custo:qtd*ing.valorUnitario});f.custoTotal=f.itens.reduce((a,it)=>a+Number(it.custo),0);renderAll();});
  p.querySelectorAll('[data-del-ficha]').forEach((b)=>b.onclick=()=>{state.fichas=state.fichas.filter((f)=>f.id!==b.dataset.delFicha);state.vendas=state.vendas.filter((v)=>v.fichaId!==b.dataset.delFicha);renderAll();});
}

function renderVendas() {
  const p = document.getElementById("vendas-panel");
  p.innerHTML = `<h2>Venda</h2><button class="toggle-btn" id="toggle-venda">${uiState.vendasForm ? "Fechar cadastro" : "+ Novo cadastro"}</button>
  ${uiState.vendasForm ? `<form id="f-venda"><select required name="fichaId"><option value="">Selecione o produto final</option>${state.fichas.map((f)=>`<option value="${f.id}">${f.nome}</option>`).join('')}</select><input required type="number" min="0" step="0.01" name="lucroDesejadoPct" placeholder="Lucro desejado (%)"/><input required type="number" min="0" step="0.01" name="precoPraticado" placeholder="Preço praticado"/><button type="submit">Cadastrar venda</button></form>` : ''}
  <table><thead><tr><th>Produto</th><th>Preço sugerido</th><th>Praticado</th><th>Status</th><th>Lucro</th><th>Ficha</th><th>Ações</th></tr></thead><tbody>${state.vendas.map((v)=>`<tr><td>${v.produto}</td><td>${BRL(v.precoSugerido)}</td><td>${BRL(v.precoPraticado)}</td><td>${statusBadge(v.status)}</td><td>${BRL(v.lucro)}</td><td><button class="secondary" data-open-ficha="${v.fichaId}">Acessar ficha</button></td><td><button class="secondary" data-del-venda="${v.id}">Excluir</button></td></tr>`).join('') || `<tr><td colspan="7">Nenhuma venda cadastrada.</td></tr>`}</tbody></table>`;
  p.querySelector('#toggle-venda').onclick = () => toggleForm('vendasForm');
  p.querySelector('#f-venda')?.addEventListener('submit',(e)=>{e.preventDefault();const fd=new FormData(e.target);const f=state.fichas.find(x=>x.id===fd.get('fichaId'));if(!f) return alert('Selecione uma ficha válida.');const ld=Number(fd.get('lucroDesejadoPct'));const pp=Number(fd.get('precoPraticado'));const sug=f.custoTotal*(1+ld/100);const lucro=pp-f.custoTotal;const margem=f.custoTotal>0?(lucro/f.custoTotal)*100:0;const status=margem<20?'margem curta':margem<50?'ajustar':'alta margem';state.vendas.push({id:uid(),fichaId:f.id,produto:f.nome,custo:f.custoTotal,lucroDesejadoPct:ld,precoSugerido:sug,precoPraticado:pp,lucro,margemPct:margem,status});renderAll();});
  p.querySelectorAll('[data-del-venda]').forEach((b)=>b.onclick=()=>{state.vendas=state.vendas.filter((v)=>v.id!==b.dataset.delVenda);renderAll();});
  p.querySelectorAll('[data-open-ficha]').forEach((b)=>b.onclick=()=>{showTab('fichas');uiState.fichasItemForm=true;renderAll();const sel=document.querySelector('#f-ficha-item select[name="fichaId"]');if(sel) sel.value=b.dataset.openFicha;});
}
function statusBadge(status) { const cls = status === "alta margem" ? "high" : status === "ajustar" ? "warn" : "ok"; return `<span class="badge ${cls}">${status}</span>`; }
