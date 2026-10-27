# CampoLivre — plano do projeto

## Escopo e origem

Este arquivo reúne os requisitos acordados do produto e registra o que a demonstração implementa hoje e o que ainda falta para uso operacional. O histórico de definição do escopo está em [entrevista.md](../.scratch/campo-livre/entrevista.md). Em 2026-09-29, o usuário encerrou a entrevista e autorizou construir a navegação pelo mapa e os fluxos descritos abaixo. A demonstração está implementada; isso não significa que os requisitos futuros de um sistema operacional multiusuário estejam concluídos.

## Estado da demonstração

- O acesso demonstrativo apresenta campos de e-mail e senha e uma opção para explorar sem preencher dados; qualquer uma dessas opções abre o hub sem autenticação real.
- O mapa usa Three.js/WebGL e cinco capturas de referência do Google Earth alinhadas. No desktop, oferece zoom pela roda do mouse, arrasto, rotação pelo botão direito e seletor 2D/3D, sem barra de botões de zoom/rotação e com cartões de resumo compactos. No mobile, inicia em 2D, usa menu compacto e adapta o enquadramento à orientação do aparelho; não é um modelo georreferenciado completo e não usa fotogrametria.
- A navegação permite consultar áreas, equipes, equipamentos e histórico de manutenção.
- No perfil Técnico, a descrição da execução é obrigatória e fotos são opcionais, até duas de 500 KB cada. No perfil Supervisor, o registro pode ser aprovado ou devolvido com motivo. O técnico pode complementar e reenviar, preservando os relatos anteriores.
- Preventivas aprovadas são filtradas pelo mês da data de execução.
- A tela Indicadores está implementada e validada nesta retomada de 2026-10-01: build com TypeScript, 23 testes do modelo em quatro arquivos, quatro E2E específicos do painel e os 26 cenários de navegador em grupos e repetições passaram.
- Dados e histórico ficam em persistência local no navegador e são demonstrativos, com nomes operacionais fictícios. Não há autenticação real, backend, sincronização nem compartilhamento multiusuário entre dispositivos.

Os cadastros e a organização de equipes também estão disponíveis na demonstração local; os detalhes e limites desses recursos estão na seção [Cadastros locais, equipes e edição do mapa](#cadastros-locais-equipes-e-edição-do-mapa).

O cumprimento desses itens descreve a apresentação local, não satisfaz por si só os requisitos de permissões efetivas, compartilhamento remoto ou operação em campo descritos adiante.

## Cadastros locais, equipes e edição do mapa

### Comportamento demonstrado

- O Administrador simulado mantém cadastros locais de áreas, colaboradores e equipamentos, com edição, busca, filtro por situação e inativação ou reativação. As associações e registros históricos são preservados ao inativar.
- O cadastro de colaborador separa cargo profissional e perfil de acesso. Um colaborador pode ser associado a uma equipe ou ficar sem equipe.
- O Supervisor simulado organiza a própria equipe, selecionando colaboradores ativos e definindo sua área designada. A área designada representa responsabilidade de trabalho, não localização física ou rastreamento.
- O Administrador simulado pode mover, ocultar e restaurar marcadores no mapa e adicionar áreas e equipes pelo editor. O Supervisor pode mover, ocultar e restaurar somente o marcador da própria equipe. A posição do marcador pode ser definida separadamente da área designada.
- As alterações são salvas no armazenamento local deste navegador. Os dados iniciais são exemplos fictícios e os perfis simulados não concedem permissões efetivas.

### Limites para uso operacional

Autenticação, autorização efetiva, backend e sincronização entre usuários e dispositivos continuam pendentes. Esta demonstração não confirma cadastros, equipes, posições ou vínculos institucionais reais.

## Mapa operacional e navegação por áreas

Escopo autorizado pelo usuário em 2026-09-29, sem novas perguntas nesta etapa.

### Objetivo

Fazer do mapa operacional a página principal após o login (3D no desktop e 2D no mobile), permitindo navegar pelas áreas da planta e consultar suas informações, equipes, equipamentos e histórico de manutenção.

### Requisitos

- Após entrar na demonstração, o usuário deve chegar ao mapa (3D no desktop e 2D no mobile) e conseguir identificar e selecionar as áreas representadas.
- Selecionar uma área deve abrir sua página, com informações sobre o local, equipes associadas e equipamentos instalados.
- A página da área deve permitir consultar os equipamentos e acessar seus históricos de manutenção. Os relatos precisam continuar disponíveis para consulta por outros técnicos, preservando o conhecimento entre intervenções.
- O fluxo de registro, devolução, reenvio e aprovação deve seguir as regras de execução e indicadores já acordadas neste plano.
- As equipes devem preservar a distinção entre área designada e local da atividade em andamento; sua representação não indica rastreamento em tempo real.

### Referência visual e limites da demonstração

- O usuário forneceu cinco capturas da CSN como referência visual solicitada para o mapa desta demonstração. O mapa demonstrativo combina capturas de referência do Google Earth alinhadas.
- Essa orientação substitui a escolha anterior de usar uma planta fictícia. Não confirma vínculo institucional, piloto autorizado, precisão cadastral do mapa nem acesso a dados operacionais reais da CSN.
- O CampoLivre mantém marca própria e propósito de atender empresas de diferentes setores. A referência visual desta demonstração não torna o produto exclusivo da CSN.
- A demonstração usa dados simulados e persistência local. A consulta ao mesmo histórico pelos perfis da demonstração não equivale a compartilhamento remoto entre usuários ou dispositivos. O mapa não tem volumes de construções; não há modelo 3D georreferenciado completo nem fotogrametria.
- Autenticação real, backend, permissões efetivas e sincronização entre usuários continuam necessários para uso operacional. Modo automático para TV, funcionamento offline, checklists e automações com IA permanecem na direção futura, sem inclusão automática nesta entrega.

### Comportamento demonstrado

- Após o login demonstrativo, o mapa é a entrada para a navegação operacional.
- O usuário seleciona uma área no mapa, consulta informações, equipes e equipamentos e consegue voltar ao mapa.
- Ao consultar um equipamento, encontra seu histórico e identifica o técnico, a data, o relato e a situação de aprovação de cada execução.
- Um relato salvo continua consultável ao navegar entre áreas e equipamentos; os perfis da demonstração consultam o mesmo histórico local.
- Os dados simulados e os limites de compartilhamento são identificados, sem alegação de operação real ou vínculo institucional com a CSN.

### Requisitos para uma entrega operacional futura

Os critérios acima descrevem os fluxos locais da demonstração. Para uso operacional, ainda será necessário implementar autenticação, permissões efetivas, persistência em backend e sincronização segura entre usuários e dispositivos. A precisão cadastral e a georreferenciação da planta, bem como a fonte e o processo de atualização do modelo do mapa, também permanecem por definir; a referência visual atual não promete um modelo 3D georreferenciado.

## Histórico de manutenção e localização de equipamentos

Solicitado pelo usuário em 2026-09-27.

### Objetivo

Permitir que técnicos em campo registrem tudo o que fizeram e alteraram em um equipamento, preservando esse conhecimento para facilitar as próximas manutenções. Permitir também encontrar o equipamento no mapa, com referências que ajudem a chegar ao local correto.

### Requisitos

- O técnico deve conseguir registrar, por equipamento, os serviços executados e as intervenções realizadas, incluindo o que foi inspecionado, ajustado, reparado, substituído ou modificado, além de observações e pendências.
- Cada registro deve ficar salvo e vinculado ao equipamento, com identificação do técnico e data da intervenção, formando um histórico consultável ao longo do tempo.
- Outros técnicos devem conseguir acessar o histórico do equipamento para entender intervenções anteriores e dar continuidade à manutenção.
- O equipamento deve ter uma localização consultável no mapa, acompanhada de descrição do local e pontos de referência, como área, setor, andar ou referências visuais, conforme aplicável.
- Ao localizar um equipamento no mapa, o técnico deve conseguir acessar seus registros de manutenção.

### Critérios de aceitação

- Um técnico registra uma intervenção em um equipamento e, ao voltar a consultá-lo, encontra o registro salvo.
- Outro técnico com acesso ao equipamento consegue consultar essa intervenção, identificar quem a realizou e quando, e compreender o que foi feito ou alterado.
- O técnico encontra o equipamento no mapa e consulta as referências necessárias para reconhecer seu local físico.
- Novas intervenções são acrescentadas ao histórico, preservando a consulta às anteriores.

### Pontos a detalhar

Permissões efetivas de consulta e edição, correção de registros, formatos e limites de fotos para uso operacional, outros anexos, funcionamento offline e forma de cadastrar ou atualizar a posição do equipamento no mapa continuam a detalhar. A demonstração pode usar posições e dados predefinidos sem encerrar essas decisões. Fotos serão opcionais inicialmente, conforme os requisitos de registro de execução abaixo.

## Registro de execução e indicadores do supervisor

Direção aprovada pelo usuário em 2026-09-29.

### Processo atual relatado

As tarefas e os retornos sobre a execução são comunicados por conversa e WhatsApp. O usuário acredita que somente o supervisor tem acesso às planilhas, aos dados dos equipamentos e às métricas das equipes; a ausência de acesso dos técnicos ainda precisa ser confirmada.

### Objetivo

Permitir que o técnico registre a execução uma única vez no CampoLivre e que esse mesmo registro alimente o histórico de manutenção do equipamento e os indicadores acompanhados pelo supervisor.

### Requisitos

- O registro de execução deve vincular o trabalho realizado à atividade, ao equipamento atendido e ao técnico que o registrou, com a data da intervenção.
- A descrição do trabalho realizado é obrigatória e deve incluir as alterações no equipamento e eventuais pendências, quando houver. Fotos são opcionais inicialmente.
- O mesmo registro deve compor o histórico de manutenção e fornecer os dados para o acompanhamento da execução pelo supervisor, sem exigir um segundo preenchimento dessas informações.
- O técnico informa a execução, mas a atividade só pode ser considerada concluída após aprovação do supervisor. O histórico e o acompanhamento devem distinguir conclusão aguardando aprovação, atividade devolvida para correção e conclusão aprovada.
- Quando não aprovar, o supervisor deve devolver a atividade para correção com um motivo obrigatório. O técnico pode complementar o relato e reenviar para aprovação, preservando os registros anteriores.
- Enquanto devolvida para correção, a atividade aguarda ação do técnico. Após o reenvio, volta a aguardar aprovação do supervisor.
- Os indicadores devem ser calculados a partir dos registros de execução, sem preenchimento duplicado. As preventivas entram na contagem de concluídas somente após aprovação do supervisor, no período da execução, e as que aguardam aprovação aparecem separadamente no painel.
- Complementos e reenvios da mesma atividade não representam novas manutenções: a preventiva é contabilizada uma vez quando aprovada. A aprovação posterior pode atualizar o total de um período anterior.

### Critérios de aceitação

- Após salvar um registro de execução, o técnico consegue consultá-lo no histórico do equipamento e o supervisor consegue consultar os mesmos dados no acompanhamento da atividade.
- O técnico não consegue enviar um registro de execução sem a descrição do trabalho realizado, mas consegue enviá-lo sem fotos. Equipamento, técnico e data da intervenção permanecem vinculados ao registro.
- O envio do relato pelo técnico mantém a conclusão aguardando aprovação. A atividade só passa a ser considerada concluída quando o supervisor a aprova.
- O registro no histórico continua consultável enquanto a conclusão aguarda aprovação, com essa situação identificada.
- O supervisor não consegue devolver a atividade para correção sem informar um motivo. O técnico consegue consultar esse motivo, complementar o relato e reenviar, mantendo os registros anteriores consultáveis.
- Uma atividade devolvida não aparece como aguardando aprovação até que o técnico a reenvie, e permanece fora da contagem de preventivas concluídas.
- O supervisor não precisa transcrever o relato do técnico para que ele seja utilizado nos indicadores.
- Uma preventiva executada em 30/09 e aprovada em 02/10 entra na contagem de setembro somente após a aprovação. Antes disso, enquanto aguarda aprovação, aparece separadamente no painel.
- A aprovação de uma preventiva após complementos e reenvios acrescenta uma única manutenção ao total, sem contar cada relato como uma nova preventiva.

### Pontos a detalhar

- Como tratar a atividade quando a execução é parcial ou restam pendências, além de registrá-las na descrição obrigatória.
- Qual data de execução usar quando o trabalho se estende por vários dias.
- Como tratar cancelamentos, correções e reaberturas após aprovação e seus efeitos nos indicadores.

## Acesso de técnicos e auxiliares

Direção aprovada pelo usuário em 2026-09-30; permissões efetivas ainda não estão implementadas.

- Cargo profissional e perfil de acesso são conceitos separados. Técnicos e Auxiliares de Manutenção podem consultar equipamentos e históricos para conhecer serviços anteriores e pendências e ajudar os técnicos a se prepararem para as atividades. O perfil de execução do Técnico permite registrar contribuições de trabalho; essa consulta por auxiliares não cria um novo perfil nem altera as permissões de execução.
- O perfil de execução não permite aprovar ou devolver conclusões, manter cadastros nem administrar equipes. O Supervisor aprova ou devolve conclusões e acompanha a equipe; o Líder monitora a equipe; o Administrador mantém os cadastros.
- Os direitos já existentes de técnicos e auxiliares para consultar históricos devem ser mantidos. O painel gerencial Indicadores fica disponível na demonstração para Administrador, Supervisor e Líder. Técnico e Auxiliar com perfil Técnico que tentem acessar `/indicadores` recebem orientação para consultar equipamentos, sem gráficos.
- A demonstração atual não tem identidade autenticada nem delimitação real de registros próprios ou da equipe. A visão dos gestores é geral nesta demonstração, sem isolamento efetivo por equipe. As restrições visuais não são segurança de servidor; autorização efetiva é futura e não está implementada.

## Painel de indicadores — demonstração implementada

Direção aprovada pelo usuário em 2026-09-30. Administrador, Supervisor e Líder podem consultar o painel gerencial. Técnico e Auxiliar com perfil Técnico recebem orientação para consultar equipamentos se acessarem `/indicadores`, sem gráficos. A visão dos gestores é geral na demonstração; não há isolamento real por equipe nem autorização de servidor.

O painel oferece filtros de mês, área e tipo de manutenção. Seus quatro cartões mostram preventivas aprovadas, total de execuções aprovadas com corretivas e inspeções detalhadas, itens aguardando aprovação e itens devolvidos para correção. A evolução mensal inclui o período selecionado e os cinco anteriores; a composição apresenta os registros por situação. Também há contagens por área e registros do período com acesso ao detalhe.

Os valores vêm dos registros existentes, sem séries gráficas fictícias. A aprovação posterior atualiza o mês da execução; complementos e reenvios da mesma atividade contam uma única vez. As contagens por área usam as associações atuais do cadastro, sem fotografia histórica das mudanças de área. O histórico vinculado a equipamentos ou áreas inativos também permanece consultável e incluído nos cálculos.

O modelo atual não registra programações com datas previstas nem medições de duração. Portanto, atrasos e percentual de cumprimento de preventivas, assim como MTTR, dependem de dados e regras futuras e não fazem parte deste painel nesta rodada.

Na retomada de 2026-10-01, build e verificação TypeScript passaram, assim como 23 testes do modelo distribuídos em quatro arquivos. Os quatro E2E do painel (três em `tests/indicators.spec.ts` e um em `tests/indicators-history.spec.ts`) cobrem filtros de mês/área/tipo, leitura acessível dos gráficos, estado vazio, perfis gerenciais e Técnico/Auxiliar, consulta ao histórico para preparar o atendimento sem aprovar ou devolver atividades, persistência, fluxo envio→devolução→reenvio→aprovação sem duplicar atividade, aprovação em outubro contabilizada em setembro e navegação responsiva sem overflow ou sobreposição a 320, 360 e 390 px. Todos os 26 cenários de navegador foram validados em grupos e repetições; não se trata de uma única execução completa. A rolagem da tabela mantém os rótulos auxiliares acessíveis dentro do contêiner. O cenário de introdução foi ajustado para verificar o overlay e os estados `aria-busy`/`inert`, em vez de depender de uma espera fixa.
