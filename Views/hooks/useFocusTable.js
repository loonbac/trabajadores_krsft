/**
 * useFocusTable — modo foco reutilizable (la "fórmula" de la tabla SSOMA).
 *
 * Al scrollear hacia abajo, la tabla salta al frente centrada (FLIP) con el fondo
 * desenfocado, para mostrar más en menos espacio. Se sale scrolleando hacia arriba
 * estando en el tope, con Escape, o clickeando el backdrop.
 *
 * Cómo cablear en el consumidor:
 *   const f = useFocusTable(enabled);
 *   <div ref={f.sectionRef}>
 *     {f.focusRender && <div className="fixed inset-0 z-[60] ..." style={{opacity: f.focusEnter ? 1 : 0}} onClick={() => f.goFocus(false)} />}
 *     <div ref={f.flipRef} className="will-change-transform">
 *       ...filtros...
 *       <div ref={f.baseScrollRef} onWheel={f.onAreaWheel}>...tabla...</div>
 *       ...paginación...
 *     </div>
 *   </div>
 *
 * `enabled` debe ser false cuando se está cargando, no hay filas, o hay un
 * modal/drawer abierto: en esos casos no se debe poder entrar al foco con la rueda.
 */
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';

export function useFocusTable(enabled = true) {
    const [focused, setFocused]         = useState(false);
    const [focusRender, setFocusRender] = useState(false);
    const [focusEnter, setFocusEnter]   = useState(false);

    const sectionRef    = useRef(null);
    const flipRef       = useRef(null);
    const firstRectRef  = useRef(null);
    const baseScrollRef = useRef(null);

    // Alterna el foco capturando ANTES la posición actual de la tabla, para
    // animarla (FLIP) desde su sitio real hacia el centro y de vuelta.
    const goFocus = useCallback((next) => {
        if (flipRef.current) firstRectRef.current = flipRef.current.getBoundingClientRect();
        setFocused(next);
    }, []);

    // Backdrop: montaje + opacidad diferida.
    useEffect(() => {
        if (focused) {
            setFocusRender(true);
            const r = requestAnimationFrame(() => setFocusEnter(true));
            return () => cancelAnimationFrame(r);
        }
        setFocusEnter(false);
        const t = setTimeout(() => setFocusRender(false), 420);
        return () => clearTimeout(t);
    }, [focused]);

    // FLIP: anima la MISMA tabla (sin remontar) entre su sitio y el centro.
    useLayoutEffect(() => {
        const el = flipRef.current;
        if (!el) return;
        const first = firstRectRef.current;
        firstRectRef.current = null;

        if (focused) {
            // Estado final = fixed centrado. Mismo ancho/posición X y MISMO alto
            // que en flujo → traslación pura, sin saltos.
            el.style.position = 'fixed';
            el.style.zIndex = '61';
            el.style.left = `${Math.round(first ? first.left : 0)}px`;
            el.style.width = `${Math.round(first ? first.width : el.offsetWidth)}px`;
            el.style.top = '0px';
            const h = el.getBoundingClientRect().height;
            el.style.top = `${Math.max(8, Math.round((window.innerHeight - h) / 2))}px`;
        } else {
            // Vuelve al flujo: limpia estilos imperativos del modo foco.
            el.style.position = '';
            el.style.zIndex = '';
            el.style.left = '';
            el.style.width = '';
            el.style.top = '';
        }

        if (!first) return; // primer render, sin animación
        const last = el.getBoundingClientRect();
        const dx = Math.round(first.left - last.left);
        const dy = Math.round(first.top - last.top);
        el.style.transformOrigin = 'top left';
        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        void el.offsetWidth; // reflow para fijar el punto de partida
        requestAnimationFrame(() => {
            el.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
            el.style.transform = 'translate(0px, 0px)';
        });
    }, [focused]);

    // Dispara el modo foco al scrollear hacia abajo (bloquea el scroll al instante).
    useEffect(() => {
        if (focused || !enabled) return undefined;
        const onWheel = (e) => {
            if (e.deltaY <= 4) return;
            // Si hay un modal o diálogo abierto en el DOM, no interferir con el scroll
            if (document.querySelector('[role="dialog"]') || document.querySelector('.z-50')) {
                return;
            }
            const r = sectionRef.current?.getBoundingClientRect();
            if (r && r.top < window.innerHeight && r.bottom > 80) {
                e.preventDefault();
                goFocus(true);
            }
        };
        window.addEventListener('wheel', onWheel, { passive: false });
        return () => window.removeEventListener('wheel', onWheel);
    }, [focused, enabled, goFocus]);

    // Bloquea el scroll mientras está enfocado y cierra con Escape. El scroller
    // real de la página es <html>; lockear solo <body> dejaba la página scrolleando
    // detrás del backdrop (la sección se iba fuera del viewport y, al salir, el gate
    // wheel→foco no volvía a armarse). Lockeamos ambos.
    useEffect(() => {
        if (!focusRender) return undefined;
        const html = document.documentElement;
        const prevBody = document.body.style.overflow;
        const prevHtml = html.style.overflow;
        document.body.style.overflow = 'hidden';
        html.style.overflow = 'hidden';
        const onKey = (e) => { if (e.key === 'Escape') goFocus(false); };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevBody;
            html.style.overflow = prevHtml;
            document.removeEventListener('keydown', onKey);
        };
    }, [focusRender, goFocus]);

    // Salir del modo foco al scrollear hacia arriba estando ya en el tope.
    const onAreaWheel = useCallback((e) => {
        if (document.querySelector('[role="dialog"]') || document.querySelector('.z-50')) {
            return;
        }
        if (focused && e.deltaY < 0 && baseScrollRef.current && baseScrollRef.current.scrollTop <= 0) {
            goFocus(false);
        }
    }, [focused, goFocus]);

    return { focused, focusRender, focusEnter, goFocus, sectionRef, flipRef, baseScrollRef, onAreaWheel };
}
