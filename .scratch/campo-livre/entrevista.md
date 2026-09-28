# CampoLivre — entrevista em andamento

## Estado

Primeira rodada respondida em 2026-09-26. O usuário priorizou somente a estrutura do projeto e uma página inicial de login para apresentar ao grupo. Mapa e fluxos operacionais permanecem para etapas futuras. Termos resolvidos registrados em CONTEXT.md; organização inicial dos mantenedores registrada em docs/governanca.md. Não repetir as cinco perguntas iniciais na próxima retomada.

## Ideia apresentada pelo usuário

CampoLivre é um projeto open source colaborativo de gestão de manutenção e equipes de campo. A visão inclui painel para gestores, aplicativo para técnicos, ordens de serviço, checklists, fotos, funcionamento offline e automações com IA.

O organizador não tem disponibilidade para centralizar revisões e decisões. Pretende reunir dois ou três mantenedores voluntários, responsáveis por áreas e colaboradores, incluindo iniciantes. As frentes propostas são produto, liderança técnica, design, frontend, backend e banco de dados, mobile, DevOps, QA, IA, segurança e documentação.

A ideia visual é um mapa animado em 3D da empresa (a CSN foi citada como contexto do usuário). Clicar em uma área abre uma visão detalhada com pendências, números e equipamentos instalados. Equipes também seriam representadas com animação 3D. A apresentação deve ser lúdica, potencialmente exibida em uma TV, permitindo que equipes consultem atividades do dia e seus locais.

Não há confirmação de vínculo institucional do projeto, autorização para piloto ou acesso a dados reais da CSN.

## Perguntas da primeira rodada — histórico

1. **Primeiro uso real:** quem usaria a primeira versão, qual tarefa deveria conseguir concluir melhor e como esse trabalho é organizado hoje?
   - Recomendação apresentada: uma equipe de manutenção em uma área delimitada; consultar atividades do dia, identificar equipamento e registrar execução.
2. **Papel do mapa:** acompanhar indicadores na TV ou operar o sistema, abrindo equipamentos e ordens de serviço?
   - Recomendação apresentada: mapa interativo para navegar por áreas e equipamentos, com modo automático para TV; validar a navegação antes de detalhar animações das equipes.
3. **Significado das equipes no mapa:** localização física, área designada ou local da atividade em andamento?
   - Recomendação apresentada: área da atividade em execução, informada pela equipe, sem representar isso como localização em tempo real.
4. **Relação com a CSN:** demonstração inspirada no contexto do usuário ou possibilidade de piloto autorizado com pessoas e dados reais?
   - Recomendação apresentada: planta fictícia e dados simulados no projeto público enquanto se verifica a possibilidade de piloto.
5. **Autonomia dos mantenedores:** quais decisões podem tomar sem o organizador (incorporar código, prioridades, tecnologias, publicar versões) e quais ficam reservadas a ele?
   - Recomendação apresentada: mantenedores revisam e incorporam contribuições dentro de escopo acordado, com revisão de outro mantenedor; mudanças de rumo são registradas e discutidas, com responsável por encerrar impasses.

## Como retomar

Ler este arquivo e continuar a entrevista com `grill-with-docs`, que combina `grilling` e `domain-modeling`. As respostas da primeira rodada estão registradas abaixo. Aprofundar os fluxos operacionais depois da apresentação, quando o usuário quiser retomar a entrevista. Registrar conceitos quando forem resolvidos e oferecer ADRs apenas para decisões com trade-offs relevantes e custo de reversão significativo.

A configuração das skills já foi concluída: AGENTS.md contém os ponteiros para docs/agents/, CLAUDE.md importa AGENTS.md, tarefas usam Markdown local e a triagem usa os cinco rótulos padrão. O layout de domínio escolhido é de contexto único.

## Comments

### 2026-09-27 — histórico dos equipamentos e localização no mapa

- O usuário pediu para incluir no plano que técnicos em campo possam registrar tudo o que fizeram e alteraram em cada equipamento, com persistência e consulta por outros técnicos para facilitar manutenções futuras.
- Também solicitou localizar o equipamento no mapa, com referências que ajudem a encontrá-lo fisicamente.
- Requisitos registrados no [plano do projeto](../../docs/plano-do-projeto.md), na seção “Histórico de manutenção e localização de equipamentos”. São requisitos para etapas futuras, ainda não implementados.

### 2026-09-26 — retomada breve e nova pausa

- Resposta parcial do usuário à pergunta 1: “o supervisor usaria a primeira versão? quero o que você me recomendou tbm”. O usuário quer o fluxo recomendado de consultar atividades do dia, identificar equipamento e registrar execução, e perguntou sobre o supervisor como usuário da primeira versão.
- O assistente recomendou supervisor como usuário principal, com planejamento e acompanhamento, e uma tela simples para o técnico consultar e concluir atividades no celular. Essa divisão e a tela do técnico ainda não foram confirmadas pelo usuário.
- O assistente abriu duas perguntas de aprofundamento: quem registra a execução (técnico ou supervisor) e como uma atividade real é recebida, repassada e encerrada hoje. Ambas ficaram sem resposta.
- O usuário pediu nova pausa para desligar e solicitou explicitamente voltar às primeiras perguntas, pois pretendia responder às cinco. Reapresentar a rodada original na próxima retomada, preservando a resposta parcial da primeira para complementação e aguardando as demais antes de aprofundar.

### 2026-09-26 — respostas e primeira apresentação

- Escopo imediato explícito: somente estrutura do projeto e página inicial de login para apresentação ao grupo.
- Supervisor é o usuário principal; o trabalho é organizado atualmente em planilhas. Aceito o fluxo recomendado: supervisor organiza e acompanha, técnico consulta atividades, identifica equipamentos e registra a execução.
- Aceitos mapa interativo para áreas/equipamentos e modo automático para TV como direção futura. Não implementar nesta entrega inicial.
- Equipes terão área designada e local da atividade em andamento, mantidos como conceitos distintos, sem rastreamento em tempo real.
- Projeto de demonstração com planta fictícia e dados simulados. O organizador poderá verificar autorização para um piloto com a CSN; não há autorização atual.
- O produto deve servir a diferentes empresas que precisam desse serviço. Não é específico da CSN; ela é somente uma possível oportunidade de piloto. Evitar marca, linguagem e processos exclusivos dessa empresa. Isso não define ainda a arquitetura de isolamento entre empresas.
- O organizador delegou a escolha de uma organização que dispense revisões frequentes. Adotada autonomia dos mantenedores para tecnologias, prioridades, revisão e versões dentro do propósito acordado; revisão por outro mantenedor e coordenador para impasses. Reservados ao organizador propósito, compromissos financeiros em seu nome e parcerias institucionais. Detalhes em docs/governanca.md.
- Próxima entrevista: aprofundar o ciclo de uma atividade, permissões e necessidades de empresas distintas, sem assumir arquitetura multiempresa antes dessa discussão.
