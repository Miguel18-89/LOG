const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs/promises');
const prisma = new PrismaClient();

const {
    TYPE_VALID, PRIORITY_VALID, STATUS_VALID, TRACKED_FIELDS,
    DOC_KINDS, ALLOWED_UPLOAD_EXTS, ALLOWED_UPLOAD_MIMES, MAX_CAPTION, captionSchema,
    ticketSchema, updateTicketSchema, messageSchema,
    linkWorkOrderSchema, linkRmaSchema,
} = require('../schemas/ticketSchema.js');

const { notifyTicketEvent } = require('../modules/ticketNotifications.js');

const ROLE_ADMIN = 2;
const MAX_PAGE_SIZE = 100;

// Estados que contam como "por fechar" no filtro rápido e no cartão da Home.
const OPEN_STATUSES = ['aberto', 'atribuido', 'em_curso'];

const userBrief = { select: { id: true, name: true } };

const ticketInclude = {
    createdBy: userBrief,
    assignee: userBrief,
    entries: {
        select: {
            id: true, kind: true, message: true, field: true,
            fromValue: true, toValue: true, created_at: true,
            createdBy: userBrief,
        },
        orderBy: { created_at: 'asc' },
    },
    documents: {
        select: { id: true, kind: true, originalName: true, caption: true, uploadedAt: true },
        orderBy: { uploadedAt: 'asc' },
    },
    workOrders: { select: { id: true, orderNumber: true, client: true, obra: true, date: true } },
    rmas: { select: { id: true, rmaNumber: true, brand: true, model: true, status: true } },
};

// A listagem não traz a linha de tempo nem os anexos: numa lista de 10 tickets com
// histórico longo seria a maior parte da resposta, e nada disso aparece na tabela.
const ticketListSelect = {
    id: true, ticketNumber: true, type: true, title: true, description: true,
    client: true, location: true, requestedBy: true, priority: true, status: true,
    expectedDate: true, dueDate: true, closingNote: true, closedAt: true,
    created_at: true, updated_at: true, user_id: true, assignee_id: true,
    createdBy: userBrief,
    assignee: userBrief,
    _count: { select: { entries: true, documents: true, workOrders: true, rmas: true } },
};

/** Fim do dia indicado, para o filtro "até" incluir os tickets dessa data. */
function endOfDay(value) {
    const d = new Date(value);
    d.setHours(23, 59, 59, 999);
    return d;
}

function zodError(res, parseResult) {
    return res.status(400).json({
        error: parseResult.error.issues[0]?.message || 'Dados inválidos',
        details: parseResult.error.format(),
    });
}

/**
 * Acrescenta as permissões à resposta, para os clientes saberem que ações mostrar
 * sem duplicarem a regra. Editar é de toda a gente, por decisão do Miguel — o que
 * trava os abusos é o histórico, que regista quem mudou o quê. Apagar é só do
 * administrador: apagar um ticket leva o histórico à frente.
 */
function withPermissions(ticket, user) {
    return { ...ticket, canEdit: true, canDelete: user.role >= ROLE_ADMIN };
}

/** O valor como fica guardado no histórico, legível sem ter de ir buscar mais nada. */
function historyValue(field, value, userNames) {
    if (value === null || value === undefined) return null;
    // O responsável guarda-se pelo nome e não pelo id: o histórico tem de continuar
    // a ler-se daqui a dois anos, mesmo que a conta entretanto desapareça.
    if (field === 'assignee_id') return userNames.get(value) ?? value;
    if (field === 'expectedDate' || field === 'dueDate') {
        return new Date(value).toISOString().slice(0, 10);
    }
    return String(value);
}

/** Compara o ticket atual com os campos recebidos e devolve as alterações. */
async function diffTrackedFields(existing, fields) {
    const changed = TRACKED_FIELDS.filter(field => {
        if (!(field in fields)) return false;
        const before = existing[field];
        const after = fields[field];
        if (before instanceof Date || after instanceof Date) {
            const b = before ? new Date(before).getTime() : null;
            const a = after ? new Date(after).getTime() : null;
            return b !== a;
        }
        return (before ?? null) !== (after ?? null);
    });

    // Os nomes dos responsáveis envolvidos, numa só consulta.
    const userIds = changed
        .filter(f => f === 'assignee_id')
        .flatMap(f => [existing[f], fields[f]])
        .filter(Boolean);

    const userNames = new Map();
    if (userIds.length) {
        const users = await prisma.user.findMany({
            where: { id: { in: [...new Set(userIds)] } },
            select: { id: true, name: true },
        });
        for (const u of users) userNames.set(u.id, u.name);
    }

    return changed.map(field => ({
        kind: 'alteracao',
        field,
        fromValue: historyValue(field, existing[field], userNames),
        toValue: historyValue(field, fields[field], userNames),
    }));
}

/* ── Tickets ── */

exports.createTicket = async (req, res) => {
    try {
        const parsed = ticketSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const { assignee_id, ...data } = parsed.data;

        const ticket = await prisma.ticket.create({
            data: {
                ...data,
                // Um ticket que nasce já com dono nasce atribuído, a não ser que
                // quem o abriu tenha escolhido outro estado.
                status: data.status ?? (assignee_id ? 'atribuido' : 'aberto'),
                ...(assignee_id ? { assignee: { connect: { id: assignee_id } } } : {}),
                createdBy: { connect: { id: req.user.id } },
            },
            include: ticketInclude,
        });

        notifyTicketEvent({
            event: 'criado',
            ticket,
            actorId: req.user.id,
            actorName: req.user.name,
        });

        res.status(201).json(withPermissions(ticket, req.user));
    } catch (e) {
        console.error('Erro ao criar ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getAllTickets = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize) || 10), MAX_PAGE_SIZE);
        const { search, type, status, priority, assignee, mine, open, hideClosed, from, to } = req.query;

        const where = {};
        if (type && TYPE_VALID.includes(type)) where.type = type;
        if (status && STATUS_VALID.includes(status)) where.status = status;
        if (priority && PRIORITY_VALID.includes(priority)) where.priority = priority;
        if (assignee) where.assignee_id = assignee;
        // "Os meus" ignora um `assignee` contraditório: é o filtro mais específico.
        if (mine === 'true') where.assignee_id = req.user.id;
        if (open === 'true') where.status = { in: OPEN_STATUSES };
        // A lista principal mostra o que ainda esta por fechar. Os cancelados
        // continuam a aparecer: sao poucos e desaparecerem sem rasto confundia.
        if (hideClosed === 'true' && !status) where.status = { not: 'fechado' };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { client: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (from || to) {
            where.created_at = {};
            if (from) where.created_at.gte = new Date(from);
            // `to` chega como data sem hora: sem isto, os tickets desse mesmo dia
            // ficavam de fora, por a comparação ser contra a meia-noite.
            if (to) where.created_at.lte = endOfDay(to);
        }

        const [data, total] = await Promise.all([
            prisma.ticket.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                // A lista dos fechados interessa pela ordem do fecho; as restantes,
                // pelo estado e depois pela data de abertura.
                orderBy: status === 'fechado'
                    ? [{ closedAt: 'desc' }, { created_at: 'desc' }]
                    : [{ status: 'asc' }, { created_at: 'desc' }],
                select: ticketListSelect,
            }),
            prisma.ticket.count({ where }),
        ]);

        res.status(200).json({ data: data.map(t => withPermissions(t, req.user)), total });
    } catch (e) {
        console.error('Erro ao listar tickets:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getTicketById = async (req, res) => {
    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: req.params.id },
            include: ticketInclude,
        });
        if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });
        res.status(200).json(withPermissions(ticket, req.user));
    } catch (e) {
        console.error('Erro ao obter ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.updateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.ticket.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Ticket não encontrado.' });

        const parsed = updateTicketSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const fields = { ...parsed.data };

        // Atribuir um ticket ainda por pegar passa-o a atribuído. As restantes
        // transições são manuais — adivinhar mais do que isto seria mexer no
        // estado sem a pessoa pedir.
        if ('assignee_id' in fields && fields.assignee_id && !('status' in fields)
            && existing.status === 'aberto') {
            fields.status = 'atribuido';
        }

        // O fecho é o único estado com data própria; reabrir limpa-a.
        if ('status' in fields && fields.status !== existing.status) {
            if (fields.status === 'fechado') fields.closedAt = new Date();
            else if (existing.status === 'fechado') fields.closedAt = null;
        }

        const entries = await diffTrackedFields(existing, fields);
        // A descrição não entra no histórico com o texto antigo — guardar todas as
        // versões de um campo longo cresce sem limite. Regista-se que foi editada.
        if ('description' in fields && fields.description !== existing.description) {
            entries.push({ kind: 'alteracao', field: 'description', fromValue: null, toValue: null });
        }

        // Alteração e histórico na mesma transação: se uma falhar, a outra não fica
        // gravada e o histórico nunca chega a mentir sobre o que aconteceu.
        const ticket = await prisma.$transaction(async (tx) => {
            const updated = await tx.ticket.update({
                where: { id },
                data: fields,
                include: ticketInclude,
            });
            if (entries.length) {
                await tx.ticketEntry.createMany({
                    data: entries.map(e => ({ ...e, ticket_id: id, user_id: req.user.id })),
                });
            }
            return updated;
        });

        const changedFields = entries.map(e => e.field);
        const actor = { actorId: req.user.id, actorName: req.user.name };

        if (changedFields.includes('status') && ticket.status === 'fechado') {
            notifyTicketEvent({ event: 'fechado', ticket, ...actor });
        } else if (changedFields.includes('assignee_id') && ticket.assignee_id) {
            notifyTicketEvent({ event: 'atribuido', ticket, ...actor });
        } else if (entries.length) {
            notifyTicketEvent({
                event: 'atualizado',
                ticket,
                ...actor,
                message: entries.map(e => describeChange(e)).join('\n'),
            });
        }

        // A linha de tempo vem do include, que corre antes do createMany dentro da
        // transação — por isso relê-se aqui, senão a resposta vinha sem as entradas.
        const fresh = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
        res.status(200).json(withPermissions(fresh, req.user));
    } catch (e) {
        console.error('Erro ao atualizar ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

const FIELD_LABELS = {
    status: 'Estado',
    assignee_id: 'Responsável',
    priority: 'Prioridade',
    expectedDate: 'Data prevista',
    dueDate: 'Data limite',
    title: 'Assunto',
    type: 'Tipo',
    description: 'Descrição',
};

/** Uma alteração em texto corrido, para o corpo do email. */
function describeChange(entry) {
    const label = FIELD_LABELS[entry.field] ?? entry.field;
    if (entry.field === 'description') return '- Descrição editada';
    return `- ${label}: ${entry.fromValue ?? '—'} → ${entry.toValue ?? '—'}`;
}

exports.deleteTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const ticket = await prisma.ticket.findUnique({
            where: { id },
            include: { documents: true },
        });
        if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

        // Apagar os ficheiros do disco antes do registo — o cascade só limpa a base.
        for (const doc of ticket.documents) {
            try {
                await fs.unlink(doc.path);
            } catch (err) {
                console.warn('Não foi possível apagar o ficheiro', doc.path, err.message);
            }
        }

        // As obras e os RMAs ligados não são apagados: o trabalho feito sobrevive ao
        // pedido que lhe deu origem. A chave estrangeira fica a NULL (onDelete: SetNull).
        await prisma.ticket.delete({ where: { id } });
        res.status(200).json({ message: 'Ticket eliminado.' });
    } catch (e) {
        console.error('Erro ao eliminar ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/* ── Linha de tempo ── */

exports.addMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const parsed = messageSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const ticket = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
        if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

        await prisma.ticketEntry.create({
            data: {
                kind: 'mensagem',
                message: parsed.data.message,
                ticket: { connect: { id } },
                createdBy: { connect: { id: req.user.id } },
            },
        });

        notifyTicketEvent({
            event: 'mensagem',
            ticket,
            actorId: req.user.id,
            actorName: req.user.name,
            message: parsed.data.message,
        });

        const fresh = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
        res.status(201).json(withPermissions(fresh, req.user));
    } catch (e) {
        console.error('Erro ao escrever mensagem no ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/**
 * Apaga uma mensagem da linha de tempo. Só administradores, e só mensagens.
 *
 * As entradas de tipo `alteracao` são o rasto de quem mudou o quê e quando:
 * poder apagá-las tirava ao histórico a razão de existir. A própria eliminação
 * fica registada, senão o histórico passava a mentir por omissão.
 */
exports.deleteMessage = async (req, res) => {
    try {
        const { id, entryId } = req.params;

        const entry = await prisma.ticketEntry.findFirst({
            where: { id: entryId, ticket_id: id },
            include: { createdBy: { select: { name: true } } },
        });
        if (!entry) return res.status(404).json({ error: 'Mensagem não encontrada.' });
        if (entry.kind !== 'mensagem') {
            return res.status(409).json({
                error: 'Só as mensagens podem ser eliminadas. O registo de alterações é o rasto do que aconteceu.',
            });
        }

        await prisma.$transaction([
            prisma.ticketEntry.delete({ where: { id: entry.id } }),
            prisma.ticketEntry.create({
                data: {
                    kind: 'alteracao',
                    field: 'mensagem_eliminada',
                    toValue: entry.createdBy?.name ?? null,
                    ticket_id: id,
                    user_id: req.user.id,
                },
            }),
        ]);

        const fresh = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
        res.status(200).json(withPermissions(fresh, req.user));
    } catch (e) {
        console.error('Erro ao eliminar mensagem do ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/* ── Ligação a obras e RMAs ── */

async function ticketExists(id, res) {
    const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true, ticketNumber: true } });
    if (!ticket) {
        res.status(404).json({ error: 'Ticket não encontrado.' });
        return null;
    }
    return ticket;
}

/** Regista a ligação na linha de tempo, para se saber quem a fez e quando. */
async function logLink(ticketId, userId, field, toValue) {
    await prisma.ticketEntry.create({
        data: { kind: 'alteracao', field, toValue, ticket_id: ticketId, user_id: userId },
    });
}

exports.linkWorkOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!await ticketExists(id, res)) return;

        const parsed = linkWorkOrderSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const workOrder = await prisma.workOrder.findUnique({
            where: { id: parsed.data.workOrderId },
            select: { id: true, orderNumber: true, ticket_id: true },
        });
        if (!workOrder) return res.status(404).json({ error: 'Obra não encontrada.' });
        if (workOrder.ticket_id && workOrder.ticket_id !== id) {
            return res.status(409).json({ error: 'Essa obra já está ligada a outro ticket.' });
        }

        await prisma.workOrder.update({ where: { id: workOrder.id }, data: { ticket_id: id } });
        await logLink(id, req.user.id, 'obra_ligada', `#${workOrder.orderNumber}`);

        const fresh = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
        res.status(200).json(withPermissions(fresh, req.user));
    } catch (e) {
        console.error('Erro ao ligar obra ao ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.unlinkWorkOrder = async (req, res) => {
    try {
        const { id, workOrderId } = req.params;
        if (!await ticketExists(id, res)) return;

        const workOrder = await prisma.workOrder.findFirst({
            where: { id: workOrderId, ticket_id: id },
            select: { id: true, orderNumber: true },
        });
        if (!workOrder) return res.status(404).json({ error: 'Essa obra não está ligada a este ticket.' });

        await prisma.workOrder.update({ where: { id: workOrder.id }, data: { ticket_id: null } });
        await logLink(id, req.user.id, 'obra_desligada', `#${workOrder.orderNumber}`);

        const fresh = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
        res.status(200).json(withPermissions(fresh, req.user));
    } catch (e) {
        console.error('Erro ao desligar obra do ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.linkRma = async (req, res) => {
    try {
        const { id } = req.params;
        if (!await ticketExists(id, res)) return;

        const parsed = linkRmaSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const rma = await prisma.rMA.findUnique({
            where: { id: parsed.data.rmaId },
            select: { id: true, rmaNumber: true, ticket_id: true },
        });
        if (!rma) return res.status(404).json({ error: 'RMA não encontrado.' });
        if (rma.ticket_id && rma.ticket_id !== id) {
            return res.status(409).json({ error: 'Esse RMA já está ligado a outro ticket.' });
        }

        await prisma.rMA.update({ where: { id: rma.id }, data: { ticket_id: id } });
        await logLink(id, req.user.id, 'rma_ligado', `#${rma.rmaNumber}`);

        const fresh = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
        res.status(200).json(withPermissions(fresh, req.user));
    } catch (e) {
        console.error('Erro ao ligar RMA ao ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.unlinkRma = async (req, res) => {
    try {
        const { id, rmaId } = req.params;
        if (!await ticketExists(id, res)) return;

        const rma = await prisma.rMA.findFirst({
            where: { id: rmaId, ticket_id: id },
            select: { id: true, rmaNumber: true },
        });
        if (!rma) return res.status(404).json({ error: 'Esse RMA não está ligado a este ticket.' });

        await prisma.rMA.update({ where: { id: rma.id }, data: { ticket_id: null } });
        await logLink(id, req.user.id, 'rma_desligado', `#${rma.rmaNumber}`);

        const fresh = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
        res.status(200).json(withPermissions(fresh, req.user));
    } catch (e) {
        console.error('Erro ao desligar RMA do ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/* ── Documentos ── */

// O multer guarda com o nome original em latin1; o resto da app corrige da mesma forma.
function fixEncoding(str) {
    return Buffer.from(str, 'latin1').toString('utf8');
}

exports.uploadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const exists = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
        if (!exists) {
            // O multer já gravou o ficheiro em disco antes de chegarmos aqui.
            if (req.file) await fs.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ error: 'Ticket não encontrado.' });
        }
        if (!req.file) return res.status(400).json({ error: 'Nenhum ficheiro foi enviado.' });

        const originalName = fixEncoding(req.file.originalname);
        const kind = DOC_KINDS.includes(req.body.kind) ? req.body.kind : 'documento';

        // Lista branca: sem isto era possível guardar .html/.svg com <script>.
        const ext = path.extname(originalName).toLowerCase();
        const mime = (req.file.mimetype || '').toLowerCase();
        if (!ALLOWED_UPLOAD_EXTS.includes(ext) || !ALLOWED_UPLOAD_MIMES.includes(mime)) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({
                error: `Tipo de ficheiro não permitido. Aceites: ${ALLOWED_UPLOAD_EXTS.join(', ')}`,
            });
        }

        // A legenda pode vir logo no upload; o multipart traz tudo como texto.
        const caption = String(req.body.caption ?? '').trim().slice(0, MAX_CAPTION) || null;

        const document = await prisma.ticketDocument.create({
            data: {
                kind,
                filename: '',
                path: '',
                originalName,
                caption,
                ticket: { connect: { id } },
                uploadedBy: { connect: { id: req.user.id } },
            },
        });

        const storedName = `${document.id}${ext}`;
        const oldPath = path.resolve(req.file.path);
        const newPath = path.resolve(path.dirname(oldPath), storedName);
        await fs.rename(oldPath, newPath);

        const updated = await prisma.ticketDocument.update({
            where: { id: document.id },
            data: { filename: storedName, path: newPath },
            select: { id: true, kind: true, originalName: true, caption: true, uploadedAt: true },
        });

        res.status(201).json(updated);
    } catch (e) {
        console.error('Erro ao carregar documento do ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.getDocument = async (req, res) => {
    try {
        // O documento tem de pertencer ao ticket do URL: procurar só por docId
        // permitia obter qualquer documento através de um ticket arbitrário.
        const doc = await prisma.ticketDocument.findFirst({
            where: { id: req.params.docId, ticket_id: req.params.id },
        });
        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
        res.download(path.resolve(doc.path), doc.originalName);
    } catch (e) {
        console.error('Erro ao enviar documento do ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/** Escreve ou apaga a legenda de um anexo. */
exports.updateDocumentCaption = async (req, res) => {
    try {
        const parsed = captionSchema.safeParse(req.body);
        if (!parsed.success) return zodError(res, parsed);

        const doc = await prisma.ticketDocument.findFirst({
            where: { id: req.params.docId, ticket_id: req.params.id },
        });
        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

        const updated = await prisma.ticketDocument.update({
            where: { id: doc.id },
            data: { caption: parsed.data.caption },
            select: { id: true, kind: true, originalName: true, caption: true, uploadedAt: true },
        });
        res.status(200).json(updated);
    } catch (e) {
        console.error('Erro ao guardar legenda do ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const doc = await prisma.ticketDocument.findFirst({
            where: { id: req.params.docId, ticket_id: req.params.id },
        });
        if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

        try {
            await fs.unlink(doc.path);
        } catch (err) {
            console.warn('Não foi possível apagar o ficheiro físico:', err.message);
        }

        await prisma.ticketDocument.delete({ where: { id: doc.id } });
        res.status(200).json({ message: 'Documento eliminado.' });
    } catch (e) {
        console.error('Erro ao eliminar documento do ticket:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/* ── Apoio ao formulário ── */

/**
 * Lista reduzida de utilizadores para o seletor de responsável.
 * O endpoint /users devolve dados de conta e é restrito a administradores, pelo que
 * um colaborador não conseguiria atribuir um ticket a um colega. Aqui só saem id e
 * nome — o mesmo que `pessoalController.getTechnicianOptions` faz para os técnicos.
 */
exports.getAssignableUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { is_active: true, approved: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true },
        });
        res.status(200).json(users);
    } catch (e) {
        console.error('Erro ao listar utilizadores para atribuição:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};

/** Contagem dos meus tickets por fechar, para o cartão da Home. */
exports.getMyOpenCount = async (req, res) => {
    try {
        const count = await prisma.ticket.count({
            where: { assignee_id: req.user.id, status: { in: OPEN_STATUSES } },
        });
        res.status(200).json({ count });
    } catch (e) {
        console.error('Erro ao contar tickets:', e);
        res.status(500).json({ error: 'Algo correu mal.' });
    }
};
