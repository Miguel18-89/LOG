const { PrismaClient } = require('@prisma/client');
const { sendEmail } = require('./email.js');
const { webUrl } = require('./webUrl.js');

const prisma = new PrismaClient();

const ROLE_ADMIN = 2;

const TYPE_LABELS = { assistencia: 'Assistência', tarefa: 'Tarefa' };

const PRIORITY_LABELS = {
    baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente',
};

const STATUS_LABELS = {
    aberto: 'Aberto',
    atribuido: 'Atribuído',
    em_curso: 'Em curso',
    fechado: 'Fechado',
    cancelado: 'Cancelado',
};

function fmtDate(value) {
    return value ? new Date(value).toLocaleDateString('pt-PT') : '—';
}

/** Utilizadores que podem receber email: conta ativa e já aprovada. */
async function usersWhere(where) {
    return prisma.user.findMany({
        where: { is_active: true, approved: true, ...where },
        select: { id: true, email: true },
    });
}

/**
 * Quem recebe cada acontecimento.
 *
 * Os administradores recebem tudo, por decisão do Miguel — é a forma de a chefia
 * acompanhar a fila sem ter de a ir consultar. Quem provocou o acontecimento fica
 * sempre de fora: não precisa de um email a contar-lhe o que acabou de fazer.
 */
async function recipientsFor(event, ticket, actorId) {
    const admins = await usersWhere({ role: { gte: ROLE_ADMIN } });
    const ids = new Set(admins.map(a => a.id));
    const emails = new Map(admins.map(a => [a.id, a.email]));

    const add = async (where) => {
        for (const u of await usersWhere(where)) {
            ids.add(u.id);
            emails.set(u.id, u.email);
        }
    };

    switch (event) {
        case 'criado':
            // Sem responsável o pedido é de quem o quiser: toda a gente tem de saber.
            if (ticket.assignee_id) await add({ id: ticket.assignee_id });
            else await add({});
            break;
        case 'atribuido':
            if (ticket.assignee_id) await add({ id: ticket.assignee_id });
            break;
        case 'fechado':
            await add({ id: ticket.user_id });
            break;
        case 'mensagem':
        case 'atualizado':
            await add({ id: { in: [ticket.assignee_id, ticket.user_id].filter(Boolean) } });
            break;
    }

    ids.delete(actorId);
    return [...ids].map(id => emails.get(id)).filter(Boolean);
}

function buildBody(event, ticket, actorName, message) {
    const linhas = [
        `Ticket #${ticket.ticketNumber} — ${ticket.title}`,
        '',
        `Tipo: ${TYPE_LABELS[ticket.type] ?? ticket.type}`,
        `Estado: ${STATUS_LABELS[ticket.status] ?? ticket.status}`,
        `Prioridade: ${PRIORITY_LABELS[ticket.priority] ?? ticket.priority}`,
    ];

    if (ticket.client) linhas.push(`Cliente: ${ticket.client}`);
    if (ticket.location) linhas.push(`Local: ${ticket.location}`);
    linhas.push(`Responsável: ${ticket.assignee?.name ?? 'sem responsável'}`);
    if (ticket.expectedDate) linhas.push(`Data prevista: ${fmtDate(ticket.expectedDate)}`);
    if (ticket.dueDate) linhas.push(`Data limite: ${fmtDate(ticket.dueDate)}`);

    linhas.push('');
    if (event === 'criado') linhas.push(`Aberto por ${actorName}.`, '', ticket.description);
    if (event === 'atribuido') linhas.push(`${actorName} atribuiu este ticket a ${ticket.assignee?.name ?? '—'}.`);
    if (event === 'fechado') {
        linhas.push(`Fechado por ${actorName}.`);
        if (ticket.closingNote) linhas.push('', `Nota de fecho: ${ticket.closingNote}`);
    }
    if (event === 'mensagem') linhas.push(`Nova mensagem de ${actorName}:`, '', message);
    if (event === 'atualizado') linhas.push(`${actorName} alterou:`, '', message);

    linhas.push('', `Ver na plataforma: ${webUrl()}/EMG/Tickets`);
    return linhas.join('\n');
}

const SUBJECT_PREFIX = {
    criado: 'Novo ticket',
    atribuido: 'Ticket atribuído',
    fechado: 'Ticket fechado',
    mensagem: 'Nova mensagem no ticket',
    atualizado: 'Ticket atualizado',
};

/**
 * Envia os avisos de um acontecimento. **Nunca lança**: um problema no SMTP não
 * pode fazer falhar a criação ou a alteração de um ticket, que é o que importa
 * guardar. Falhas ficam no log.
 *
 * Um email por pessoa, em vez de um com toda a gente em cópia: não expõe a lista
 * de endereços da empresa e um destinatário inválido não leva os outros atrás.
 */
async function notifyTicketEvent({ event, ticket, actorId, actorName, message }) {
    try {
        const recipients = await recipientsFor(event, ticket, actorId);
        if (recipients.length === 0) return;

        const subject = `[LOG] ${SUBJECT_PREFIX[event]} #${ticket.ticketNumber} — ${ticket.title}`;
        const body = buildBody(event, ticket, actorName, message);

        const results = await Promise.allSettled(
            recipients.map(to => sendEmail(to, subject, body)),
        );
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length) {
            console.warn(
                `[Tickets] ${failed.length}/${recipients.length} avisos do ticket #${ticket.ticketNumber} falharam:`,
                failed[0].reason?.message,
            );
        }
    } catch (e) {
        console.error('[Tickets] Falha ao enviar avisos:', e.message);
    }
}

module.exports = {
    notifyTicketEvent,
    // Exportado para poder ser testado sem enviar nada: é a parte com regras.
    recipientsFor,
    TYPE_LABELS,
    PRIORITY_LABELS,
    STATUS_LABELS,
};
