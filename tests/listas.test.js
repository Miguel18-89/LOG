/**
 * Regressão das listagens de obras e de RMAs.
 *
 * Vive no repositório de propósito. As versões anteriores destes testes estavam
 * numa pasta temporária e foram apagadas pela limpeza do sistema entre sessões —
 * ou seja, a rede de segurança desapareceu justamente quando fazia falta.
 *
 * Corre contra o servidor local, que tem de estar de pé:
 *     node tests/listas.test.js
 *
 * Cria registos com o prefixo ZZT e apaga-os no fim, mesmo que algo falhe a
 * meio. Não assume base vazia: conta só o que ele próprio criou.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const API = process.env.TEST_API || 'http://localhost:3000';

let ok = 0;
let ko = 0;
const check = (nome, condicao, extra) => condicao
    ? (ok++, console.log(`  OK     ${nome}`))
    : (ko++, console.log(`  FALHA  ${nome}`, extra !== undefined ? JSON.stringify(extra) : ''));

async function req(method, url, { token, body } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API}${url}`, {
        method, headers, body: body ? JSON.stringify(body) : undefined,
    });
    const texto = await res.text();
    let json;
    try { json = JSON.parse(texto); } catch { json = texto; }
    return { status: res.status, body: json };
}

(async () => {
    const criados = { users: [], obras: [], rmas: [] };
    try {
        const utilizador = await prisma.user.create({
            data: {
                name: 'ZZT Admin',
                email: 'zzt-listas@local.test',
                password: await bcrypt.hash('T3ste123!', 10),
                role: 2,
                approved: true,
                is_active: true,
            },
        });
        criados.users.push(utilizador.id);
        const token = (await req('POST', '/users/login', {
            body: { email: 'zzt-listas@local.test', password: 'T3ste123!' },
        })).body.token;
        check('login do utilizador de teste', !!token);

        /* ── Obras ── */

        const criarObra = async (obra, extra = {}) => {
            const r = await req('POST', '/emg/obras', {
                token,
                body: {
                    client: 'ZZT Cliente', obra, type: 'instalacao',
                    date: '2026-10-10', tasks: 't', materials: 'm', ...extra,
                },
            });
            if (r.body?.id) criados.obras.push(r.body.id);
            return r.body;
        };

        const emCurso = await criarObra('ZZT Em curso');
        const concluida = await criarObra('ZZT Concluida', { status: 'concluida' });
        const reparacao = await criarObra('ZZT Reparacao', { type: 'reparacao' });

        const qObras = (extra = '') => req('GET', `/emg/obras?pageSize=50&client=ZZT&${extra}`, { token });

        console.log('\n--- Obras: o arquivo sai da lista principal ---');
        const principal = (await qObras('hideDone=true')).body;
        const ids = principal.data.map(o => o.id);
        check('a obra em curso aparece', ids.includes(emCurso.id));
        check('a concluída não aparece', !ids.includes(concluida.id));
        check('o total reflete o filtro', principal.total === 2, principal.total);
        check('status explícito ganha ao hideDone',
            (await qObras('hideDone=true&status=concluida')).body.total === 1);

        console.log('\n--- Obras: os filtros que já existiam ---');
        check('por tipo', (await qObras('type=reparacao')).body.total === 1);
        check('por tipo, só a certa',
            (await qObras('type=reparacao')).body.data[0]?.id === reparacao.id);
        check('tipo inválido é ignorado', (await qObras('type=xpto')).body.total === 3);
        check('intervalo de datas inclui o próprio dia',
            (await qObras('from=2026-10-10&to=2026-10-10')).body.total === 3);
        check('intervalo que não apanha nada',
            (await qObras('from=2026-11-01')).body.total === 0);
        check('pageSize continua limitado a 100',
            (await qObras('pageSize=99999')).body.data.length <= 100);
        check('sem token devolve 401', (await req('GET', '/emg/obras')).status === 401);

        console.log('\n--- Obras: a listagem não expõe a assinatura ---');
        check('signatureData fora da listagem',
            (await qObras()).body.data.every(o => o.signatureData === undefined));
        check('a listagem diz se está assinada',
            (await qObras()).body.data.every(o => 'signedAt' in o));

        /* ── RMAs ── */

        const criarRma = async (serialNumber, extra = {}) => {
            const r = await req('POST', '/emg/rma', {
                token,
                body: {
                    brand: 'ZZT Marca', model: 'M1', serialNumber, fault: 'avaria',
                    client: 'ZZT Cliente', location: 'Armazem', requestedBy: 'Cliente', ...extra,
                },
            });
            if (r.body?.id) criados.rmas.push(r.body.id);
            return r.body;
        };

        const aberto = await criarRma('ZZT-SN-1');
        const entregueA = await criarRma('ZZT-SN-2', { status: 'entregue' });
        const entregueB = await criarRma('ZZT-SN-3', { status: 'entregue' });

        const qRma = (extra = '') => req('GET', `/emg/rma?pageSize=50&client=ZZT&${extra}`, { token });

        console.log('\n--- RMA: o arquivo sai da lista principal ---');
        const rPrincipal = (await qRma('hideDelivered=true')).body;
        const rIds = rPrincipal.data.map(r => r.id);
        check('o que está em curso aparece', rIds.includes(aberto.id));
        check('os entregues não aparecem',
            !rIds.includes(entregueA.id) && !rIds.includes(entregueB.id));
        check('o total reflete o filtro', rPrincipal.total === 1, rPrincipal.total);
        check('status explícito ganha ao hideDelivered',
            (await qRma('hideDelivered=true&status=entregue')).body.total === 2);

        console.log('\n--- RMA: ordenação ---');
        const entregues = (await qRma('status=entregue')).body.data;
        check('entregues: o mais recente primeiro',
            entregues[0]?.rmaNumber > entregues[1]?.rmaNumber,
            entregues.map(r => r.rmaNumber));
        const fila = rPrincipal.data.map(r => r.rmaNumber);
        check('fila de trabalho: ordem de entrada',
            fila.every((v, i) => i === 0 || fila[i - 1] <= v), fila);

        console.log('\n--- RMA: o resto continua de pé ---');
        check('traz os anexos', Array.isArray((await qRma()).body.data[0]?.documents));
        check('sem token devolve 401', (await req('GET', '/emg/rma')).status === 401);
    } catch (erro) {
        ko++;
        console.error('ERRO:', erro);
    } finally {
        for (const id of criados.obras) {
            try { await prisma.workOrder.delete({ where: { id } }); } catch { /* já apagada */ }
        }
        for (const id of criados.rmas) {
            try { await prisma.rMA.delete({ where: { id } }); } catch { /* já apagado */ }
        }
        for (const id of criados.users) {
            try { await prisma.user.delete({ where: { id } }); } catch { /* já apagado */ }
        }
        await prisma.$disconnect();
        console.log(`\n=== ${ok} passaram, ${ko} falharam ===`);
        process.exit(ko ? 1 : 0);
    }
})();
