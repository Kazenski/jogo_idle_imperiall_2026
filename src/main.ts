import { iniciarJogo } from './ui/app';
import './styles.css';

/**
 * Ponto de entrada.
 *
 * O service worker do Workbox e registrado aqui (nao pelo vite-plugin-pwa em
 * auto mode) para controlar a ordem: o jogo so sobe depois que o listener de
 * `controllerchange` estiver pronto, senao o primeiro offline ja falha.
 */
async function registrarServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return; // em dev o SW atrapalha o HMR

  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  } catch (erro) {
    console.warn('[pwa] service worker nao registrado:', erro);
  }
}

function montar(): void {
  const host = document.getElementById('app');
  if (!host) {
    console.error('[main] elemento #app nao encontrado');
    return;
  }
  try {
    iniciarJogo(host);
  } catch (erro) {
    console.error('[main] falha ao iniciar o jogo:', erro);
    host.innerHTML =
      '<div class="erro-fatal"><h1>Nao foi possivel iniciar</h1>' +
      '<p>Recarregue a pagina. Se persistir, limpe os dados do site.</p></div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', montar, { once: true });
} else {
  montar();
}

void registrarServiceWorker();