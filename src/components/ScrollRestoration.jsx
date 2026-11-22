import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Mapa de posições salvas por rota
const scrollPositions = new Map();

/**
 * Componente que memoriza a posição de rolagem de cada página
 * e restaura automaticamente quando o usuário volta à página anterior.
 */
export default function ScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType(); // 'POP' (voltar/avançar), 'PUSH' (novo clique), 'REPLACE'
  const isPopRef = useRef(false);

  // Monitora e grava a posição de rolagem atual
  useEffect(() => {
    const onScroll = () => {
      scrollPositions.set(location.pathname, window.scrollY);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    const savedPos = scrollPositions.get(location.pathname);

    if (navType === 'POP' && savedPos !== undefined) {
      // O usuário clicou em voltar ou avançar no navegador: restaura a posição anterior exata
      isPopRef.current = true;
      const timer = setTimeout(() => {
        window.scrollTo({ top: savedPos, left: 0, behavior: 'instant' });
      }, 20);
      return () => clearTimeout(timer);
    } else if (navType === 'PUSH') {
      // Navegação para uma nova página
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, navType]);

  return null;
}
