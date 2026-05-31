export interface ParsedCommand {
  type: 'CREATE_OBRA' | 'ADD_RECEIPT' | 'ADD_EXPENSE' | 'ADD_CALENDAR' | 'SUMMARY_OBRA' | 'REPORT' | 'INVALID';
  payload: any;
  error?: string;
}

/**
 * Normalizes a string by removing accents and lowercasing
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^\w\s\.,\-]/g, "");   // keep alphanumeric, spaces, and minor marks
}

export function parseWhatsAppMessage(message: string): ParsedCommand {
  if (!message || message.trim() === '') {
    return { type: 'INVALID', payload: {}, error: 'Mensagem vazia' };
  }

  const rawText = message.trim();
  const normalized = normalizeText(rawText);

  // 1. Nova obra [Nome] valor [X]
  // Matches "nova obra joao valor 34000", "nova obra solar joao valor 34000.50"
  let match = normalized.match(/^nova obra ([\w\s\-]+) valor (\d+[\.,]?\d*)$/i);
  if (match) {
    const nome = match[1].trim();
    const valor = parseFloat(match[2].replace(',', '.'));
    return {
      type: 'CREATE_OBRA',
      payload: {
        nome: nome,
        cliente: nome, // fallback client name is the same
        valor
      }
    };
  }

  // 2. Recebido obra [Nome] [X]
  // Matches "recebido obra joao 5000", "recebido obra solar joao 1250.80"
  match = normalized.match(/^recebido obra ([\w\s\-]+) (\d+[\.,]?\d*)$/i);
  if (match) {
    const obraNome = match[1].trim();
    const valor = parseFloat(match[2].replace(',', '.'));
    return {
      type: 'ADD_RECEIPT',
      payload: {
        obraNome,
        valor
      }
    };
  }

  // 3. Diaria [Funcionario] obra [Nome] [X]
  // Matches "diaria victor obra joao 150", "diaria carlos obra joao solar 120"
  match = normalized.match(/^diaria ([\w\s\-]+) obra ([\w\s\-]+) (\d+[\.,]?\d*)$/i);
  if (match) {
    const funcionarioNome = match[1].trim();
    const obraNome = match[2].trim();
    const valor = parseFloat(match[3].replace(',', '.'));
    return {
      type: 'ADD_EXPENSE',
      payload: {
        obraNome,
        valor,
        categoria: 'DIARIA',
        funcionarioNome
      }
    };
  }

  // 4. [Categoria] obra [Nome] [X]
  // Matches "uber obra joao 130", "material obra joao solar 890", "alimentacao obra joao 45"
  match = normalized.match(/^(uber|alimentacao|material|combustivel|ferramentas|hospedagem|outros) obra ([\w\s\-]+) (\d+[\.,]?\d*)$/i);
  if (match) {
    const categoria = match[1].toUpperCase();
    const obraNome = match[2].trim();
    const valor = parseFloat(match[3].replace(',', '.'));
    return {
      type: 'ADD_EXPENSE',
      payload: {
        obraNome,
        valor,
        categoria
      }
    };
  }

  // 5. Hoje obra [Nome] com [Lista de Nomes separated by 'e', ',' or spaces]
  // Matches "hoje obra joao com victor e carlos"
  match = normalized.match(/^hoje obra ([\w\s\-]+) com ([\w\s\-e,]+)$/i);
  if (match) {
    const obraNome = match[1].trim();
    const equipeRaw = match[2];
    
    // Split the team list by comma, "e", or space and clean up
    const equipe = equipeRaw
      .split(/,|\be\b/)
      .map(n => n.trim())
      .filter(n => n.length > 0 && n !== 'e');

    return {
      type: 'ADD_CALENDAR',
      payload: {
        obraNome,
        equipe
      }
    };
  }

  // 6. Resumo obra [Nome]
  // Matches "resumo obra joao"
  match = normalized.match(/^resumo obra ([\w\s\-]+)$/i);
  if (match) {
    const obraNome = match[1].trim();
    return {
      type: 'SUMMARY_OBRA',
      payload: {
        obraNome
      }
    };
  }

  // 7. Relatorio semanal / Relatorio mensal
  if (normalized === 'relatorio semanal') {
    return {
      type: 'REPORT',
      payload: { tipo: 'SEMANAL' }
    };
  }
  if (normalized === 'relatorio mensal') {
    return {
      type: 'REPORT',
      payload: { tipo: 'MENSAL' }
    };
  }
  if (normalized === 'relatorio anual') {
    return {
      type: 'REPORT',
      payload: { tipo: 'ANUAL' }
    };
  }

  return {
    type: 'INVALID',
    payload: { originalText: rawText },
    error: 'Comando não reconhecido pelo assistente solar.'
  };
}
