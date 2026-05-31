import { FastifyInstance } from 'fastify';
import { PrismaClient, ObraStatus, MovimentacaoTipo, CategoriaEntrada, CategoriaSaida } from '@prisma/client';
import { parseWhatsAppMessage } from '../utils/nlpParser';
import { FinanceService } from '../services/FinanceService';

const prisma = new PrismaClient();

// Helper to normalize strings for comparison
function simplifyString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

export async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post('/whatsapp', async (request, reply) => {
    const { sender, message, messageId } = request.body as {
      sender: string;
      message: string;
      messageId: string;
    };

    console.log(`Received message from ${sender}: "${message}"`);

    // Clean phone number (removing standard Brazilian '9' prefix issues if they occur)
    // We match the last 8-10 digits to be extremely resilient with DDI variations
    const cleanSender = sender.replace(/[^\d]/g, '');

    // 1. Authenticate sender in database
    const user = await prisma.user.findFirst({
      where: {
        telefone: {
          contains: cleanSender.slice(-11) // Match last 11 digits to bypass 55 country-code prefixes
        }
      },
      include: {
        socio: true
      }
    });

    if (!user || !user.socio) {
      console.warn(`Unauthorized sender: ${sender}`);
      return reply.code(403).send({
        status: 'error',
        message: 'Acesso não autorizado. Telefone não cadastrado como Sócio.',
        responseText: '❌ *Erro de Segurança*:\nSeu número de telefone não está autorizado a executar comandos neste sistema financeiro.'
      });
    }

    const tenantId = user.tenantId;
    const socioId = user.socio.id;
    const partnerName = user.nome;

    // 2. Parse command
    const parsed = parseWhatsAppMessage(message);

    if (parsed.type === 'INVALID') {
      return reply.send({
        status: 'invalid',
        responseText: `❓ *Comando não reconhecido*\n\nOlá, *${partnerName}*! Não consegui entender seu comando. Tente algo como:\n` +
          `• "Nova obra João valor 34000"\n` +
          `• "Recebido obra João 5000"\n` +
          `• "Uber obra João 130"\n` +
          `• "Diária Victor obra João 150"\n` +
          `• "Material obra João 890"\n` +
          `• "Hoje obra João com Victor e Carlos"\n` +
          `• "Resumo obra João"\n` +
          `• "Relatório semanal"`
      });
    }

    try {
      // 3. Process commands
      switch (parsed.type) {
        case 'CREATE_OBRA': {
          const { nome, cliente, valor } = parsed.payload;
          
          // Check duplicate
          const nameSimple = simplifyString(nome);
          const existingObras = await prisma.obra.findMany({ where: { tenantId } });
          const duplicate = existingObras.find(o => simplifyString(o.nome) === nameSimple);

          if (duplicate) {
            return reply.send({
              status: 'exists',
              responseText: `⚠️ *Aviso*: A obra *"${nome}"* já existe no sistema!`
            });
          }

          const newObra = await prisma.obra.create({
            data: {
              nome,
              cliente,
              valorFechado: valor,
              status: ObraStatus.EM_ANDAMENTO,
              tenantId
            }
          });

          // Log WhatsApp command Audit log
          await prisma.mensagemWhatsapp.create({
            data: {
              mensagemId: messageId || Math.random().toString(),
              remetente: cleanSender,
              conteudo: message,
              comandoValido: true,
              comandoTipo: 'CREATE_OBRA',
              respostaEnviada: `Obra ${nome} criada`
            }
          });

          return reply.send({
            status: 'success',
            responseText: `☀️ *WQ Solar - Nova Obra!*\n\n` +
              `🏗️ Obra: *${newObra.nome}*\n` +
              `💰 Valor Fechado: *R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n` +
              `👤 Cadastrado por: *${partnerName}*\n` +
              `📝 Status: *Em Andamento*\n\n` +
              `✅ *Criado com sucesso!*`
          });
        }

        case 'ADD_RECEIPT': {
          const { obraNome, valor } = parsed.payload;

          // Find Obra (fuzzy search by matching simplified strings)
          const nameSimple = simplifyString(obraNome);
          const obras = await prisma.obra.findMany({ where: { tenantId } });
          const targetObra = obras.find(o => simplifyString(o.nome).includes(nameSimple) || nameSimple.includes(simplifyString(o.nome)));

          if (!targetObra) {
            return reply.send({
              status: 'not_found',
              responseText: `❌ *Obra não encontrada*: Não encontrei nenhuma obra parecida com *"${obraNome}"*.`
            });
          }

          // Register entrada
          const mov = await prisma.movimentacao.create({
            data: {
              valor,
              tipo: MovimentacaoTipo.ENTRADA,
              categoriaEntrada: CategoriaEntrada.PARCIAL,
              descricao: `Recebimento via WhatsApp por ${partnerName}`,
              obraId: targetObra.id,
              tenantId
            }
          });

          // Recalculate summary
          const summary = await FinanceService.getObraSummary(targetObra.id);

          return reply.send({
            status: 'success',
            responseText: `💰 *Recebimento Registrado!*\n\n` +
              `🏗️ Obra: *${targetObra.nome}*\n` +
              `📥 Valor Recebido: *R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n` +
              `📈 Total Recebido: *R$ ${summary.totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* / R$ ${summary.valorFechado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `📊 Saldo Atual em Caixa da Obra: *R$ ${(summary.totalEntradas - summary.totalSaidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n` +
              `✅ *Lançamento efetuado!*`
          });
        }

        case 'ADD_EXPENSE': {
          const { obraNome, valor, categoria, funcionarioNome } = parsed.payload;

          // Find Obra
          const nameSimple = simplifyString(obraNome);
          const obras = await prisma.obra.findMany({ where: { tenantId } });
          const targetObra = obras.find(o => simplifyString(o.nome).includes(nameSimple) || nameSimple.includes(simplifyString(o.nome)));

          if (!targetObra) {
            return reply.send({
              status: 'not_found',
              responseText: `❌ *Obra não encontrada*: Não consegui registrar a despesa. Obra *"${obraNome}"* não foi localizada.`
            });
          }

          let matchedFuncId: string | undefined = undefined;

          // If diária, search or create worker
          if (categoria === 'DIARIA' && funcionarioNome) {
            const funcSimple = simplifyString(funcionarioNome);
            const workers = await prisma.funcionario.findMany({ where: { tenantId } });
            let targetWorker = workers.find(w => simplifyString(w.nome).includes(funcSimple) || funcSimple.includes(simplifyString(w.nome)));

            if (!targetWorker) {
              // Automatically create the worker on the fly!
              targetWorker = await prisma.funcionario.create({
                data: {
                  nome: funcionarioNome,
                  valorDiariaPadrao: valor, // use this diária as default
                  tenantId
                }
              });
              console.log(`Automatically created worker: ${funcionarioNome}`);
            }
            matchedFuncId = targetWorker.id;
          }

          // Register out-of-pocket exit
          const desc = funcionarioNome ? `Diária de ${funcionarioNome}` : `Despesa WhatsApp (${categoria.toLowerCase()})`;
          const newExit = await prisma.movimentacao.create({
            data: {
              valor,
              tipo: MovimentacaoTipo.SAIDA,
              categoriaSaida: categoria as CategoriaSaida,
              descricao: desc,
              obraId: targetObra.id,
              socioId, // who paid
              funcionarioId: matchedFuncId,
              tenantId
            }
          });

          // Fetch updated waterfall variables
          const summary = await FinanceService.getObraSummary(targetObra.id);

          return reply.send({
            status: 'success',
            responseText: `💸 *Despesa Registrada! (Adiantamento Sócio)*\n\n` +
              `🏗️ Obra: *${targetObra.nome}*\n` +
              `🏷️ Categoria: *${categoria}*\n` +
              `💸 Valor: *R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n` +
              `👤 Pago por: *${partnerName}* (Reembolso Pendente: R$ ${partnerName === 'Rafael' ? summary.reembolsoPendenteRafael.toLocaleString('pt-BR') : summary.reembolsoPendenteWilson.toLocaleString('pt-BR')})\n` +
              `📝 Info: *${desc}*\n\n` +
              `✅ *Lançamento efetuado!*`
          });
        }

        case 'ADD_CALENDAR': {
          const { obraNome, equipe } = parsed.payload;

          // Find Obra
          const nameSimple = simplifyString(obraNome);
          const obras = await prisma.obra.findMany({ where: { tenantId } });
          const targetObra = obras.find(o => simplifyString(o.nome).includes(nameSimple) || nameSimple.includes(simplifyString(o.nome)));

          if (!targetObra) {
            return reply.send({
              status: 'not_found',
              responseText: `❌ *Obra não encontrada*: Não localizei a obra *"${obraNome}"* para atualizar a agenda.`
            });
          }

          // Find or create employees on the fly
          const resolvedEmployees = [];
          for (const name of equipe) {
            const funcSimple = simplifyString(name);
            const workers = await prisma.funcionario.findMany({ where: { tenantId } });
            let targetWorker = workers.find(w => simplifyString(w.nome).includes(funcSimple) || funcSimple.includes(simplifyString(w.nome)));

            if (!targetWorker) {
              targetWorker = await prisma.funcionario.create({
                data: {
                  nome: name,
                  valorDiariaPadrao: 150.00,
                  tenantId
                }
              });
            }
            resolvedEmployees.push(targetWorker);
          }

          // Today's date object local timezone safe
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Find or create DiaTrabalhado
          let diaTrabalhado = await prisma.diaTrabalhado.findUnique({
            where: {
              data_obraId: {
                data: today,
                obraId: targetObra.id
              }
            }
          });

          if (!diaTrabalhado) {
            diaTrabalhado = await prisma.diaTrabalhado.create({
              data: {
                data: today,
                obraId: targetObra.id
              }
            });
          }

          // Associate workers
          for (const emp of resolvedEmployees) {
            await prisma.diaTrabalhadoFuncionario.upsert({
              where: {
                diaTrabalhadoId_funcionarioId: {
                  diaTrabalhadoId: diaTrabalhado.id,
                  funcionarioId: emp.id
                }
              },
              update: {},
              create: {
                diaTrabalhadoId: diaTrabalhado.id,
                funcionarioId: emp.id
              }
            });
          }

          const equipeListStr = resolvedEmployees.map(e => e.nome).join(', ');

          return reply.send({
            status: 'success',
            responseText: `📅 *Calendário Operacional Atualizado!*\n\n` +
              `🏗️ Obra: *${targetObra.nome}*\n` +
              `👷 Equipe Presente Hoje: *${equipeListStr}*\n` +
              `📆 Data: *${today.toLocaleDateString('pt-BR')}*\n\n` +
              `🔋 *Trabalho registrado com sucesso!*`
          });
        }

        case 'SUMMARY_OBRA': {
          const { obraNome } = parsed.payload;

          // Find Obra
          const nameSimple = simplifyString(obraNome);
          const obras = await prisma.obra.findMany({ where: { tenantId } });
          const targetObra = obras.find(o => simplifyString(o.nome).includes(nameSimple) || nameSimple.includes(simplifyString(o.nome)));

          if (!targetObra) {
            return reply.send({
              status: 'not_found',
              responseText: `❌ *Obra não encontrada*: Não localizei a obra *"${obraNome}"* para emitir o resumo.`
            });
          }

          const summary = await FinanceService.getObraSummary(targetObra.id);

          return reply.send({
            status: 'success',
            responseText: `📊 *RESUMO DE OBRA - WQ SOLAR*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `🏗️ Obra: *${summary.obraNome}*\n` +
              `👤 Cliente: *${summary.cliente}*\n` +
              `📝 Status: *${summary.status}*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `💰 *Valor Contratado:* R$ ${summary.valorFechado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `📥 *Entradas (Faturamento):* R$ ${summary.totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `📤 *Saídas (Custo Total):* R$ ${summary.totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `📈 *Lucro Líquido Parcial:* R$ ${summary.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `🧑‍💻 *CONTROLE DE REEMBOLSOS (Sócios):*\n` +
              `• *Rafael*:\n` +
              `  └ Pago do Bolso: R$ ${summary.gastoSocioRafael.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `  └ Reembolsado: R$ ${summary.reembolsadoRafael.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `  └ *Pendente Reembolso:* R$ ${summary.reembolsoPendenteRafael.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `• *Wilson*:\n` +
              `  └ Pago do Bolso: R$ ${summary.gastoSocioWilson.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `  └ Reembolsado: R$ ${summary.reembolsadoWilson.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `  └ *Pendente Reembolso:* R$ ${summary.reembolsoPendenteWilson.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `👷 *AGENDA OPERACIONAL:*\n` +
              `• Dias Trabalhados: *${summary.diasTrabalhados} dias*\n` +
              `• Equipe Envolvida: _${summary.equipeNomes.join(', ') || 'Nenhum'}_`
          });
        }

        case 'REPORT': {
          const { tipo } = parsed.payload;

          const dashboard = await FinanceService.getGlobalDashboard(tenantId);

          return reply.send({
            status: 'success',
            responseText: `📊 *RELATÓRIO ${tipo} OPERACIONAL*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `🏢 Empresa: *WQ Solar*\n` +
              `📅 Período: *Geral consolidado*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `💰 *Faturamento Total:* R$ ${dashboard.faturamentoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `📉 *Despesas Totais:* R$ ${dashboard.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `📈 *Lucro Líquido:* R$ ${dashboard.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `🏦 *Saldo em Caixa (Disponível):* R$ ${dashboard.saldoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `🏗️ *RESUMO DE PROJETOS:*\n` +
              `• Obras Em Andamento: *${dashboard.obrasEmAndamento}*\n` +
              `• Obras Finalizadas: *${dashboard.obrasFinalizadas}*\n` +
              `👷 Dias de Campo Ativos: *${dashboard.diasTrabalhadosTotal} dias*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `💸 *REEMBOLSOS DE SÓCIOS PENDENTES:*\n` +
              `• *Rafael:* R$ ${dashboard.totalReembolsoPendenteRafael.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `• *Wilson:* R$ ${dashboard.totalReembolsoPendenteWilson.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `📱 _Relatório gerado automaticamente por comando WhatsApp._`
          });
        }

        default:
          return reply.send({
            status: 'invalid',
            responseText: '❓ Comando não suportado no momento.'
          });
      }
    } catch (err: any) {
      console.error('Error executing WhatsApp command:', err);
      return reply.code(500).send({
        status: 'error',
        message: err.message || 'Erro interno ao processar comando.',
        responseText: `❌ *Erro de Sistema*:\nOcorreu um erro interno ao processar o comando. Por favor, tente novamente ou verifique os logs.`
      });
    }
  });
}
