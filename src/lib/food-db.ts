// Internal base of common Brazilian foods. Values per 100 g are approximate
// averages for organization only. Format: name|kcal|prot|carb|gord|measures
// measures: key:grams separated by commas (see MEASURE_LABELS).
export type FoodMeasure = { label: string; grams: number };
export type Food = { id: string; name: string; per100: { kcal: number; prot: number; carb: number; gord: number }; measures: FoodMeasure[]; custom?: boolean };

export const MEASURE_LABELS: Record<string, string> = {
  un: "1 unidade", fatia: "1 fatia", cs: "1 colher de sopa", cc: "1 colher de chá", concha: "1 concha",
  copo: "1 copo (200 ml)", xic: "1 xícara", esc: "1 escumadeira", ped: "1 pedaço", file: "1 filé",
  prato: "1 prato", pote: "1 pote", lata: "1 lata", porcao: "1 porção",
};

const RAW = `Arroz branco cozido|128|2.5|28.1|0.2|esc:90,cs:25,concha:120
Arroz integral cozido|124|2.6|25.8|1|esc:90,cs:25,concha:120
Arroz parboilizado cozido|123|2.5|27|0.3|esc:90,cs:25
Feijão carioca cozido|76|4.8|13.6|0.5|concha:140,cs:20
Feijão preto cozido|77|4.5|14|0.5|concha:140,cs:20
Feijão branco cozido|102|6.7|18|0.4|concha:140,cs:20
Feijoada|117|8.7|11.6|6.5|concha:200,prato:350
Lentilha cozida|93|6.3|16.3|0.5|concha:140,cs:20
Grão-de-bico cozido|164|8.9|27.4|2.6|concha:140,cs:20
Ervilha cozida|74|5.4|13.4|0.4|cs:20
Soja cozida|151|14|11|7|cs:20
Macarrão cozido|158|5.8|30.9|0.9|prato:200,esc:110
Macarrão integral cozido|124|5.3|26.5|0.5|prato:200,esc:110
Lasanha à bolonhesa|160|8|14|8|ped:250
Nhoque|133|3|28|0.7|prato:200
Cuscuz de milho|113|2.2|25.3|0.7|fatia:100,cs:30
Farofa pronta|406|2.1|80|9|cs:15
Farinha de mandioca|361|1.6|87.9|0.3|cs:16
Tapioca (goma)|240|0|60|0|un:70
Polenta cozida|70|1.6|15|0.3|fatia:100
Purê de batata|102|1.9|16|3.5|cs:45,concha:150
Batata inglesa cozida|52|1.2|11.9|0|un:140,cs:30
Batata frita|267|5|35.6|13.1|porcao:100
Batata-doce cozida|77|0.6|18.4|0.1|un:150,fatia:40
Mandioca cozida|125|0.6|30.1|0.3|ped:100
Mandioca frita|300|1.4|50|11|porcao:100
Inhame cozido|97|2|23|0.1|ped:100
Pão francês|300|8|58.6|3.1|un:50
Pão de forma|253|12|44|3.7|fatia:25
Pão integral|253|9.4|49.9|3.7|fatia:25
Pão de queijo|363|5.1|34.2|24.6|un:40
Pão sírio|275|9|56|1.2|un:60
Torrada|380|10.6|74|3.6|un:10
Bolacha cream cracker|432|10|68.7|14.4|un:6
Biscoito recheado|472|6.4|70.5|19.6|un:15
Biscoito maisena|443|8|75|12|un:5
Bolo simples|311|5.6|50|10|fatia:60
Bolo de chocolate|410|6.2|54.7|18.5|fatia:70
Aveia em flocos|394|13.9|66.6|8.5|cs:15
Granola|420|10|64|14|cs:15
Cereal matinal|380|7|84|1.5|xic:30
Milho verde cozido|98|3.2|17|2.4|cs:20,un:100
Pipoca|448|9.9|78|15.9|xic:10
Frango grelhado (peito)|159|32|0|2.5|file:120
Frango cozido (peito)|163|31.5|0|3.2|file:120
Coxa de frango assada|215|28|0|11|un:100
Sobrecoxa de frango assada|233|29|0|12.5|un:110
Frango desfiado|163|31.5|0|3.2|cs:25
Asa de frango assada|266|27|0|17|un:40
Carne moída refogada|212|26.7|0|10.9|cs:30
Patinho grelhado|219|35.9|0|7.3|file:100
Alcatra grelhada|241|31.9|0|11.6|file:100
Contrafilé grelhado|278|32|0|15.5|file:120
Picanha grelhada|289|26.4|0|19.6|fatia:100
Fraldinha assada|260|29|0|15|fatia:100
Maminha assada|230|30|0|11|fatia:100
Costela bovina assada|373|28|0|28|ped:150
Acém cozido|215|27|0|11|ped:100
Músculo cozido|194|31|0|7|ped:100
Fígado bovino grelhado|225|29.9|4.2|9|file:100
Carne de sol|260|31|0|14|ped:100
Charque cozido|263|36|0|12|ped:50
Bife à milanesa|272|19|10|17|file:120
Almôndega|220|14|8|14|un:30
Hambúrguer bovino|255|17|3|19|un:90
Pernil suíno assado|262|32|0|13.9|fatia:100
Lombo suíno assado|210|35.7|0|6.4|fatia:80
Bisteca suína grelhada|311|28.9|0|20.8|un:120
Costelinha suína assada|402|30|0|30|ped:150
Linguiça toscana grelhada|296|23|0|21|un:80
Linguiça calabresa|296|16|1|25|fatia:10,un:100
Bacon frito|541|37|1.4|42|fatia:10
Salsicha|257|11.5|3|22|un:50
Presunto|94|14|1.5|3|fatia:15
Peito de peru|100|18|2|1.8|fatia:15
Mortadela|269|12|5.8|21.6|fatia:15
Salame|398|26|1|32|fatia:5
Tilápia grelhada|128|26|0|2.7|file:120
Salmão grelhado|229|23.9|0|14|file:120
Sardinha em lata|285|24|0|21|lata:85
Atum em lata (água)|116|25.5|0|0.8|lata:120,cs:20
Atum em lata (óleo)|198|29|0|8|lata:120,cs:20
Merluza cozida|122|26.6|0|0.9|file:100
Pescada frita|223|27|5|10|file:100
Camarão cozido|99|21|0|1.1|cs:20,porcao:100
Bacalhau cozido|140|30|0|1.5|ped:100
Ovo de galinha cozido|146|13.3|0.6|9.5|un:50
Ovo frito|240|15.6|1.2|18.6|un:50
Ovo mexido|170|11|2|13|un:60
Omelete|154|10.6|1|11.7|un:120
Clara de ovo cozida|52|11|0.7|0.2|un:30
Leite integral|61|3.2|4.7|3.3|copo:200,xic:240
Leite desnatado|35|3.4|5|0.1|copo:200,xic:240
Leite semidesnatado|46|3.3|4.8|1.6|copo:200
Leite em pó integral|497|25.4|39.2|26.9|cs:15
Iogurte natural|61|3.5|4.7|3.3|pote:170
Iogurte grego|120|5|12|6|pote:100
Iogurte de frutas|90|3|14|2.5|pote:170
Bebida láctea|76|2.4|12|1.9|copo:200
Queijo muçarela|300|22.6|3|22|fatia:20
Queijo minas frescal|264|17.4|3.2|20.2|fatia:30
Queijo prato|360|22.7|1.9|29.1|fatia:20
Queijo parmesão|453|35.6|1.7|33.5|cs:10
Queijo cottage|98|11|3.4|4.3|cs:30
Ricota|140|12.6|3.8|8.1|fatia:30
Requeijão|257|9.6|2.4|23.4|cs:30
Cream cheese|342|6|4|34|cs:30
Manteiga|726|0.4|0|82.4|cc:5,cs:10
Margarina|596|0|0|67.4|cc:5,cs:10
Creme de leite|221|1.5|4.5|22.5|cs:15
Leite condensado|313|7.7|57|6.7|cs:20
Azeite de oliva|884|0|0|100|cs:13,cc:4
Óleo de soja|884|0|0|100|cs:13,cc:4
Maionese|302|0.6|7.9|30.5|cs:15
Ketchup|112|1.2|26|0.2|cs:15
Mostarda|66|4|6|3|cs:15
Açúcar|387|0|99.5|0|cc:5,cs:15
Mel|309|0|84|0|cs:20
Doce de leite|306|5.5|55|7|cs:20
Geleia de frutas|250|0.3|65|0.1|cs:20
Chocolate ao leite|540|7.2|59.6|30.3|ped:25,un:90
Chocolate meio amargo|475|4.9|62.4|29.9|ped:25
Achocolatado em pó|401|4.2|91|2.2|cs:15
Pasta de amendoim|588|25|20|50|cs:15
Amendoim torrado|606|27|20|50|cs:15
Castanha-do-pará|643|14.5|15.1|63.5|un:4
Castanha de caju|570|18.5|29|46|un:2
Nozes|620|14|18|59|un:5
Amêndoas|581|18.6|29.5|47.3|un:1.2
Chia|490|16.5|42|31|cs:10
Linhaça|495|14|43|32|cs:10
Banana prata|98|1.3|26|0.1|un:70
Banana nanica|92|1.4|23.8|0.1|un:90
Maçã|56|0.3|15.2|0|un:130
Pera|53|0.6|14|0.1|un:130
Laranja|46|1|11.5|0.1|un:180
Mexerica|37|0.7|9.3|0.1|un:135
Limão|32|0.9|11|0.1|un:60
Mamão papaia|40|0.5|10.4|0.1|fatia:150,un:300
Manga|64|0.4|16.7|0.3|un:200,fatia:80
Abacaxi|48|0.9|12.3|0.1|fatia:75
Melancia|33|0.9|8.1|0|fatia:200
Melão|29|0.7|7.5|0|fatia:150
Uva|53|0.7|13.6|0.2|xic:150,un:5
Morango|30|0.9|6.8|0.3|un:12,xic:150
Abacate|96|1.2|6|8.4|cs:30,un:400
Kiwi|51|1.3|11.5|0.6|un:75
Goiaba|54|1.1|13|0.4|un:170
Maracujá|68|2|12.3|2.1|un:45
Pêssego|36|0.8|9.3|0|un:110
Ameixa|53|0.8|13.9|0|un:50
Caqui|71|0.4|19.3|0.1|un:150
Coco ralado|592|5.5|10|57|cs:10
Açaí (polpa com xarope)|247|2|36|11|xic:200
Uva-passa|299|3|79|0.5|cs:15
Alface|11|1.3|1.7|0.2|prato:50,un:10
Tomate|15|1.1|3.1|0.2|un:100,fatia:15
Cenoura crua|34|1.3|7.7|0.2|un:100,cs:12
Cenoura cozida|30|0.8|6.7|0.2|cs:25
Pepino|10|0.9|2|0|fatia:10,un:200
Repolho|17|0.9|3.9|0.1|cs:15,xic:70
Couve refogada|90|1.7|8.7|6.6|cs:20
Brócolis cozido|25|2.1|4.4|0.5|cs:25,xic:90
Couve-flor cozida|19|1.2|3.9|0.3|cs:25
Abobrinha refogada|30|1.1|4|1.5|cs:25
Abóbora cozida|20|0.8|4.8|0.1|cs:30
Chuchu cozido|19|0.4|4.8|0|cs:25
Beterraba cozida|32|1.3|7.2|0.1|cs:20,fatia:15
Berinjela refogada|35|1|5|1.5|cs:25
Espinafre refogado|67|2.7|4.2|5.4|cs:25
Rúcula|13|1.8|2.2|0.1|prato:30
Agrião|17|2.7|2.3|0.2|prato:30
Vagem cozida|25|1.2|5.3|0.3|cs:20
Quiabo cozido|22|1.9|4.5|0.3|cs:25
Pimentão|21|1|4.9|0.2|un:150
Cebola|39|1.7|8.9|0.1|un:100,cs:15
Alho|113|7|23.9|0.2|un:4
Palmito|23|2.5|4.3|0.5|un:30
Cogumelo champignon|25|2|4|0.3|cs:15
Salada de legumes|50|1.5|8|1.5|prato:150
Sopa de legumes|40|1.5|6|1|concha:200,prato:300
Caldo de feijão|60|3.5|9|1|concha:150
Canja de galinha|60|4|7|1.5|concha:200,prato:300
Pizza de muçarela|280|12|30|12|fatia:100
Pizza de calabresa|295|13|29|14|fatia:100
Hambúrguer (sanduíche)|255|13|28|10|un:200
Cachorro-quente|250|9|26|12|un:150
Misto quente|280|14|26|13|un:100
Coxinha|283|9|30|14|un:80
Pastel frito|330|8|30|20|un:80
Esfirra de carne|280|11|35|10|un:80
Quibe frito|255|12|17|15|un:60
Empada|380|8|35|23|un:50
Kibe assado|190|14|15|8|ped:100
Tapioca com queijo|260|8|40|7|un:120
Crepioca|180|11|15|8|un:100
Panqueca de carne|190|10|17|9|un:120
Strogonoff de frango|155|14|4|9|concha:150
Strogonoff de carne|170|14|4|11|concha:150
Escondidinho de carne|140|8|13|6|porcao:250
Moqueca de peixe|120|13|3|6|concha:200
Baião de dois|160|6|22|5|esc:120
Arroz carreteiro|180|9|20|7|esc:120
Galinhada|170|10|19|6|esc:150
Yakisoba|130|7|17|4|prato:300
Sushi|150|5|28|1.5|un:30
Temaki|170|6|26|4.5|un:150
Batata chips|536|7|53|35|porcao:25
Sorvete de creme|200|3.5|24|10|cs:30,xic:130
Pudim de leite|235|5.5|37|7|fatia:100
Brigadeiro|390|3.5|60|15|un:20
Paçoca|490|15|55|24|un:20
Gelatina|60|1.5|14|0|pote:120
Barra de cereal|380|5|70|9|un:25
Whey protein|380|78|8|5|cs:30
Suco de laranja natural|45|0.7|10.4|0.2|copo:200
Suco de uva integral|65|0.3|16|0|copo:200
Suco em pó preparado|30|0|7.5|0|copo:200
Refrigerante|42|0|10.6|0|copo:200,lata:350
Refrigerante zero|1|0|0|0|copo:200,lata:350
Água de coco|22|0|5.3|0|copo:200
Café sem açúcar|2|0.1|0.3|0|copo:50,xic:200
Café com leite|38|2|4|1.6|xic:200
Cappuccino|60|2|9|2|xic:200
Chá sem açúcar|1|0|0.2|0|xic:200
Cerveja|41|0.3|3.3|0|copo:300,lata:350
Vinho tinto|85|0.1|2.6|0|copo:150
Isotônico|26|0|6.4|0|copo:500
Vitamina de banana|90|3|15|2|copo:300
Leite de soja|42|3|3|2|copo:200
Leite de amêndoas|17|0.5|0.6|1.4|copo:200
Molho de tomate|38|1.4|7.6|0.4|cs:20
Requeijão light|180|11|4|13|cs:30
Queijo coalho|330|22|3|26|un:60
Tofu|76|8|1.9|4.8|ped:100
Proteína de soja hidratada|110|16|9|0.5|cs:25
Hummus|166|8|14|9.6|cs:30
Torta salgada|260|8|25|14|fatia:120
Salada de frutas|60|0.7|15|0.2|xic:200
Mingau de aveia|90|3.5|14|2.3|prato:250
Arroz doce|160|3.5|30|3|cs:40
Canjica|130|3|24|2.5|concha:150`;

const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const FOODS: Food[] = RAW.split("\n").map((line) => {
  const [name = "", kcal = "0", prot = "0", carb = "0", gord = "0", measures = ""] = line.split("|");
  return {
    id: slug(name), name,
    per100: { kcal: +kcal, prot: +prot, carb: +carb, gord: +gord },
    measures: (measures ?? "").split(",").filter(Boolean).map((m) => { const [k = "", g = "0"] = m.split(":"); return { label: MEASURE_LABELS[k] ?? k, grams: +g }; }),
  };
});

export const normalizeSearch = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function searchFoods(query: string, extra: Food[] = [], limit = 8) {
  const q = normalizeSearch(query);
  if (!q) return [];
  const words = q.split(/\s+/);
  return [...extra, ...FOODS]
    .map((f) => ({ f, n: normalizeSearch(f.name) }))
    .filter(({ n }) => words.every((w) => n.includes(w)))
    .sort((a, b) => Number(!a.n.startsWith(q)) - Number(!b.n.startsWith(q)) || a.n.length - b.n.length)
    .slice(0, limit).map(({ f }) => f);
}

const r1 = (n: number) => Math.round(n * 10) / 10;
export function foodMacros(food: Pick<Food, "per100">, grams: number) {
  const k = Math.max(0, grams) / 100;
  return { kcal: Math.round(food.per100.kcal * k), prot: r1(food.per100.prot * k), carb: r1(food.per100.carb * k), gord: r1(food.per100.gord * k) };
}
