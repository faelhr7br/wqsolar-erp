import { parseWhatsAppMessage } from './nlpParser';

const testCases = [
  {
    msg: "Nova obra João valor 34000",
    expectedType: "CREATE_OBRA",
    assert: (res: any) => res.payload.nome === "joao" && res.payload.valor === 34000
  },
  {
    msg: "Recebido obra João 5000",
    expectedType: "ADD_RECEIPT",
    assert: (res: any) => res.payload.obraNome === "joao" && res.payload.valor === 5000
  },
  {
    msg: "Uber obra João 130",
    expectedType: "ADD_EXPENSE",
    assert: (res: any) => res.payload.categoria === "UBER" && res.payload.obraNome === "joao" && res.payload.valor === 130
  },
  {
    msg: "Diária Victor obra João 150",
    expectedType: "ADD_EXPENSE",
    assert: (res: any) => res.payload.categoria === "DIARIA" && res.payload.funcionarioNome === "victor" && res.payload.obraNome === "joao" && res.payload.valor === 150
  },
  {
    msg: "Material obra João 890",
    expectedType: "ADD_EXPENSE",
    assert: (res: any) => res.payload.categoria === "MATERIAL" && res.payload.obraNome === "joao" && res.payload.valor === 890
  },
  {
    msg: "Hoje obra João com Victor e Carlos",
    expectedType: "ADD_CALENDAR",
    assert: (res: any) => res.payload.obraNome === "joao" && res.payload.equipe.includes("victor") && res.payload.equipe.includes("carlos")
  },
  {
    msg: "Resumo obra João",
    expectedType: "SUMMARY_OBRA",
    assert: (res: any) => res.payload.obraNome === "joao"
  },
  {
    msg: "Relatório semanal",
    expectedType: "REPORT",
    assert: (res: any) => res.payload.tipo === "SEMANAL"
  },
  {
    msg: "Relatório mensal",
    expectedType: "REPORT",
    assert: (res: any) => res.payload.tipo === "MENSAL"
  }
];

function runTests() {
  console.log("🧪 Running NLP WhatsApp Command Parser unit tests...");
  let successCount = 0;

  for (const tc of testCases) {
    const res = parseWhatsAppMessage(tc.msg);
    if (res.type !== tc.expectedType) {
      console.error(`❌ Test failed for message: "${tc.msg}"`);
      console.error(`   Expected type: ${tc.expectedType}, Got: ${res.type}`);
      continue;
    }

    if (!tc.assert(res)) {
      console.error(`❌ Test failed assertion for message: "${tc.msg}"`);
      console.error(`   Payload:`, res.payload);
      continue;
    }

    console.log(`✅ Success: "${tc.msg}" -> parsed as ${res.type}`);
    successCount++;
  }

  console.log(`\n🎉 Results: Passed ${successCount}/${testCases.length} tests successfully!`);
}

runTests();
