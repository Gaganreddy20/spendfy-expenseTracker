 const COLORS = { Food: '#f59e0b', Travel: '#3b82f6', Shopping: '#ec4899', Bills: '#8b5cf6', Health: '#10b981', Fun: '#f43f5e', Salary: '#16a34a', Other: '#94a3b8' };
        const LISTS = { expense: ['Food', 'Travel', 'Shopping', 'Bills', 'Health', 'Fun', 'Other'], income: ['Salary', 'Other'] };
        const KEY = 'spendly-v1';
        let S = { tx: [], budget: 0 }, type = 'expense', filter = 'all', editId = null, delId = null, delTimer = null;
        try { const r = localStorage.getItem(KEY); if (r) { const p = JSON.parse(r); if (p && Array.isArray(p.tx)) S = p } } catch (e) { }
        const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) { } };
        const $ = id => document.getElementById(id);
        const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
        const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const pad = n => String(n).padStart(2, '0');
        const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) };
        const sum = (a, t) => a.filter(x => x.type === t).reduce((s, x) => s + x.amount, 0);

        function fillCats(sel) {
            $('cat').innerHTML = LISTS[type].map(c => '<option>' + c + '</option>').join('');
            if (sel) $('cat').value = sel;
        }
        function setType(t, sel) {
            type = t;
            $('tExp').classList.toggle('on', t === 'expense');
            $('tInc').classList.toggle('on', t === 'income');
            fillCats(sel);
        }
        function resetForm() {
            editId = null;
            $('amount').value = ''; $('note').value = ''; $('date').value = today(); $('err').textContent = '';
            $('save').textContent = 'Add'; $('formTitle').textContent = 'Add transaction'; $('cancel').style.display = 'none';
            setType('expense');
        }

        function renderChart(items) {
            const by = {}; items.filter(x => x.type === 'expense').forEach(x => by[x.cat] = (by[x.cat] || 0) + x.amount);
            const ents = Object.entries(by).sort((a, b) => b[1] - a[1]);
            const total = ents.reduce((s, e) => s + e[1], 0);
            const r = 38, C = 2 * Math.PI * r;
            let off = 0, svg = '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="14"/>';
            ents.forEach(([c, v]) => {
                const len = v / total * C;
                svg += '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + (COLORS[c] || '#94a3b8') + '" stroke-width="14" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 50 50)"/>';
                off += len;
            });
            $('donut').innerHTML = svg;
            $('legend').innerHTML = ents.length ? ents.map(([c, v]) => '<div><span><span class="dot" style="background:' + (COLORS[c] || '#94a3b8') + '"></span>' + c + '</span><b>' + Math.round(v / total * 100) + '%</b></div>').join('') : '<span style="color:var(--muted)">No expenses this month</span>';
        }

        function render() {
            const m = $('month').value || today().slice(0, 7);
            const items = S.tx.filter(t => t.date.startsWith(m));
            const inc = sum(items, 'income'), exp = sum(items, 'expense');
            $('inc').textContent = fmt(inc); $('exp').textContent = fmt(exp);
            const bal = $('bal'); bal.textContent = fmt(inc - exp); bal.className = inc - exp < 0 ? 'exp' : '';
            const b = S.budget || 0;
            if (b > 0) {
                const p = Math.min(100, exp / b * 100);
                $('barfill').style.width = p + '%';
                $('barfill').style.background = exp > b ? 'var(--exp)' : 'var(--accent)';
                $('budtxt').textContent = exp > b ? 'Over budget by ' + fmt(exp - b) : fmt(b - exp) + ' left of ' + fmt(b);
            } else { $('barfill').style.width = '0'; $('budtxt').textContent = 'No budget set' }
            renderChart(items);
            const q = $('q').value.trim().toLowerCase();
            const list = items.filter(t => (filter === 'all' || t.type === filter) && (!q || (t.note + ' ' + t.cat).toLowerCase().includes(q)))
                .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
            $('list').innerHTML = list.length ? list.map(t =>
                '<div class="tx"><span class="dot" style="background:' + (COLORS[t.cat] || '#94a3b8') + ';margin:0"></span>' +
                '<div class="info"><div>' + esc(t.note || t.cat) + '</div><small>' + t.cat + ' · ' + t.date + '</small></div>' +
                '<span class="amt ' + (t.type === 'income' ? 'inc' : 'exp') + '">' + (t.type === 'income' ? '+' : '−') + fmt(t.amount) + '</span>' +
                '<button class="ghost" data-a="edit" data-id="' + t.id + '">Edit</button>' +
                '<button class="ghost" data-a="del" data-id="' + t.id + '">' + (delId === t.id ? 'Sure?' : 'Del') + '</button></div>'
            ).join('') : '<div class="empty">Nothing here yet. Add your first transaction.</div>';
        }

        $('tExp').onclick = () => setType('expense');
        $('tInc').onclick = () => setType('income');
        $('cancel').onclick = () => { resetForm() };
        $('save').onclick = () => {
            const amount = parseFloat($('amount').value), date = $('date').value;
            if (!(amount > 0)) { $('err').textContent = 'Enter an amount greater than 0.'; return }
            if (!date) { $('err').textContent = 'Pick a date.'; return }
            const rec = { type, amount, cat: $('cat').value, date, note: $('note').value.trim() };
            if (editId !== null) { const t = S.tx.find(x => x.id === editId); if (t) Object.assign(t, rec) }
            else S.tx.push({ id: Date.now(), ...rec });
            save();
            $('month').value = date.slice(0, 7);
            resetForm(); render();
        };
        $('budget').onchange = () => { S.budget = Math.max(0, parseFloat($('budget').value) || 0); save(); render() };
        $('month').onchange = render;
        $('q').oninput = render;
        document.querySelectorAll('.chips button').forEach(btn => btn.onclick = () => {
            filter = btn.dataset.f;
            document.querySelectorAll('.chips button').forEach(x => x.className = x === btn ? 'on' : 'ghost');
            render();
        });
        $('list').onclick = e => {
            const btn = e.target.closest('button'); if (!btn) return;
            const id = Number(btn.dataset.id), t = S.tx.find(x => x.id === id); if (!t) return;
            if (btn.dataset.a === 'edit') {
                editId = id; setType(t.type, t.cat);
                $('amount').value = t.amount; $('date').value = t.date; $('note').value = t.note;
                $('save').textContent = 'Save changes'; $('formTitle').textContent = 'Edit transaction'; $('cancel').style.display = '';
                $('formTitle').scrollIntoView({ behavior: 'smooth' });
            } else if (delId === id) {
                S.tx = S.tx.filter(x => x.id !== id); delId = null; save(); render();
            } else {
                delId = id; clearTimeout(delTimer); delTimer = setTimeout(() => { delId = null; render() }, 2500); render();
            }
        };

        $('month').value = today().slice(0, 7);
        if (S.budget) $('budget').value = S.budget;
        resetForm(); render();