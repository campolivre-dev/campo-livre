# CampoLivre — plano do projeto

## Escopo e origem

Este arquivo reúne os requisitos planejados do produto. O histórico de definição do escopo está em [entrevista.md](../.scratch/campo-livre/entrevista.md). A primeira apresentação contempla a estrutura do projeto e a página de login; os requisitos abaixo fazem parte das próximas etapas e ainda não estão implementados.

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

### Critérios de aceitação para a futura implementação

- Um técnico registra uma intervenção em um equipamento e, ao voltar a consultá-lo, encontra o registro salvo.
- Outro técnico com acesso ao equipamento consegue consultar essa intervenção, identificar quem a realizou e quando, e compreender o que foi feito ou alterado.
- O técnico encontra o equipamento no mapa e consulta as referências necessárias para reconhecer seu local físico.
- Novas intervenções são acrescentadas ao histórico, preservando a consulta às anteriores.

### Pontos a detalhar

Permissões de consulta e edição, correção de registros, anexos, funcionamento offline e forma de cadastrar ou atualizar a posição do equipamento no mapa serão detalhados antes da implementação.
