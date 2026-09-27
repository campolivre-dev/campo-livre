import { useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import { PlantIllustration } from './PlantIllustration';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('Esta é uma apresentação do CampoLivre. A autenticação e o painel do supervisor serão construídos nas próximas etapas. Nenhum dado foi enviado.');
  }

  return <main className="login-layout">
    <section className="story-panel" aria-label="Conheça o CampoLivre">
      <a className="brand" href="/" aria-label="CampoLivre, início"><span className="brand-symbol"><Icon name="layers" /></span><span>campo<span className="brand-light">livre</span><span className="brand-period">.</span></span></a>
      <div className="story-content">
        <span className="eyebrow"><span /> FEITO POR PESSOAS. PARA PESSOAS.</span>
        <h1>Seu campo de trabalho.<br /><em>Todo conectado.</em></h1>
        <p className="story-description">Menos planilhas. Mais clareza para quem planeja,<br className="desktop-break" /> cuida e faz acontecer em campo.</p>
        <PlantIllustration />
        <div className="story-bottom"><div className="people-mark"><Icon name="people" /></div><div><strong>Construído em comunidade</strong><p>Um projeto aberto. Muitas mãos. Um mesmo propósito.</p></div></div>
      </div>
      <footer className="story-footer"><span>GESTÃO DE MANUTENÇÃO E EQUIPES</span><span>JUNTOS, EM CAMPO <span aria-hidden="true">↗</span></span></footer>
    </section>

    <section className="access-panel" aria-labelledby="login-title">
      <div className="access-top"><span className="preview-badge"><span /> PRÉVIA DO PROJETO</span><span className="version">v0.1</span></div>
      <div className="login-content">
        <div className="welcome-icon"><Icon name="layers" /></div>
        <span className="form-eyebrow">BEM-VINDO AO CAMPOLIVRE</span>
        <h2 id="login-title">Bom te ver por aqui.</h2>
        <p className="form-description">Acesse seu espaço e aproxime sua equipe<br className="desktop-break" /> do que precisa acontecer.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">E-mail</label>
          <div className="input-wrap"><Icon name="mail" /><input id="email" name="email" type="email" autoComplete="username" placeholder="voce@exemplo.com" required /></div>
          <div className="password-label"><label htmlFor="password">Senha</label><button className="text-button" type="button" onClick={() => setNotice('A recuperação de senha estará disponível quando a autenticação for implementada. Esta prévia não possui contas cadastradas.')}>Esqueci minha senha</button></div>
          <div className="input-wrap"><Icon name="lock" /><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Digite sua senha" required /><button className="password-toggle" type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'eye-off' : 'eye'} /></button></div>
          <button className="primary-button" type="submit">Entrar no CampoLivre<Icon name="arrow" /></button>
        </form>
        <div className="demo-note"><span className="note-dot" /><p><strong>Estamos construindo esse campo juntos.</strong><br />Esta tela é demonstrativa. Use dados fictícios.</p></div>
        <div className="notice" role="status" aria-live="polite">{notice}</div>
        <div className="community-link"><span>Quer fazer parte dessa construção?</span><button className="text-button" type="button" onClick={() => setNotice('O CampoLivre está reunindo mantenedores e colaboradores de produto, design e desenvolvimento. Fale com o organizador no grupo para participar.')} >Conheça o projeto <Icon name="arrow" /></button></div>
      </div>
      <footer className="access-footer"><span>CampoLivre © {new Date().getFullYear()}</span><span>Aberto para colaborar. Livre para evoluir.</span></footer>
    </section>
  </main>;
}
