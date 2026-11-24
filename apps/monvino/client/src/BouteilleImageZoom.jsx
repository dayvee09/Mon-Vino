import * as React from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import { PlaceholderBouteilleSvg } from "./bottleImage";
import "./FrmBouteille.scss";

/** Tap zoom on the fitted image; mobile keeps max-size so scale stays ~2.5× instead of blowing up. */
const ZOOM_SCALE_MOBILE = 2.5;
const ZOOM_SCALE_DESKTOP = 2;
const MOBILE_MAX_WIDTH_MQ = "(max-width: 480px)";
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function getZoomScale() {
  if (typeof window === "undefined") return ZOOM_SCALE_DESKTOP;
  return window.matchMedia(MOBILE_MAX_WIDTH_MQ).matches
    ? ZOOM_SCALE_MOBILE
    : ZOOM_SCALE_DESKTOP;
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_MAX_WIDTH_MQ).matches;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function touchMidpoint(a, b) {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
  };
}

/**
 * Aperçu cliquable d'une bouteille avec lightbox plein écran
 * (tap zoom + pincement / pan sur mobile).
 */
export default function BouteilleImageZoom({
  imageSrc,
  title = "Bouteille",
  alt,
  buttonClassName = "fiche-image-btn",
  enableZoom = true,
  isPlaceholder = false,
}) {
  const [imageZoomOuvert, setImageZoomOuvert] = React.useState(false);
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [gesturing, setGesturing] = React.useState(false);
  const stageRef = React.useRef(null);
  const gestureRef = React.useRef(null);
  const transformRef = React.useRef({ scale: 1, x: 0, y: 0 });
  const zoomEnabled = Boolean(enableZoom) && !isPlaceholder;

  function syncTransform(next) {
    const clamped = {
      scale: clamp(next.scale, MIN_SCALE, MAX_SCALE),
      x: next.scale <= 1.01 ? 0 : next.x,
      y: next.scale <= 1.01 ? 0 : next.y,
    };
    if (clamped.scale <= 1.01) {
      clamped.scale = 1;
      clamped.x = 0;
      clamped.y = 0;
    }
    transformRef.current = clamped;
    setScale(clamped.scale);
    setOffset({ x: clamped.x, y: clamped.y });
  }

  function fermerImageZoom() {
    setImageZoomOuvert(false);
    syncTransform({ scale: 1, x: 0, y: 0 });
    setGesturing(false);
    gestureRef.current = null;
  }

  function gererClicImageZoom(e) {
    e.stopPropagation();
    // Ignore synthetic clicks that follow a pinch/pan.
    if (gestureRef.current?.suppressClick) {
      gestureRef.current.suppressClick = false;
      return;
    }
    const current = transformRef.current;
    if (current.scale > 1.01) {
      syncTransform({ scale: 1, x: 0, y: 0 });
      return;
    }
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const originX = e.clientX - (rect.left + rect.width / 2);
    const originY = e.clientY - (rect.top + rect.height / 2);
    const nextScale = getZoomScale();
    // Keep the tapped point under the finger/cursor after scaling from center.
    syncTransform({
      scale: nextScale,
      x: -originX * (nextScale - 1),
      y: -originY * (nextScale - 1),
    });
  }

  React.useEffect(() => {
    if (!imageZoomOuvert) return;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        fermerImageZoom();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("fiche-zoom-active");
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("fiche-zoom-active");
    };
  }, [imageZoomOuvert]);

  // Native listeners (non-passive) so pinch/pan can call preventDefault.
  React.useEffect(() => {
    if (!imageZoomOuvert) return;
    const stage = stageRef.current;
    if (!stage) return;

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        const current = transformRef.current;
        gestureRef.current = {
          mode: "pinch",
          startDist: Math.max(touchDistance(a, b), 1),
          startScale: current.scale,
          startX: current.x,
          startY: current.y,
          startMid: touchMidpoint(a, b),
          suppressClick: true,
        };
        setGesturing(true);
        return;
      }
      if (e.touches.length === 1 && transformRef.current.scale > 1.01) {
        const t = e.touches[0];
        const current = transformRef.current;
        gestureRef.current = {
          mode: "pan",
          startX: current.x,
          startY: current.y,
          startTouchX: t.clientX,
          startTouchY: t.clientY,
          moved: false,
          suppressClick: false,
        };
        setGesturing(true);
      }
    }

    function onTouchMove(e) {
      const gesture = gestureRef.current;
      if (!gesture) return;

      if (gesture.mode === "pinch" && e.touches.length >= 2) {
        e.preventDefault();
        const [a, b] = e.touches;
        const dist = Math.max(touchDistance(a, b), 1);
        const mid = touchMidpoint(a, b);
        const nextScale = gesture.startScale * (dist / gesture.startDist);
        syncTransform({
          scale: nextScale,
          x: gesture.startX + (mid.x - gesture.startMid.x),
          y: gesture.startY + (mid.y - gesture.startMid.y),
        });
        return;
      }

      if (gesture.mode === "pan" && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - gesture.startTouchX;
        const dy = t.clientY - gesture.startTouchY;
        if (Math.hypot(dx, dy) > 6) {
          gesture.moved = true;
          gesture.suppressClick = true;
          e.preventDefault();
        }
        if (gesture.moved) {
          syncTransform({
            scale: transformRef.current.scale,
            x: gesture.startX + dx,
            y: gesture.startY + dy,
          });
        }
      }
    }

    function onTouchEnd(e) {
      const gesture = gestureRef.current;
      if (!gesture) return;

      if (gesture.mode === "pinch") {
        if (e.touches.length >= 2) return;
        // Pinch ended — if one finger remains, continue as pan.
        if (e.touches.length === 1 && transformRef.current.scale > 1.01) {
          const t = e.touches[0];
          const current = transformRef.current;
          gestureRef.current = {
            mode: "pan",
            startX: current.x,
            startY: current.y,
            startTouchX: t.clientX,
            startTouchY: t.clientY,
            moved: true,
            suppressClick: true,
          };
          return;
        }
        setGesturing(false);
        gestureRef.current = { suppressClick: true };
        return;
      }

      if (gesture.mode === "pan" && e.touches.length === 0) {
        setGesturing(false);
        gestureRef.current = gesture.suppressClick
          ? { suppressClick: true }
          : null;
      }
    }

    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });
    stage.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [imageZoomOuvert]);

  const imageAlt = alt ?? title;
  const zoomed = scale > 1.01;

  const classes = zoomEnabled
    ? buttonClassName
    : `${buttonClassName} fiche-image-btn--static`.trim();

  const previewImage = isPlaceholder ? (
    <PlaceholderBouteilleSvg
      className="fiche-image-placeholder"
      role="img"
      aria-label={imageAlt}
    />
  ) : (
    <img
      src={imageSrc}
      alt={imageAlt}
      loading="eager"
      decoding="async"
      fetchPriority="high"
    />
  );

  const preview = (
    <>
      {previewImage}
      {zoomEnabled && (
        <span className="fiche-image-hint">
          <ZoomInIcon fontSize="small" aria-hidden />
          Cliquer pour agrandir
        </span>
      )}
    </>
  );

  return (
    <>
      {zoomEnabled ? (
        <button
          type="button"
          className={classes}
          onClick={() => setImageZoomOuvert(true)}
          aria-label="Agrandir l'image de la bouteille"
        >
          {preview}
        </button>
      ) : (
        <div className={classes} role="img" aria-label={imageAlt}>
          {preview}
        </div>
      )}

      {zoomEnabled &&
        imageZoomOuvert &&
        createPortal(
          <div
            className={`fiche-image-zoom-overlay${
              zoomed ? " fiche-image-zoom-overlay--zoomed" : ""
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Image agrandie de la bouteille"
            onClick={fermerImageZoom}
          >
            <header
              className="fiche-image-zoom-header"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="fiche-image-zoom-title">{title}</p>
              <button
                type="button"
                className="fiche-image-zoom-close"
                aria-label="Fermer l'agrandissement"
                onClick={fermerImageZoom}
              >
                <CloseIcon />
              </button>
            </header>
            <div
              ref={stageRef}
              className="fiche-image-zoom-stage"
              onClick={fermerImageZoom}
              role="presentation"
            >
              <img
                className={`fiche-image-zoom-img${
                  zoomed ? " fiche-image-zoom-img--zoomed" : ""
                }${gesturing ? " fiche-image-zoom-img--gesturing" : ""}`}
                src={imageSrc}
                alt={imageAlt}
                draggable={false}
                style={{
                  transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                }}
                onClick={gererClicImageZoom}
              />
            </div>
            <p className="fiche-image-zoom-hint">
              {isMobileViewport()
                ? zoomed
                  ? "Pincez pour zoomer · glissez pour déplacer · touchez pour réinitialiser"
                  : "Pincez pour zoomer · touchez l'image pour agrandir"
                : zoomed
                  ? "Cliquez pour réinitialiser"
                  : "Cliquez l'image pour zoomer"}
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
